/**
 * inventory.service.ts
 *
 * Shared inventory write helpers with dual-write behavior:
 * - Legacy stock: ProductVariants.StockQuantity
 * - Snapshot: Inventory.AvailableQuantity
 * - Ledger: StockMovements
 * - Compat log: InventoryLogs
 */

import { Prisma } from '../generated/client';

export class InventoryError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface CheckoutItem {
  variantId: number;
  quantity: number;
  productName: string;
}

export interface RestoreItem {
  variantId: number | null;
  quantity: number;
}

export type InventoryLogReason =
  | 'CHECKOUT'
  | 'PURCHASE_RECEIPT'
  | 'RETURN_RESTORE'
  | 'MANUAL_ADJUST';

export type StockMovementType = 'IMPORT' | 'SALE' | 'RETURN' | 'ADJUST' | 'CANCEL';

interface StockMovementCreateInput {
  variantId: number;
  type: StockMovementType;
  quantity: number;
  referenceType?: string | null;
  referenceId?: number | null;
  note?: string | null;
  createdBy?: number | null;
}

interface InventorySnapshotInput {
  variantId: number;
  availableQuantity: number;
}

interface StockLogInput {
  variantId: number;
  orderId?: number | null;
  userId?: number | null;
  changeQuantity: number;
  previousStock: number;
  newStock: number;
  reason: InventoryLogReason;
  note?: string | null;
}

interface ManualAdjustInput {
  variantId: number;
  newQuantity: number;
  userId?: number | null;
  reason?: string;
  note?: string | null;
}

interface PurchaseReceiptInput {
  variantId: number;
  quantity: number;
  userId?: number | null;
  goodsReceiptId?: number | null;
  purchaseOrderId?: number | null;
  note?: string | null;
}

const readVariantStock = async (
  tx: Prisma.TransactionClient,
  variantId: number,
): Promise<number> => {
  const variant = await (tx.productVariant.findUnique as any)({
    where: { variantId },
    select: { stockQuantity: true },
  });

  if (!variant) {
    throw new InventoryError('VARIANT_NOT_FOUND', 'Product variant not found in the system.');
  }

  return Number(variant.stockQuantity ?? 0);
};

const syncInventorySnapshot = async (
  tx: Prisma.TransactionClient,
  input: InventorySnapshotInput,
): Promise<void> => {
  await ((tx as any).inventory.upsert as any)({
    where: { variantId: input.variantId },
    update: {
      availableQuantity: input.availableQuantity,
      updatedAt: new Date(),
    },
    create: {
      variantId: input.variantId,
      availableQuantity: input.availableQuantity,
      reservedQuantity: 0,
      incomingQuantity: 0,
      updatedAt: new Date(),
    },
  });
};

const appendInventoryLog = async (
  tx: Prisma.TransactionClient,
  input: StockLogInput,
): Promise<void> => {
  await (tx.inventoryLog.create as any)({
    data: {
      variantId: input.variantId,
      orderId: input.orderId ?? null,
      userId: input.userId ?? null,
      changeQuantity: input.changeQuantity,
      previousStock: input.previousStock,
      newStock: input.newStock,
      reason: input.reason,
      note: input.note ?? null,
    },
  });
};

export async function appendStockMovement(
  tx: Prisma.TransactionClient,
  input: StockMovementCreateInput,
): Promise<void> {
  await ((tx as any).stockMovement.create as any)({
    data: {
      variantId: input.variantId,
      type: input.type,
      quantity: input.quantity,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      note: input.note ?? null,
      createdBy: input.createdBy ?? null,
    },
  });
}

export async function applyPurchaseReceiptStockChange(
  tx: Prisma.TransactionClient,
  input: PurchaseReceiptInput,
): Promise<{ previousStock: number; newStock: number }> {
  await (tx.productVariant.update as any)({
    where: { variantId: input.variantId },
    data: { stockQuantity: { increment: input.quantity } },
  });

  const newStock = await readVariantStock(tx, input.variantId);
  const previousStock = newStock - input.quantity;

  await syncInventorySnapshot(tx, {
    variantId: input.variantId,
    availableQuantity: newStock,
  });

  await appendInventoryLog(tx, {
    variantId: input.variantId,
    orderId: null,
    userId: input.userId ?? null,
    changeQuantity: input.quantity,
    previousStock,
    newStock,
    reason: 'PURCHASE_RECEIPT',
    note: input.note,
  });

  await appendStockMovement(tx, {
    variantId: input.variantId,
    type: 'IMPORT',
    quantity: input.quantity,
    referenceType: input.goodsReceiptId ? 'GOODS_RECEIPT' : 'PURCHASE_ORDER',
    referenceId: input.goodsReceiptId ?? input.purchaseOrderId ?? null,
    note: input.note,
    createdBy: input.userId ?? null,
  });

  return { previousStock, newStock };
}

