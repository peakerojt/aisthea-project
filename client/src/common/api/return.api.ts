import { api } from '@/common/utils/api';
import type {
    CreateReturnPayload,
    MyReturnListResponse,
    OrderReturn,
    ReturnRequest,
    ReturnRequestDetail,
    ReturnServiceEnvelope,
} from '@/common/services/return.types';

export const returnApi = {
    createReturnRequest: (payload: CreateReturnPayload) =>
        api.post<ReturnServiceEnvelope<ReturnRequest>>('/api/return-requests', payload),

    getReturnForOrder: (orderId: number) =>
        api.get<ReturnServiceEnvelope<OrderReturn | null>>(`/api/orders/${orderId}/return`),

    getMyReturns: (
        page: number,
        limit: number,
        options?: { view?: 'full' | 'summary'; orderIds?: number[]; updatedSince?: string },
    ) =>
        api.get<ReturnServiceEnvelope<MyReturnListResponse>>(
            `/api/return-requests/my?page=${page}&limit=${limit}${options?.view ? `&view=${options.view}` : ''}${options?.orderIds?.length ? `&orderIds=${options.orderIds.join(',')}` : ''}${options?.updatedSince ? `&updatedSince=${encodeURIComponent(options.updatedSince)}` : ''}`,
        ),

    getUserReturnDetail: (returnId: number) =>
        api.get<ReturnServiceEnvelope<ReturnRequestDetail>>(`/api/return-requests/${returnId}`),
};
