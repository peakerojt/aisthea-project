import { OrderTrackingStatus } from '../shared/orderTracking.constants';

export interface TrackingTimelineItem {
  status: OrderTrackingStatus;
  timestamp: string;
  note?: string | null;
  updatedBy?: number | null;
}

export interface TrackingData {
  orderId: number;
  orderCode: string;
  currentStatus: OrderTrackingStatus;
  eta: string | null;
  shipment: {
    carrier: string | null;
    trackingNumber: string | null;
    lastKnownLocation: string | null;
  } | null;
  items: Array<{
    orderItemId: number;
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
  }>;
  timeline: TrackingTimelineItem[];
}
