/**
 * refund.service.ts (client)
 * Zod schemas + API calls for the Financial Refund Engine.
 */

import { z } from 'zod';
import { api } from '../utils/api';

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

export interface RefundListResponse {
    success: boolean;
    data: RefundRecord[];
}

export interface CreateRefundResponse {
    success: boolean;
    message: string;
    data?: RefundRecord;
}

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

// ─── Admin Refund Service ─────────────────────────────────────────────────────

export const adminRefundService = {
    /**
     * Initiate a new refund for an order.
     */
    async create(orderId: number, payload: RefundRequestPayload): Promise<CreateRefundResponse> {
        return api.post<CreateRefundResponse>(`/api/orders/${orderId}/refunds`, payload);
    },

    /**
     * Fetch all refund records for a given order.
     */
    async list(orderId: number): Promise<RefundRecord[]> {
        const res = await api.get<RefundListResponse>(`/api/orders/${orderId}/refunds`);
        return (res as any).data ?? [];
    },
};
