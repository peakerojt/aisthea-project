/**
 * refund.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Enterprise-Grade Financial Refund Engine
 *
 * Responsibilities:
 *  1. Validate the order is paid and the requested amount doesn't over-refund.
 *  2. Call a mock Payment Gateway (VNPay / Stripe structure).
 *  3. Persist the Refund record atomically inside a Prisma $transaction.
 *  4. Update Payment & Order financial statuses accordingly.
 *
 * Refund.status:  PENDING → PROCESSING → SUCCESS | FAILED
 * Refund.type:    FULL | PARTIAL
 * Refund.method:  ORIGINAL_GATEWAY | BANK_TRANSFER | STORE_WALLET
 */

import { prisma } from '../utils/prisma';

// ─── Error class ──────────────────────────────────────────────────────────────

export class RefundError extends Error {
    public readonly code: string;
    public readonly status: number;

    constructor(code: string, message: string, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

// ─── Payment Gateway Abstraction ──────────────────────────────────────────────

export interface GatewayRefundResult {
    success: boolean;
    transactionId?: string;
    errorMessage?: string;
}

export interface IPaymentGateway {
    /**
     * Initiate a refund via the external payment gateway.
     * @param paymentId  Original payment identifier (internal or gateway ref)
     * @param amount     Exact amount to refund in VND / currency units
     * @returns GatewayRefundResult with transactionId on success
     */
    processRefund(paymentId: string, amount: number): Promise<GatewayRefundResult>;
}

// ─── Mock VNPay Gateway ───────────────────────────────────────────────────────

export class MockVNPayGateway implements IPaymentGateway {
    async processRefund(paymentId: string, amount: number): Promise<GatewayRefundResult> {
        // Simulate network latency
        await new Promise<void>((resolve) => setTimeout(resolve, 300));

        // 10% random failure rate to simulate real-world gateway issues
        if (Math.random() < 0.1) {
            return {
                success: false,
                errorMessage: 'VNPay: Refund transaction failed - Error code GW_TIMEOUT',
            };
        }

        const transactionId = `VNP-RF-${paymentId}-${Date.now()}`;
        return { success: true, transactionId };
    }
}

// ─── Mock Stripe Gateway ──────────────────────────────────────────────────────

export class MockStripeGateway implements IPaymentGateway {
    async processRefund(paymentId: string, amount: number): Promise<GatewayRefundResult> {
        await new Promise<void>((resolve) => setTimeout(resolve, 250));

        if (Math.random() < 0.1) {
            return {
                success: false,
                errorMessage: 'Stripe: charge_already_refunded or card_error',
            };
        }

        const transactionId = `re_${paymentId}_${Math.random().toString(36).slice(2, 12)}`;
        return { success: true, transactionId };
    }
}

// ─── Gateway factory ──────────────────────────────────────────────────────────

function selectGateway(method: string): IPaymentGateway {
    // In production, pick based on Order.paymentMethod or config
    if (method === 'BANK_TRANSFER' || method === 'STORE_WALLET') {
        // Manual methods — no gateway needed; mock as instant success
        return {
            async processRefund(_pid: string, _amt: number) {
                return { success: true, transactionId: `MANUAL-${Date.now()}` };
            },
        };
    }
    // Default: VNPay mock (swap to Stripe or real SDK in production)
    return new MockVNPayGateway();
}

// ─── Payload types ────────────────────────────────────────────────────────────

export interface CreateRefundPayload {
    amount: number;                                               // In VND (integer is fine)
    type: 'FULL' | 'PARTIAL';
    method: 'ORIGINAL_GATEWAY' | 'BANK_TRANSFER' | 'STORE_WALLET';
    reason: string;
}

// ─── initiateRefund ───────────────────────────────────────────────────────────
/**
 * Admin-only: initiate a financial refund for a paid order.
 *
 * Validations:
 *  1. Order must exist.
 *  2. Order must be Paid (paymentStatus === 'Paid').
 *  3. totalAlreadyRefunded + newAmount <= order.totalAmount.
 *
 * Prisma transaction:
 *  1. Create Refund with status PROCESSING.
 *  2. Call Payment Gateway.
 *  3. On success: Refund → SUCCESS, Payment → PARTIALLY_REFUNDED / REFUNDED, Order → reflect.
 *  4. On failure: Refund → FAILED, log error, throw to caller.
 */
export async function initiateRefund(
    orderId: number,
    adminUserId: number,
    payload: CreateRefundPayload,
): Promise<any> {
    // ── 1. Load order with payments and existing refunds
    const order = await (prisma.order.findUnique as any)({
        where: { orderId },
        include: {
            payments: true,
            refunds: true,
        },
    });

    if (!order) {
        throw new RefundError('ORDER_NOT_FOUND', 'Order not found.', 404);
    }

    // ── 2. Payment status guard
    const isPaid = ['Paid', 'PAID', 'paid'].includes(order.paymentStatus ?? '');
    const isPartiallyRefunded = (order.paymentStatus ?? '').includes('PARTIALLY_REFUNDED') ||
        (order.paymentStatus ?? '').includes('Partially_Refunded');

    if (!isPaid && !isPartiallyRefunded) {
        throw new RefundError(
            'ORDER_NOT_PAID',
            'Order has not been paid; refund cannot be processed.',
        );
    }

    // ── 3. Over-refund guard
    const orderTotal = Number(order.totalAmount);
    const totalAlreadyRefunded = (order.refunds as any[])
        .filter((r: any) => r.status === 'SUCCESS')
        .reduce((sum: number, r: any) => sum + Number(r.amount), 0);

    const maxRefundable = orderTotal - totalAlreadyRefunded;

    if (payload.amount <= 0) {
        throw new RefundError(
            'INVALID_AMOUNT',
            'Refund amount is invalid or exceeds the allowed limit.',
        );
    }

    if (totalAlreadyRefunded + payload.amount > orderTotal) {
        throw new RefundError(
            'OVER_REFUND',
            'Refund amount exceeds the total order value.',
        );
    }

    // ── 4. Identify the original payment to callback on
    const originalPayment = (order.payments as any[])[0] ?? null;
    const gatewayPaymentRef = originalPayment?.transactionCode ?? String(originalPayment?.paymentId ?? orderId);

    // ── 5. Select gateway
    const gateway = selectGateway(payload.method);

    // ── 6. Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
        // Step A: Create Refund record with PROCESSING status
        const refund = await (tx.refund.create as any)({
            data: {
                orderId,
                paymentId: originalPayment?.paymentId ?? null,
                amount: payload.amount,
                type: payload.type,
                method: payload.method,
                status: 'PROCESSING',
                reason: payload.reason,
                createdBy: adminUserId,
            },
        });

        // Step B: Call gateway (outside transaction is safer but kept here for atomicity demo)
        const gatewayResult = await gateway.processRefund(gatewayPaymentRef, payload.amount);

        if (!gatewayResult.success) {
            // Step C (failure): Mark refund as FAILED
            await (tx.refund.update as any)({
                where: { refundId: refund.refundId },
                data: {
                    status: 'FAILED',
                    gatewayError: gatewayResult.errorMessage ?? 'Unknown gateway error.',
                },
            });

            throw new RefundError(
                'GATEWAY_FAILED',
                gatewayResult.errorMessage ?? 'Payment gateway rejected the refund transaction.',
            );
        }

        // Step D (success): Mark refund as SUCCESS
        await (tx.refund.update as any)({
            where: { refundId: refund.refundId },
            data: {
                status: 'SUCCESS',
                gatewayTransactionId: gatewayResult.transactionId,
            },
        });

        // Step E: Update Payment status
        const newTotalRefunded = totalAlreadyRefunded + payload.amount;
        const isFullyRefunded = newTotalRefunded >= orderTotal;

        if (originalPayment) {
            await (tx.payment.update as any)({
                where: { paymentId: originalPayment.paymentId },
                data: {
                    status: isFullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
                },
            });
        }

        // Step F: Update Order paymentStatus
        await (tx.order.update as any)({
            where: { orderId },
            data: {
                paymentStatus: isFullyRefunded ? 'Refunded' : 'Partially_Refunded',
            },
        });

        return { ...refund, status: 'SUCCESS', gatewayTransactionId: gatewayResult.transactionId };
    });

    return result;
}

// ─── getRefundsForOrder ───────────────────────────────────────────────────────
/**
 * Fetch all Refund records for a specific order, ordered by creation date desc.
 */
export async function getRefundsForOrder(orderId: number): Promise<any[]> {
    const refunds = await (prisma.refund.findMany as any)({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
    });
    return refunds;
}
