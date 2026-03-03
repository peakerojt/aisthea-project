import { httpClient } from './httpClient';
import { TrackingData } from '../types/tracking';

export async function publicTracking(orderCode: string, contact: string) {
  const response = await httpClient.post<{ success: boolean; data: TrackingData }>('/api/tracking/public', {
    orderCode,
    contact,
  });
  return response.data.data;
}

export async function getMyOrdersTracking() {
  const response = await httpClient.get<{ success: boolean; data: any[] }>('/api/orders/my');
  return response.data.data;
}

export async function getOrderTracking(orderId: number) {
  const response = await httpClient.get<{ success: boolean; data: TrackingData }>(`/api/orders/${orderId}/tracking`);
  return response.data.data;
}
