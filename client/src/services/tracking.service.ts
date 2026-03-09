import { api } from '../utils/api';
import { TrackingData } from '../types/tracking';

export async function publicTracking(orderCode: string, contact: string) {
  const response = await api.post<{ success: boolean; data: TrackingData }>('/api/tracking/public', {
    orderCode,
    contact,
  });
  return response.data || response;
}

export async function getMyOrdersTracking() {
  const response = await api.get<{ success: boolean; data: unknown[] }>('/api/orders/my');
  return response.data || response;
}

export async function getOrderTracking(orderId: number) {
  const response = await api.get<{ success: boolean; data: TrackingData }>(`/api/orders/${orderId}/tracking`);
  return response.data || response;
}
