/**
 * inventory.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Concurrency-safe inventory operations.
 * All public functions accept a Prisma Interactive Transaction client (`tx`)
 * so they can be composed into a larger $transaction block by the caller.
 *
 * Reason constants (matches InventoryLog.Reason in schema):
 *   CHECKOUT          — stock deducted when an order is placed
 *   RESTOCK           — stock added via purchase / receiving
 *   CANCELLED_RESTORE — stock returned when an order is cancelled
 *   MANUAL_ADJUST     — admin manually editing stock quantity
 */

import { Prisma } from '../generated/client';

// ─── Error class shared across services ───────────────────────────────────────

export class InventoryError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckoutItem {
  variantId: number;
  quantity: number;
  productName: string; // Used for Vietnamese error messages
}

export type InventoryLogReason =
  | 'CHECKOUT'
  | 'RESTOCK'
  | 'CANCELLED_RESTORE'
  | 'RETURN_RESTORE'
  | 'MANUAL_ADJUST';

// ─── atomicCheckoutDeduction ──────────────────────────────────────────────────
/**
 * Deducts stock for all items in a checkout atomically within the given tx.
 *
 * Pro-Max approach: uses `where: { variantId, stockQuantity: { gte: quantity } }`
 * so the UPDATE itself acts as the stock check — eliminating race conditions.
 * If the record is not found (P2025) the stock is insufficient; throw immediately
 * and let the transaction roll back all previous deductions.
 *
 * @param orderId  — newly created order ID (for log FK)
 * @param userId   — the customer placing the order (for log FK)
 * @param items    — array of cart items to deduct
 * @param tx       — Prisma Interactive Transaction client
 */
export async function atomicCheckoutDeduction(
  orderId: number,
  userId: number | null,
  items: CheckoutItem[],
  tx: Prisma.TransactionClient,
) {
  for (const item of items) {
    // 1. Read current stock so we can record previousStock in the log
    const current = await (tx.productVariant.findUnique as any)({
      where: { variantId: item.variantId },
      select: { stockQuantity: true },
    });

    if (!current) {
      throw new InventoryError(
        'VARIANT_NOT_FOUND',
        `Product variant not found in the system.`,
        400,
      );
    }

    const previousStock: number = current.stockQuantity;

    // 2. Atomic decrement — WHERE clause includes `stockQuantity >= quantity`.
    //    If stock is insufficient, Prisma throws P2025 (RecordNotFound).
    try {
      await (tx.productVariant.update as any)({
        where: {
          variantId: item.variantId,
          stockQuantity: { gte: item.quantity },
        },
        data: {
          stockQuantity: { decrement: item.quantity },
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new InventoryError(
          'INSUFFICIENT_STOCK',
          `Product is out of stock or the requested quantity is unavailable.`,
          400,
        );
      }
      throw err;
    }

    const newStock = previousStock - item.quantity;

    // 3. Insert audit log within the same transaction
    await (tx.inventoryLog.create as any)({
      data: {
        variantId: item.variantId,
        orderId,
        userId,
        changeQuantity: -item.quantity,
        previousStock,
        newStock,
        reason: 'CHECKOUT' satisfies InventoryLogReason,
        note: `Đặt hàng #${orderId}`,
      },
    });
  }
}

// ─── atomicCancelRestore ──────────────────────────────────────────────────────
/**
 * Restores stock for all items in a cancelled/returned order atomically.
 *
 * @param orderId  — the order being cancelled
 * @param userId   — the user who triggered the cancellation (for log FK)
 * @param items    — order items that contain variantId and quantity
 * @param tx       — Prisma Interactive Transaction client
 */
export interface RestoreItem {
  variantId: number | null;
  quantity: number;
}

export async function atomicCancelRestore(
  orderId: number,
  userId: number | null,
  items: RestoreItem[],
  tx: Prisma.TransactionClient,
) {
  for (const item of items) {
    // Skip items whose variant has been deleted (variantId = null)
    if (!item.variantId) continue;

    // Read current stock for the log
    const current = await (tx.productVariant.findUnique as any)({
      where: { variantId: item.variantId },
      select: { stockQuantity: true },
    });

    if (!current) continue; // Variant deleted; skip gracefully

    const previousStock: number = current.stockQuantity;

    // Increment stock back
    await (tx.productVariant.update as any)({
      where: { variantId: item.variantId },
      data: { stockQuantity: { increment: item.quantity } },
    });

    const newStock = previousStock + item.quantity;

    // Insert restore log
    await (tx.inventoryLog.create as any)({
      data: {
        variantId: item.variantId,
        orderId,
        userId,
        changeQuantity: +item.quantity,
        previousStock,
        newStock,
        reason: 'CANCELLED_RESTORE' satisfies InventoryLogReason,
        note: `Huỷ đơn hàng #${orderId}`,
      },
    });
  }
}
