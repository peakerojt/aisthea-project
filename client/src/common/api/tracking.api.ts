import { api } from '@/common/utils/api';
import { TrackingData } from '@/types/tracking';

export const trackingApi = {
    publicTrack: (data: { orderCode: string; contact: string }) => api.post<{ success: boolean; data: TrackingData }>('/api/tracking/public', data),
    getOrderTrack: (orderId: number) => api.get<{ success: boolean; data: TrackingData }>(`/api/orders/${orderId}/tracking`)
};
