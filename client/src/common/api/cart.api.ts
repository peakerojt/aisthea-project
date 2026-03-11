import { api } from '@/common/utils/api';
import { ApiCartResponse } from '@/common/services/cart.service';

export const cartApi = {
    fetch: () => api.get<ApiCartResponse>('/api/cart'),
    add: (data: { variantId: number; quantity: number }) => api.post<ApiCartResponse>('/api/cart/add', data),
    update: (data: { cartItemId: number; quantity: number }) => api.put<ApiCartResponse>('/api/cart/update', data),
    remove: (cartItemId: number) => api.delete<ApiCartResponse>(`/api/cart/item/${cartItemId}`),
    merge: (items: any[]) => api.post<ApiCartResponse>('/api/cart/merge', { items }),
    clear: () => api.delete<ApiCartResponse>('/api/cart/clear')
};
