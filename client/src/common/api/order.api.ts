import { api } from '@/common/utils/api';
import { MyOrdersResponse, AdminOrdersResponse, UpdateStatusPayload, OrderQuote } from '@/common/services/order.service';

export const orderApi = {
    // ---- User Endpoints ----
    getMyOrders: (query: string) => api.get<{ data: MyOrdersResponse['orders']; meta?: MyOrdersResponse['pagination'] }>(`/api/orders/my${query}`),

    getMyOrderDetail: <T>(id: string | number) => api.get<T>(`/api/orders/my/${id}`),

    quoteOrder: (payload: {
        items: Array<{ variantId: number; quantity: number }>;
        couponCode?: string;
        shippingCityCode?: string;
        shippingMethod?: 'STANDARD' | 'EXPRESS';
    }) => api.post<OrderQuote>('/api/orders/quote', payload),

    createOrder: <T>(payload: unknown) => api.post<T>('/api/orders', payload),

    cancelMyOrder: <T>(id: string | number, payload?: { reason?: string; note?: string }) => api.patch<T>(`/api/orders/my/${id}/cancel`, payload ?? {}),

    cancelOrder: <T>(id: string | number, payload?: { reason?: string; note?: string }) => api.patch<T>(`/api/orders/${id}/cancel`, payload ?? {}),

    confirmReceipt: (id: string | number) => api.patch<{ success: boolean; newStatus: string }>(`/api/orders/${id}/confirm-receipt`),

    // ---- Admin Endpoints ----
    getAdminOrders: <T>(query: string) => api.get<{ data: T; meta?: AdminOrdersResponse['pagination'] }>(`/api/orders/admin${query}`),

    getAdminOrderTabCounts: (query: string) =>
        api.get<{ data: Record<string, number> }>(`/api/orders/admin/tab-counts${query}`),

    getAdminOrderDetail: <T>(id: string | number) => api.get<T>(`/api/orders/admin/${id}`),

    uploadDeliveryProofImages: (id: string | number, payload: FormData) =>
        api.post<{ success: boolean; data: { images: Array<{ url: string; width: number; height: number }> } }>(`/api/orders/${id}/delivery-proof-images`, payload),

    updateOrderStatus: (id: string | number, payload: UpdateStatusPayload) => api.patch<{ success: boolean; message: string; stockRestored: boolean }>(`/api/orders/${id}/status`, payload),
};
