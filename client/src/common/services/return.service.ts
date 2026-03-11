/**
 * return.service.ts (client)
 * API calls for the Return & Refund module.
 */

// Removed api import for return.service.ts

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReturnReason =
  | 'DEFECTIVE'
  | 'WRONG_ITEM'
  | 'SIZE_ISSUE'
  | 'CHANGED_MIND'
  | 'OTHER';

export type ReturnStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

export type RefundMethod = 'ORIGINAL_PAYMENT' | 'WALLET_CREDIT';

export interface OrderReturn {
  returnId: number;
  orderId: number;
  userId: number | null;
  reason: string;
  proofImages: string[]; // Cloudinary URLs (already parsed from JSON)
  status: ReturnStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated in admin list
  order?: {
    orderNumber: string;
    totalAmount: string;
    customerName: string;
    customerPhone: string;
  };
  user?: {
    userId: number;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  } | null;
}

export interface ReturnListResponse {
  returns: OrderReturn[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

import { returnApi } from '@/common/api/return.api';

// ─── Customer ─────────────────────────────────────────────────────────────────

export const returnService = {
  /**
   * Customer: submit a return request for a delivered order.
   */
  async request(orderId: number, reason: string, proofImages: string[]): Promise<OrderReturn> {
    return returnApi.requestReturn(orderId, { reason, proofImages });
  },

  /**
   * Get the OrderReturn linked to a specific order (for customer and admin).
   */
  async getForOrder(orderId: number): Promise<OrderReturn | null> {
    const res = await returnApi.getReturnForOrder(orderId);
    return (res as { data?: OrderReturn }).data ?? null;
  },

  /**
   * Get paginated returns for current customer
   */
  async myReturns(page = 1, limit = 8): Promise<unknown> {
    return returnApi.getMyReturns(page, limit);
  },

  /**
   * Get return detail
   */
  async detail(returnId: number): Promise<unknown> {
    return returnApi.getUserReturnDetail(returnId);
  },
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminReturnService = {
  /**
   * Paginated list of all return requests.
   */
  async list(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ReturnListResponse> {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') q.append('status', params.status);
    if (params?.page) q.append('page', params.page.toString());
    if (params?.pageSize) q.append('pageSize', params.pageSize.toString());
    const query = q.toString();
    const res = await returnApi.getAdminReturns(query ? `?${query}` : '');
    return res as ReturnListResponse;
  },

  /**
   * Admin: approve / reject / complete refund for a return request.
   */
  async process(
    returnId: number,
    action: 'APPROVE' | 'REJECT' | 'COMPLETE_REFUND',
    note?: string,
  ): Promise<{ success: boolean; message: string; messageKey?: string; code?: string }> {
    return returnApi.processReturn(returnId, { action, note });
  },

  /**
   * Alias methods to support ReturnDetailPage components
   */
  async detail(returnId: number) {
    return returnApi.getAdminReturnDetail(returnId);
  },
  async adminApprove(returnId: number) {
    return this.process(returnId, 'APPROVE');
  },
  async adminReject(returnId: number, note?: string) {
    return this.process(returnId, 'REJECT', note);
  },
  async adminMarkReceived(returnId: number) {
    // There is no explicit MARK_RECEIVED in the old API process, 
    // it goes straight to COMPLETE_REFUND or we use a custom endpoint if it exists.
    // Fallback to sending a patch just in case
    return returnApi.markReceived(returnId);
  },
  async adminRefund(returnId: number, payload: Record<string, unknown>) {
    // Pass note as payload JSON if needed or just COMPLET_REFUND
    return this.process(returnId, 'COMPLETE_REFUND');
  }
};
