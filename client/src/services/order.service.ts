import { api } from '../utils/api';

export interface Order {
  orderId: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  createdAt: string;
  trackingNumber?: string;
  carrier?: string;
  itemCount: number;
}

export interface OrderDetail extends Order {
  paymentMethod?: string;
  shippingAddress: {
    recipientName: string;
    phone: string;
    city: string;
    district?: string;
    addressDetail: string;
  };
  items: OrderItem[];
}

export interface OrderItem {
  orderItemId: number;
  productName: string;
  sku: string;
  variantName: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface MyOrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const orderService = {
  async getMyOrders(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
  }): Promise<MyOrdersResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    const query = queryParams.toString();
    return api.get<MyOrdersResponse>(`/api/orders/my${query ? `?${query}` : ''}`);
  },

  async getMyOrderDetail(orderId: number): Promise<OrderDetail> {
    return api.get<OrderDetail>(`/api/orders/my/${orderId}`);
  }
};