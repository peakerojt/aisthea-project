/**
 * inventory.service.ts — Production-level inventory management service
 *
 * Handles:
 * - Atomic stock deduction on checkout (legacy flow — still used until full reservation is adopted)
 * - Atomic cancel-restore when order is cancelled
 * - Warehouse-level inventory reservation / fulfillment / release (new flow)
 *
 * Reason constants (InventoryLog.Reason):
 *   CHECKOUT          — stock deducted when order is placed
 *   RESTOCK           — stock added via purchase/receiving
 *   CANCELLED_RESTORE — stock returned when order is cancelled
 *   RETURN_RESTORE    — stock returned on approved return request
 *   MANUAL_ADJUST     — admin manually editing stock quantity
 */

import { Prisma } from '../../generated/client';
import { prisma } from '../../lib/prisma';

// ── Shared error class ────────────────────────────────────────────────────────
export class InventoryError extends Error {
    public readonly code: string;
    public readonly status: number;

    constructor(code: string, message: string, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

// ── Types ─────────────────────────────────────────────────────────────────────
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
    | 'RESTOCK'
    | 'CANCELLED_RESTORE'
    | 'RETURN_RESTORE'
    | 'MANUAL_ADJUST';

// ── Atomic checkout deduction (within a transaction) ─────────────────────────
export async function atomicCheckoutDeduction(
    orderId: number,
    userId: number | null,
    items: CheckoutItem[],
    tx: Prisma.TransactionClient,
) {
    for (const item of items) {
        const current = await (tx.productVariant.findUnique as any)({
            where: { variantId: item.variantId },
            select: { stockQuantity: true },
        });

        if (!current) {
            throw new InventoryError('VARIANT_NOT_FOUND', 'Product variant not found.', 400);
        }

        const previousStock: number = current.stockQuantity;

        try {
            await (tx.productVariant.update as any)({
                where: {
                    variantId: item.variantId,
                    stockQuantity: { gte: item.quantity },
                },
                data: { stockQuantity: { decrement: item.quantity } },
            });
        } catch (err: any) {
            if (err?.code === 'P2025') {
                throw new InventoryError(
                    'INSUFFICIENT_STOCK',
                    `Insufficient stock: ${item.productName}`,
                    400,
                );
            }
            throw err;
        }

        await (tx.inventoryLog.create as any)({
            data: {
                variantId: item.variantId,
                orderId,
                userId,
                changeQuantity: -item.quantity,
                previousStock,
                newStock: previousStock - item.quantity,
                reason: 'CHECKOUT' satisfies InventoryLogReason,
                note: `Order #${orderId}`,
            },
        });
    }
}

// ── Atomic cancel-restore (within a transaction) ──────────────────────────────
export async function atomicCancelRestore(
    orderId: number,
    userId: number | null,
    items: RestoreItem[],
    tx: Prisma.TransactionClient,
) {
    for (const item of items) {
        if (!item.variantId) continue;

        const current = await (tx.productVariant.findUnique as any)({
            where: { variantId: item.variantId },
            select: { stockQuantity: true },
        });

        if (!current) continue;

        const previousStock: number = current.stockQuantity;

        await (tx.productVariant.update as any)({
            where: { variantId: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
        });

        await (tx.inventoryLog.create as any)({
            data: {
                variantId: item.variantId,
                orderId,
                userId,
                changeQuantity: +item.quantity,
                previousStock,
                newStock: previousStock + item.quantity,
                reason: 'CANCELLED_RESTORE' satisfies InventoryLogReason,
                note: `Cancelled order #${orderId}`,
            },
        });
    }
}

// ── Warehouse inventory reservation ──────────────────────────────────────────
const RESERVATION_TTL_MINUTES = 30;

export const inventoryReservationService = {
    /**
     * Reserve stock across all warehouses for an order.
     * Raises InventoryError if any item lacks sufficient available stock.
     */
    async reserve(
        orderId: number,
        items: { variantId: number; quantity: number }[],
    ): Promise<void> {
        const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);

        await (prisma as any).$transaction(async (tx: any) => {
            for (const item of items) {
                // Find inventory row with enough available stock (quantity - reservedQuantity >= needed)
                const inventory = await (tx.inventory.findFirst as any)({
                    where: {
                        variantId: item.variantId,
                        warehouse: { isActive: true },
                    },
                    orderBy: [{ quantity: 'desc' }],
                });

                if (!inventory) {
                    throw new InventoryError('NO_INVENTORY', `No warehouse stock found for variant ${item.variantId}.`, 400);
                }

                const available = inventory.quantity - inventory.reservedQuantity;
                if (available < item.quantity) {
                    throw new InventoryError('INSUFFICIENT_STOCK', `Insufficient stock for variant ${item.variantId}. Available: ${available}`, 400);
                }

                // Increment reserved quantity
                await (tx.inventory.update as any)({
                    where: { inventoryId: inventory.inventoryId },
                    data: { reservedQuantity: { increment: item.quantity } },
                });

                // Create reservation record
                await (tx.inventoryReservation.create as any)({
                    data: {
                        inventoryId: inventory.inventoryId,
                        orderId,
                        quantity: item.quantity,
                        status: 'ACTIVE',
                        expiresAt,
                    },
                });
            }
        });
    },

    /**
     * Fulfill reservations after successful payment.
     * Deducts quantity from inventory.quantity and marks reservations FULFILLED.
     */
    async fulfill(orderId: number): Promise<void> {
        await (prisma as any).$transaction(async (tx: any) => {
            const reservations = await (tx.inventoryReservation.findMany as any)({
                where: { orderId, status: 'ACTIVE' },
            });

            for (const r of reservations) {
                await (tx.inventory.update as any)({
                    where: { inventoryId: r.inventoryId },
                    data: {
                        quantity: { decrement: r.quantity },
                        reservedQuantity: { decrement: r.quantity },
                    },
                });

                await (tx.inventoryReservation.update as any)({
                    where: { reservationId: r.reservationId },
                    data: { status: 'FULFILLED' },
                });
            }
        });
    },

    /**
     * Release reservations when an order is cancelled.
     * Decrements reservedQuantity and marks reservations RELEASED.
     */
    async release(orderId: number): Promise<void> {
        await (prisma as any).$transaction(async (tx: any) => {
            const reservations = await (tx.inventoryReservation.findMany as any)({
                where: { orderId, status: 'ACTIVE' },
            });

            for (const r of reservations) {
                await (tx.inventory.update as any)({
                    where: { inventoryId: r.inventoryId },
                    data: { reservedQuantity: { decrement: r.quantity } },
                });

                await (tx.inventoryReservation.update as any)({
                    where: { reservationId: r.reservationId },
                    data: { status: 'RELEASED' },
                });
            }
        });
    },
};
