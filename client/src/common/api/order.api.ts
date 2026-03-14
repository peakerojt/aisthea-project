import { api } from '@/common/utils/api';
import { MyOrdersResponse, AdminOrdersResponse, UpdateStatusPayload } from '@/common/services/order.service';

export const orderApi = {
    // ---- User Endpoints ----
    getMyOrders: (query: string) => api.get<{ data: MyOrdersResponse['orders']; meta?: MyOrdersResponse['pagination'] }>(`/api/orders/my${query}`),

    getMyOrderDetail: <T>(id: string | number) => api.get<T>(`/api/orders/my/${id}`),

    cancelMyOrder: <T>(id: string | number) => api.patch<T>(`/api/orders/my/${id}/cancel`, {}),

    cancelOrder: <T>(id: string | number) => api.patch<T>(`/api/orders/${id}/cancel`),

    confirmReceipt: (id: string | number) => api.patch<{ success: boolean; newStatus: string }>(`/api/orders/${id}/confirm-receipt`),

    // ---- Admin Endpoints ----
    getAdminOrders: <T>(query: string) => api.get<{ data: T; meta?: AdminOrdersResponse['pagination'] }>(`/api/orders/admin${query}`),

    getAdminOrderDetail: <T>(id: string | number) => api.get<T>(`/api/orders/admin/${id}`),

    updateOrderStatus: (id: string | number, payload: UpdateStatusPayload) => api.patch<{ success: boolean; message: string; stockRestored: boolean }>(`/api/orders/${id}/status`, payload),
};
