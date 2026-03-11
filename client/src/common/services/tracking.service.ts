// Removed api import for tracking.service.ts
import { TrackingData } from '@/types/tracking';

import { trackingApi } from '@/common/api/tracking.api';

export async function publicTracking(orderCode: string, contact: string) {
  const response = await trackingApi.publicTrack({ orderCode, contact });
  return response.data || response;
}

export async function getMyOrdersTracking() {
  const response = await trackingApi.getMyOrders();
  return response.data || response;
}

export async function getOrderTracking(orderId: number) {
  const response = await trackingApi.getOrderTrack(orderId);
  return response.data || response;
}
