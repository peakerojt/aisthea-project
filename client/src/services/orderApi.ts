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
  productId: string | null;
  sku: string;
  productName: string;
  variant: string;
  price: number;
  quantity: number;
  subtotal: number;
  thumbnail: string | null;
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
  const response = await httpClient.get<ApiResponse<OrderDetail>>(`/api/orders/${id}`);
  return response.data.data;
}

export async function cancelOrder(id: string): Promise<OrderDetail> {
  const response = await httpClient.patch<ApiResponse<OrderDetail>>(`/api/orders/${id}/cancel`);
  return response.data.data;
}

