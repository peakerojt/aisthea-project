/**
 * refund.service.ts (client)
 * Zod schemas + API calls for the Financial Refund Engine.
 */

import { z } from 'zod';
import { api } from '@/common/utils/api';
import { isCollectedPaymentStatus } from '@/common/utils/paymentStatus';

// ─── Zod validation schema ────────────────────────────────────────────────────

export const RefundRequestSchema = z.object({
    type: z.enum(['FULL', 'PARTIAL'] as const, {
        error: 'refund.errors.invalidType',
    }),
    method: z.enum(['ORIGINAL_GATEWAY', 'BANK_TRANSFER', 'STORE_WALLET'] as const, {
        error: 'refund.errors.invalidMethod',
    }),
    amount: z
        .number({ error: 'refund.errors.amountMustBeNumber' })
        .positive('refund.errors.amountGreaterThanZero')
        .max(999_999_999, 'refund.errors.amountExceedsLimit'),
    reason: z
        .string()
        .min(5, 'refund.errors.reasonMinLength')
        .max(500, 'refund.errors.reasonMaxLength'),
});

export type RefundRequestPayload = z.infer<typeof RefundRequestSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

export type RefundType = 'FULL' | 'PARTIAL';
export type RefundMethod = 'ORIGINAL_GATEWAY' | 'BANK_TRANSFER' | 'STORE_WALLET';
export type RefundStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface RefundablePaymentLike {
    amount?: string | number | null;
    status?: string | null;
}

export interface RefundRecord {
    refundId: number;
    orderId: number;
    paymentId: number | null;
    amount: string;           // Decimal comes as string from JSON
    type: RefundType;
    method: RefundMethod;
    status: RefundStatus;
    gatewayTransactionId: string | null;
    reason: string;
    gatewayError: string | null;
    createdBy: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface RefundFinancialSummary {
    totalCollected: number;
    totalRefunded: number;
    remainingRefundable: number;
}

export interface RefundListResponse {
    success: boolean;
    data: RefundRecord[];
    summary?: RefundFinancialSummary;
}

export interface RefundListResult {
    refunds: RefundRecord[];
    summary?: RefundFinancialSummary;
}

export interface CreateRefundResponse {
    success: boolean;
    message: string;
    data?: RefundRecord;
    summary?: RefundFinancialSummary;
}

export interface RefundProcessingState {
    processingRefund?: RefundRecord;
    isLocked: boolean;
}

export interface RefundErrorDetail {
    field?: string;
    code?: string;
    message?: string;
}

type RefundApiError = Error & {
    details?: RefundErrorDetail[];
};

// ─── Vietnamese label helpers ─────────────────────────────────────────────────

export const REFUND_METHODS: RefundMethod[] = [
    'ORIGINAL_GATEWAY',
    'BANK_TRANSFER',
    'STORE_WALLET',
];

export const REFUND_STATUSES: RefundStatus[] = [
    'PENDING',
    'PROCESSING',
    'SUCCESS',
    'FAILED',
];

export const normalizeRefundStatus = (status: string | null | undefined): RefundStatus => {
    const normalized = (status ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase();
    return (REFUND_STATUSES.find((candidate) => candidate === normalized) ?? 'PENDING') as RefundStatus;
};

export const getProcessingRefund = (refunds: RefundRecord[]): RefundRecord | undefined =>
    refunds.find((refund) => normalizeRefundStatus(refund.status) === 'PROCESSING');

export const getTotalCollectedAmount = (payments: RefundablePaymentLike[]): number =>
    payments.reduce((sum, payment) => {
        if (!isCollectedPaymentStatus(payment?.status)) {
            return sum;
        }

        return sum + Number(payment?.amount ?? 0);
    }, 0);

export const getSuccessfulRefundedAmount = (refunds: RefundRecord[]): number =>
    refunds
        .filter((refund) => normalizeRefundStatus(refund.status) === 'SUCCESS')
        .reduce((sum, refund) => sum + Number(refund.amount), 0);

export const getRemainingRefundableAmount = (
    payments: RefundablePaymentLike[],
    refunds: RefundRecord[],
): number => Math.max(getTotalCollectedAmount(payments) - getSuccessfulRefundedAmount(refunds), 0);

export const getRefundProcessingState = (refunds: RefundRecord[]): RefundProcessingState => {
    const processingRefund = getProcessingRefund(refunds);
    return {
        processingRefund,
        isLocked: Boolean(processingRefund),
    };
};

const normalizeRefundFinancialSummary = (summary: RefundListResponse['summary']): RefundFinancialSummary | undefined => {
    if (!summary) {
        return undefined;
    }

    return {
        totalCollected: Number(summary.totalCollected ?? 0),
        totalRefunded: Number(summary.totalRefunded ?? 0),
        remainingRefundable: Number(summary.remainingRefundable ?? 0),
    };
};

// ─── Admin Refund Service ─────────────────────────────────────────────────────

export const adminRefundService = {
    /**
     * Fetch all refund records for a given order.
     */
    async list(orderId: number): Promise<RefundRecord[]> {
        const res = await api.get<RefundListResponse>(`/api/orders/${orderId}/refunds`);
        return (res as { data?: RefundRecord[] }).data ?? [];
    },

    async listWithSummary(orderId: number): Promise<RefundListResult> {
        const res = await api.get<RefundListResponse>(`/api/orders/${orderId}/refunds`);
        return {
            refunds: (res as { data?: RefundRecord[] }).data ?? [],
            summary: normalizeRefundFinancialSummary(res.summary),
        };
    },
};
