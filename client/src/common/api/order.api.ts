import i18n from '@/i18n/config';
import { API_BASE_URL, api } from '@/common/utils/api';
import type {
    AdminBulkOrderUpdateResponse,
    AdminOrdersResponse,
    MyOrdersResponse,
    OrderQuote,
    UpdateStatusPayload,
} from '@/common/services/order.service';

const DEFAULT_LANGUAGE = 'vi';
const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';

const getActiveLanguage = () => {
    const current = i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE;
    return current.split('-')[0] || DEFAULT_LANGUAGE;
};

const getCookie = (name: string): string | undefined => {
    if (typeof document === 'undefined') return undefined;
    const source = `; ${document.cookie}`;
    const parts = source.split(`; ${name}=`);
    if (parts.length !== 2) return undefined;
    return decodeURIComponent(parts.pop()!.split(';').shift() || '');
};

const createOrderApiError = async (response: Response, fallback: string) => {
    const payload = await response.json().catch(() => null) as { errorCode?: string; code?: string; message?: string } | null;
    const code = payload?.errorCode || payload?.code;
    const message = code
        ? i18n.t(`errors:${code}`, { defaultValue: payload?.message || code })
        : payload?.message || fallback;
    const error = new Error(message) as Error & { status: number; code?: string };
    error.status = response.status;
    error.code = code;
    throw error;
};

const fetchOrderBlob = async (endpoint: string, fallback: string, payload: unknown) => {
    const language = getActiveLanguage();
    const csrfToken = getCookie(CSRF_COOKIE_NAME);
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'x-lang': language,
            'accept-language': language,
            ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        await createOrderApiError(response, fallback);
    }

    return response.blob();
};

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
    getAdminOrders: <T>(query: string, options?: { signal?: AbortSignal; skipDedupe?: boolean }) =>
        api.get<{ data: T; meta?: AdminOrdersResponse['pagination'] }>(`/api/orders/admin${query}`, options),

    getAdminOrderTabCounts: (query: string, options?: { signal?: AbortSignal; skipDedupe?: boolean }) =>
        api.get<{ data: Record<string, number> }>(`/api/orders/admin/tab-counts${query}`, options),

    getAdminOrderDetail: <T>(id: string | number) => api.get<T>(`/api/orders/admin/${id}`),

    bulkUpdateOrderStatus: (payload: { orderIds: number[]; status: string; note?: string }) =>
        api.patch<{ success: boolean; data: AdminBulkOrderUpdateResponse }>('/api/orders/admin/bulk-status', payload),

    exportSelectedAdminOrders: (payload: { orderIds: number[] }) =>
        fetchOrderBlob('/api/orders/admin/export', 'Không thể xuất danh sách đơn hàng đã chọn', payload),

    exportSelectedAdminShippingLabels: (payload: { orderIds: number[] }) =>
        fetchOrderBlob('/api/orders/admin/export-shipping-labels', 'Không thể xuất phiếu gửi hàng', payload),

    uploadDeliveryProofImages: (id: string | number, payload: FormData) =>
        api.post<{ success: boolean; data: { images: Array<{ url: string; width: number; height: number }> } }>(`/api/orders/${id}/delivery-proof-images`, payload),

    updateOrderStatus: (id: string | number, payload: UpdateStatusPayload) => api.patch<{ success: boolean; message: string; stockRestored: boolean }>(`/api/orders/${id}/status`, payload),
};
