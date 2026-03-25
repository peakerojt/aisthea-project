import { api } from '@/common/utils/api';
import {
    AdminReturnListPayload,
    RefundMethod,
    CreateReturnPayload,
    MyReturnListResponse,
    OrderReturn,
    ReturnListResponse,
    ReturnRequest,
    ReturnRequestDetail,
    ReturnServiceEnvelope,
} from '@/common/services/return.service';

export const returnApi = {
    // ---- User Endpoints ----
    requestReturn: (orderId: number, data: { reason: string; proofImages: string[] }) =>
        api.post<ReturnServiceEnvelope<OrderReturn>>(`/api/orders/${orderId}/return`, data),

    createReturnRequest: (payload: CreateReturnPayload) =>
        api.post<ReturnServiceEnvelope<ReturnRequest>>('/api/return-requests', payload),

    getReturnForOrder: (orderId: number) =>
        api.get<ReturnServiceEnvelope<OrderReturn | null>>(`/api/orders/${orderId}/return`),

    getMyReturns: (page: number, limit: number) =>
        api.get<ReturnServiceEnvelope<MyReturnListResponse>>(`/api/return-requests/my?page=${page}&limit=${limit}`),

    getUserReturnDetail: (returnId: number) =>
        api.get<ReturnServiceEnvelope<ReturnRequestDetail>>(`/api/return-requests/${returnId}`),

    // ---- Admin Endpoints ----
    getAdminReturns: (query: string) => api.get<ReturnListResponse>(`/api/returns${query}`),

    getAdminReturnRequests: (query: string) =>
        api.get<ReturnServiceEnvelope<AdminReturnListPayload>>(`/api/return-requests/admin/list${query}`),

    processReturn: (returnId: number, data: { action: 'APPROVE' | 'REJECT' | 'COMPLETE_REFUND'; note?: string }) =>
        api.patch<{ success: boolean; message: string; messageKey?: string; code?: string }>(`/api/returns/${returnId}/process`, data),

    getAdminReturnDetail: (returnId: number) => api.get(`/api/returns/${returnId}`),

    getAdminReturnRequestDetail: (returnId: number) =>
        api.get<ReturnServiceEnvelope<ReturnRequestDetail>>(`/api/return-requests/${returnId}`),

    approveReturnRequest: (returnId: number) =>
        api.patch<ReturnServiceEnvelope<ReturnRequest>>(`/api/return-requests/admin/${returnId}/approve`),

    rejectReturnRequest: (returnId: number, data: { reason: string }) =>
        api.patch<ReturnServiceEnvelope<ReturnRequest>>(`/api/return-requests/admin/${returnId}/reject`, data),

    markReturnReceived: (returnId: number) =>
        api.patch<ReturnServiceEnvelope<ReturnRequest>>(`/api/return-requests/admin/${returnId}/mark-received`),

    refundReturnRequest: (returnId: number, data: { method: RefundMethod; idempotencyKey: string; amount?: number }) =>
        api.patch<ReturnServiceEnvelope<unknown>>(`/api/return-requests/admin/${returnId}/refund`, data),

    markReceived: (returnId: number) => api.patch(`/api/returns/${returnId}/mark-received`)
};
