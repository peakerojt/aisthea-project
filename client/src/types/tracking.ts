import { OrderTrackingStatus } from '@/common/components/orderTracking.constants';

export interface TrackingTimelineItem {
  status: OrderTrackingStatus;
  statusLabelKey?: string;
  timestamp: string;
  note?: string | null;
  location?: string | null;
  description?: string | null;
  updatedBy?: number | null;
}

export interface TrackingData {
  orderId: number;
  orderCode: string;
  currentStatus: OrderTrackingStatus;
  currentStatusLabelKey?: string;
  eta: string | null;
  // Top-level logistics (from Order model)
  carrier?: string | null;
  trackingNumber?: string | null;
  estimatedDeliveryDate?: string | null;
  shipment: {
    carrier: string | null;
    trackingNumber: string | null;
    lastKnownLocation: string | null;
    eta?: string | null;
  } | null;
  contact?: {
    customerPhone?: string | null;
    customerEmail?: string | null;
  };
  items: Array<{
    orderItemId: number;
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
  }>;
  timeline: TrackingTimelineItem[];
}
