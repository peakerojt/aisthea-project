import { api } from '@/common/utils/api';
import type { AdminReturnListPayload } from '@/admin/services/types';
import type {
  RefundMethod,
  ReturnRequest,
  ReturnRequestDetail,
  ReturnServiceEnvelope,
} from '@/common/services/return.types';

export const adminReturnApi = {
  getAdminReturnRequests: (query: string) =>
    api.get<ReturnServiceEnvelope<AdminReturnListPayload>>(`/api/return-requests/admin/list${query}`),

  getAdminReturnRequestDetail: (returnId: number) =>
    api.get<ReturnServiceEnvelope<ReturnRequestDetail>>(`/api/return-requests/${returnId}`),

  approveReturnRequest: (returnId: number) =>
    api.patch<ReturnServiceEnvelope<ReturnRequest>>(`/api/return-requests/admin/${returnId}/approve`),

  rejectReturnRequest: (returnId: number, data: { reason: string }) =>
    api.patch<ReturnServiceEnvelope<ReturnRequest>>(`/api/return-requests/admin/${returnId}/reject`, data),

  markReturnInTransit: (returnId: number) =>
    api.patch<ReturnServiceEnvelope<ReturnRequest>>(`/api/return-requests/admin/${returnId}/mark-in-transit`),

  markReturnReceived: (returnId: number) =>
    api.patch<ReturnServiceEnvelope<ReturnRequest>>(`/api/return-requests/admin/${returnId}/mark-received`),

  acceptReturnForRefund: (returnId: number) =>
    api.patch<ReturnServiceEnvelope<ReturnRequest>>(`/api/return-requests/admin/${returnId}/accept-for-refund`),

  updateRefundStatus: (
    returnId: number,
    data: { refundStatus: 'PENDING' | 'PROCESSING' | 'FAILED' | 'MANUAL_REVIEW'; comment?: string },
  ) =>
    api.patch<ReturnServiceEnvelope<ReturnRequest>>(`/api/return-requests/admin/${returnId}/refund-status`, data),

  refundReturnRequest: (returnId: number, data: { method: RefundMethod; idempotencyKey: string; amount?: number }) =>
    api.patch<ReturnServiceEnvelope<unknown>>(`/api/return-requests/admin/${returnId}/refund`, data),
};
