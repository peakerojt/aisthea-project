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
};
