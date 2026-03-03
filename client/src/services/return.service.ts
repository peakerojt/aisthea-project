import { httpClient } from './httpClient';

export type ReturnReason =
  | 'DEFECTIVE'
  | 'WRONG_ITEM'
  | 'SIZE_ISSUE'
  | 'CHANGED_MIND'
  | 'OTHER';

export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RECEIVED'
  | 'REFUNDED';

export type RefundMethod = 'ORIGINAL_PAYMENT' | 'WALLET_CREDIT';

export interface CreateReturnPayload {
  orderId: number;
  reason: ReturnReason;
  note?: string;
  items: { orderItemId: number; quantity: number; reason?: string }[];
  attachments?: string[];
}

export const returnService = {
  create: (payload: CreateReturnPayload) => httpClient.post('/api/returns', payload),

  myReturns: (page = 1, limit = 10) =>
    httpClient.get(`/api/returns/my?page=${page}&limit=${limit}`),

  detail: (id: number) => httpClient.get(`/api/returns/${id}`),

  adminList: (params: {
    status?: string;
    orderId?: number;
    customerId?: number;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length > 0) usp.set(k, String(v));
    });
    return httpClient.get(`/api/returns/admin/list?${usp.toString()}`);
  },

  adminApprove: (id: number) => httpClient.patch(`/api/returns/admin/${id}/approve`),

  adminReject: (id: number, reason: string) =>
    httpClient.patch(`/api/returns/admin/${id}/reject`, { reason }),

  adminMarkReceived: (id: number) =>
    httpClient.patch(`/api/returns/admin/${id}/mark-received`),

  adminRefund: (
    id: number,
    payload: { method: RefundMethod; idempotencyKey: string; amount?: number },
  ) => httpClient.patch(`/api/returns/admin/${id}/refund`, payload),
};
