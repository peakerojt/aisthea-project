/**
 * return.service.ts (client)
 * API calls for the Return & Refund module.
 */

import { api } from '../utils/api';

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

// ─── Customer ─────────────────────────────────────────────────────────────────

export const returnService = {
  /**
   * Customer: submit a return request for a delivered order.
   */
  async request(orderId: number, reason: string, proofImages: string[]): Promise<OrderReturn> {
    return api.post<OrderReturn>(`/api/orders/${orderId}/return`, {
      reason,
      proofImages,
    });
  },

  /**
   * Get the OrderReturn linked to a specific order (for customer and admin).
   */
  async getForOrder(orderId: number): Promise<OrderReturn | null> {
    const res = await api.get<{ success: boolean; data: OrderReturn | null }>(
      `/api/orders/${orderId}/return`,
    );
    return (res as any).data ?? null;
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
    const res = await api.get<ReturnListResponse>(`/api/returns${query ? `?${query}` : ''}`);
    return res as ReturnListResponse;
  },

  /**
   * Admin: approve / reject / complete refund for a return request.
   */
  async process(
    returnId: number,
    action: 'APPROVE' | 'REJECT' | 'COMPLETE_REFUND',
    note?: string,
  ): Promise<{ success: boolean; message: string }> {
    return api.patch<{ success: boolean; message: string }>(
      `/api/returns/${returnId}/process`,
      { action, note },
    );
  },

  /**
   * Alias methods to support AdminReturnDetailPage components
   */
  async detail(returnId: number) {
    return api.get(`/api/returns/${returnId}`);
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
    return api.patch(`/api/returns/${returnId}/mark-received`);
  },
  async adminRefund(returnId: number, payload: any) {
    // Pass note as payload JSON if needed or just COMPLET_REFUND
    return this.process(returnId, 'COMPLETE_REFUND');
  }
};
