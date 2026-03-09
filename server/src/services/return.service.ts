/**
 * return.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Business logic for the Return & Refund (Hoàn trả & Hoàn tiền) module.
 *
 * FSM guard: only orders with status 'Delivered' can be returned.
 *            'Cancelled' orders are blocked at validation step 1.
 *
 * OrderReturn.status values:
 *   PENDING_APPROVAL  → APPROVED | REJECTED
 *   APPROVED          → COMPLETED (COMPLETE_REFUND)
 *   COMPLETED / REJECTED — terminal states
 */

import { prisma } from '../utils/prisma';
import { InventoryLogReason } from './inventory.service';

// ─── Shared error class ───────────────────────────────────────────────────────

export class ReturnError extends Error {
    public readonly code: string;
    public readonly status: number;

    constructor(code: string, message: string, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// ─── Helpers ─────────────────────────────────────────────────────────────────

const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().trim();

// ─── requestReturn ────────────────────────────────────────────────────────────
/**
 * Customer submits a return request for a delivered order.
 *
 * Validations (strict, in order):
 *  1. Order must exist and belong to the requesting user (or admin).
 *  2. Order.status must be 'delivered' (case-insensitive).
 *  3. Order.updatedAt (delivery timestamp) must be within the last 7 days.
 *  4. No existing OrderReturn for this order.
 */
export async function requestReturn(
    orderId: number,
    userId: number,
    userRoles: string[],
    reason: string,
    proofImages: string[], // Array of Cloudinary URLs
) {
    const isAdmin = userRoles.includes('Admin');

    // ── 1. Find order
    const order = await (prisma.order.findUnique as any)({
        where: { orderId },
        include: { orderReturn: true },
    });

    if (!order) {
        throw new ReturnError('NOT_FOUND', 'Order not found.', 404);
    }

    if (!isAdmin && order.userId !== userId) {
        throw new ReturnError(
            'FORBIDDEN',
            'You do not have permission to request a return for this order.',
            403,
        );
    }

    // ── 2. Status guard — must be Delivered
    if (norm(order.status) !== 'delivered') {
        throw new ReturnError(
            'ORDER_NOT_DELIVERED',
            'Order has not been delivered yet, so a return cannot be requested.',
        );
    }

    // ── 3. Time-window guard — within 7 days of delivery
    const deliveryDate: Date = order.updatedAt ?? order.createdAt ?? new Date(0);
    const elapsed = Date.now() - deliveryDate.getTime();
    if (elapsed > RETURN_WINDOW_MS) {
        throw new ReturnError(
            'RETURN_WINDOW_EXPIRED',
            'The 7-day return window has expired.',
        );
    }

    // ── 4. Duplicate guard
    if (order.orderReturn) {
        throw new ReturnError(
            'RETURN_ALREADY_EXISTS',
            'A return request already exists for this order.',
        );
    }

    // ── Atomic: create return + update order status + log history
    const result = await prisma.$transaction(async (tx) => {
        const orderReturn = await (tx.orderReturn.create as any)({
            data: {
                orderId,
                userId,
                reason,
                proofImages: JSON.stringify(proofImages),
                status: 'PENDING_APPROVAL',
            },
        });

        await (tx.order.update as any)({
            where: { orderId },
            data: { status: 'Return_Requested' },
        });

        await (tx.orderStatusHistory.create as any)({
            data: {
                orderId,
                oldStatus: order.status,
                status: 'Return_Requested',
                changedBy: userId,
                note: 'Customer submitted a return request.',
            },
        });

        return orderReturn;
    });

    return result;
}

// ─── processReturn ────────────────────────────────────────────────────────────
/**
 * Admin processes a return request.
 *
 * Actions:
 *  APPROVE          — marks the return as approved (waiting for physical item).
 *  REJECT           — rejects, reverts order to 'Delivered'.
 *  COMPLETE_REFUND  — marks order as 'Returned', restores inventory.
 */
export async function processReturn(
    returnId: number,
    adminUserId: number,
    action: 'APPROVE' | 'REJECT' | 'COMPLETE_REFUND',
    note?: string,
) {
    const returnReq = await (prisma.orderReturn.findUnique as any)({
        where: { returnId },
        include: {
            order: {
                include: {
                    items: {
                        include: { variant: true },
                    },
                },
            },
        },
    });

    if (!returnReq) {
        throw new ReturnError('NOT_FOUND', 'Return request not found.', 404);
    }

    if (action === 'APPROVE') {
        await (prisma.orderReturn.update as any)({
            where: { returnId },
            data: {
                status: 'APPROVED',
                adminNote: note ?? null,
            },
        });
        return { success: true, code: 'RETURN_APPROVED', messageKey: 'feedback.approveSuccess', message: 'Return request approved.' };
    }

    if (action === 'REJECT') {
        await prisma.$transaction(async (tx) => {
            await (tx.orderReturn.update as any)({
                where: { returnId },
                data: { status: 'REJECTED', adminNote: note ?? null },
            });

            await (tx.order.update as any)({
                where: { orderId: returnReq.orderId },
                data: { status: 'Delivered' },
            });

            await (tx.orderStatusHistory.create as any)({
                data: {
                    orderId: returnReq.orderId,
                    oldStatus: 'Return_Requested',
                    status: 'Delivered',
                    changedBy: adminUserId,
                    note: note ? `Return rejected: ${note}` : 'Return request rejected.',
                },
            });
        });

        return { success: true, code: 'RETURN_REJECTED', messageKey: 'feedback.rejectSuccess', message: 'Return request rejected.' };
    }

    if (action === 'COMPLETE_REFUND') {
        await prisma.$transaction(async (tx) => {
            // 1. Mark return as completed
            await (tx.orderReturn.update as any)({
                where: { returnId },
                data: {
                    status: 'COMPLETED',
                    adminNote: note ?? null,
                },
            });

            // 2. Update order status to Returned
            await (tx.order.update as any)({
                where: { orderId: returnReq.orderId },
                data: { status: 'Returned' },
            });

            // 3. Log status history
            await (tx.orderStatusHistory.create as any)({
                data: {
                    orderId: returnReq.orderId,
                    oldStatus: returnReq.order.status,
                    status: 'Returned',
                    changedBy: adminUserId,
                    note: note ? `Refunded: ${note}` : 'Refund confirmed and stock restored.',
                },
            });

            // 4. Restore inventory for each order item
            for (const item of returnReq.order.items) {
                if (!item.variantId) continue;

                // Read current stock
                const current = await (tx.productVariant.findUnique as any)({
                    where: { variantId: item.variantId },
                    select: { stockQuantity: true },
                });

                if (!current) continue; // Variant deleted; skip gracefully

                const previousStock: number = current.stockQuantity;

                // Increment stock
                await (tx.productVariant.update as any)({
                    where: { variantId: item.variantId },
                    data: { stockQuantity: { increment: item.quantity } },
                });

                const newStock = previousStock + item.quantity;

                // Write InventoryLog
                await (tx.inventoryLog.create as any)({
                    data: {
                        variantId: item.variantId,
                        orderId: returnReq.orderId,
                        userId: adminUserId,
                        changeQuantity: +item.quantity,
                        previousStock,
                        newStock,
                        reason: 'RETURN_RESTORE' satisfies InventoryLogReason,
                        note: `Returned order #${returnReq.orderId}`,
                    },
                });
            }
        });

        return {
            success: true,
            code: 'REFUND_COMPLETED',
            messageKey: 'feedback.refundSuccess',
            message: 'Refund confirmed and stock restored.',
        };
    }

    throw new ReturnError('INVALID_ACTION', 'Invalid action.', 400);
}

// ─── listReturns ──────────────────────────────────────────────────────────────
/**
 * Admin: paginated list of all return requests.
 */
export async function listReturns(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
}) {
    const page = Math.max(1, params?.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, params?.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params?.status && params.status !== 'ALL') {
        where.status = params.status;
    }

    const [returns, total] = await Promise.all([
        (prisma.orderReturn.findMany as any)({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
            include: {
                order: {
                    select: {
                        orderNumber: true,
                        totalAmount: true,
                        customerName: true,
                        customerPhone: true,
                    },
                },
                user: {
                    select: {
                        userId: true,
                        fullName: true,
                        email: true,
                        avatarUrl: true,
                    },
                },
            },
        }),
        (prisma.orderReturn.count as any)({ where }),
    ]);

    return {
        returns: returns.map((r: any) => ({
            ...r,
            proofImages: (() => {
                try { return JSON.parse(r.proofImages); } catch { return []; }
            })(),
        })),
        pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        },
    };
}

// ─── getReturnForOrder ────────────────────────────────────────────────────────
/**
 * Get the OrderReturn linked to a specific order.
 * Used by both customer and admin to check return status.
 */
export async function getReturnForOrder(orderId: number) {
    const ret = await (prisma.orderReturn.findUnique as any)({
        where: { orderId },
    });

    if (!ret) return null;

    return {
        ...ret,
        proofImages: (() => {
            try { return JSON.parse(ret.proofImages); } catch { return []; }
        })(),
    };
}
