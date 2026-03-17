export type TrackingStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | string;

export interface TrackingTimelineItem {
  status: TrackingStatus;
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
  trackingCode: string;
  currentStatus: TrackingStatus;
  currentStatusLabelKey?: string;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  eta: string | null;
  shippingMode?: 'manual' | 'provider';
  provider?: string | null;
  providerOrderCode?: string | null;
  providerStatus?: string | null;
  // Top-level logistics (from Order model)
  carrier?: string | null;
  trackingNumber?: string | null;
  estimatedDeliveryDate?: string | null;
  shipment: {
    shippingMode?: 'manual' | 'provider';
    provider?: string | null;
    providerOrderCode?: string | null;
    providerStatus?: string | null;
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