export async function applyManualStockAdjustment(
  tx: Prisma.TransactionClient,
  input: ManualAdjustInput,
): Promise<{ previousStock: number; newStock: number; changeQuantity: number }> {
  if (input.newQuantity < 0) {
    throw new InventoryError('INVALID_STOCK_QUANTITY', 'Stock quantity cannot be negative.');
  }

  const previousStock = await readVariantStock(tx, input.variantId);

  await (tx.productVariant.update as any)({
    where: { variantId: input.variantId },
    data: { stockQuantity: input.newQuantity },
  });

  const newStock = input.newQuantity;
  const changeQuantity = newStock - previousStock;

  await syncInventorySnapshot(tx, {
    variantId: input.variantId,
    availableQuantity: newStock,
  });

  const normalizedReason = (input.reason?.trim() || 'MANUAL_ADJUST').toUpperCase();

  await appendInventoryLog(tx, {
    variantId: input.variantId,
    orderId: null,
    userId: input.userId ?? null,
    changeQuantity,
    previousStock,
    newStock,
    reason: normalizedReason as InventoryLogReason,
    note: input.note ?? null,
  });

  await appendStockMovement(tx, {
    variantId: input.variantId,
    type: 'ADJUST',
    quantity: changeQuantity,
    referenceType: 'MANUAL_ADJUST',
    referenceId: null,
    note: input.note ?? input.reason ?? null,
    createdBy: input.userId ?? null,
  });

  return { previousStock, newStock, changeQuantity };
}

/**
 * Deducts stock for checkout with race-condition protection.
 */
export async function atomicCheckoutDeduction(
  orderId: number,
  userId: number | null,
  items: CheckoutItem[],
  tx: Prisma.TransactionClient,
) {
  for (const item of items) {
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
          'Product is out of stock or the requested quantity is unavailable.',
        );
      }
      throw err;
    }

    const newStock = await readVariantStock(tx, item.variantId);
    const previousStock = newStock + item.quantity;

    await syncInventorySnapshot(tx, {
      variantId: item.variantId,
      availableQuantity: newStock,
    });

    await appendInventoryLog(tx, {
      variantId: item.variantId,
      orderId,
      userId,
      changeQuantity: -item.quantity,
      previousStock,
      newStock,
      reason: 'CHECKOUT',
      note: `Placed order #${orderId}`,
    });

    await appendStockMovement(tx, {
      variantId: item.variantId,
      type: 'SALE',
      quantity: -item.quantity,
      referenceType: 'ORDER',
      referenceId: orderId,
      note: `Placed order #${orderId}`,
      createdBy: userId,
    });
  }
}

/**
 * Restores stock for cancelled/returned orders.
 */
export async function atomicCancelRestore(
  orderId: number,
  userId: number | null,
  items: RestoreItem[],
  tx: Prisma.TransactionClient,
) {
  for (const item of items) {
    if (!item.variantId) continue;

    try {
      await (tx.productVariant.update as any)({
        where: { variantId: item.variantId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    } catch {
      continue;
    }

    const newStock = await readVariantStock(tx, item.variantId);
    const previousStock = newStock - item.quantity;

    await syncInventorySnapshot(tx, {
      variantId: item.variantId,
      availableQuantity: newStock,
    });

    await appendInventoryLog(tx, {
      variantId: item.variantId,
      orderId,
      userId,
      changeQuantity: item.quantity,
      previousStock,
      newStock,
      reason: 'RETURN_RESTORE',
      note: `Cancelled order #${orderId}`,
    });

    await appendStockMovement(tx, {
      variantId: item.variantId,
      type: 'CANCEL',
      quantity: item.quantity,
      referenceType: 'ORDER',
      referenceId: orderId,
      note: `Cancelled order #${orderId}`,
      createdBy: userId,
    });
  }
}
