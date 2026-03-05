import { httpClient } from './httpClient';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipping'
  | 'delivered'
  | 'cancelled'
  | 'canceled'
  | 'returned'
  | 'failed'
  | string;

export interface OrderTimelineItem {
  status: OrderStatus;
  at: string;
}

export interface OrderItem {
  orderItemId: number;
  productId: string | null;
  variantId: number | null;       // needed for "Mua lại"
  sku: string;
  productName: string;
  variant: string;
  price: number;
  quantity: number;
  subtotal: number;
  thumbnail: string | null;
  thumbnailUrl?: string | null;
  variantName?: string;
  isReviewed: boolean;
  reviewId: number | null;
}

export interface OrderPricing {
  itemsTotal: number;
  shippingFee: number;
  discount: number;
  tax: number;
  grandTotal: number;
}

export interface OrderDetail {
  id: string;
  orderCode: string;
  status: OrderStatus;
  paymentMethod: string | null;
  paymentStatus: string | null;
  createdAt: string | null;
  customer: {
    name: string;
    phone: string;
    email: string | null;
  };
  shippingAddress: {
    recipientName: string;
    recipientPhone: string;
    addressLine: string;
    ward: string | null;
    district: string | null;
    city: string;
  };
  items: OrderItem[];
  pricing: OrderPricing;
  timeline: OrderTimelineItem[];
  note: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function fetchOrderDetail(id: string): Promise<OrderDetail> {
  // getMyOrderDetail returns the order object directly (not wrapped in {success, data})
  const response = await httpClient.get<OrderDetail>(`/api/orders/my/${id}`);
  const raw = response.data as any;
  // Map backend field names (thumbnailUrl, variantName) → OrderItem canonical shape
  return {
    ...raw,
    pricing: raw.pricing || {
      itemsTotal: parseFloat(raw.totalAmount ?? '0') + parseFloat(raw.discountAmount ?? '0'),
      shippingFee: 0,
      discount: parseFloat(raw.discountAmount ?? '0'),
      tax: 0,
      grandTotal: parseFloat(raw.totalAmount ?? '0'),
    },
    items: (raw.items ?? []).map((item: any) => ({
      ...item,
      variantId: item.variantId ?? null,
      thumbnail: item.thumbnailUrl ?? item.thumbnail ?? null,
      variant: item.variantName ?? item.variant ?? '',
      price: parseFloat(item.unitPrice ?? item.price ?? '0'),
      subtotal: parseFloat(item.lineTotal ?? item.subtotal ?? '0'),
    })),
    timeline: (raw.statusHistory ?? raw.timeline ?? []).map((h: any) => ({
      status: h.status,
      at: h.changedAt ?? h.at,
    })),
  };
}

export async function cancelOrder(id: string): Promise<OrderDetail> {
  const response = await httpClient.patch<ApiResponse<OrderDetail>>(`/api/orders/${id}/cancel`);
  return response.data.data;
}

export async function confirmReceipt(id: string): Promise<{ success: boolean; newStatus: string }> {
  const response = await httpClient.patch<{ success: boolean; newStatus: string }>(`/api/orders/${id}/confirm-receipt`);
  return response.data;
}
