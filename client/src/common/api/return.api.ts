import { api } from '@/common/utils/api';
import { OrderReturn, ReturnListResponse } from '@/common/services/return.service';

export const returnApi = {
    // ---- User Endpoints ----
    requestReturn: (orderId: number, data: { reason: string; proofImages: string[] }) => api.post<OrderReturn>(`/api/orders/${orderId}/return`, data),

    getReturnForOrder: (orderId: number) => api.get<{ success: boolean; data: OrderReturn | null }>(`/api/orders/${orderId}/return`),

    getMyReturns: (page: number, limit: number) => api.get(`/api/returns/my?page=${page}&limit=${limit}`),

    getUserReturnDetail: (returnId: number) => api.get(`/api/returns/${returnId}`),

    // ---- Admin Endpoints ----
    getAdminReturns: (query: string) => api.get<ReturnListResponse>(`/api/returns${query}`),

    processReturn: (returnId: number, data: { action: 'APPROVE' | 'REJECT' | 'COMPLETE_REFUND'; note?: string }) =>
        api.patch<{ success: boolean; message: string; messageKey?: string; code?: string }>(`/api/returns/${returnId}/process`, data),

    getAdminReturnDetail: (returnId: number) => api.get(`/api/returns/${returnId}`),

    markReceived: (returnId: number) => api.patch(`/api/returns/${returnId}/mark-received`)
};
