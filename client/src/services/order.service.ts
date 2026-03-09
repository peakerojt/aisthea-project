import { api } from '../utils/api';

// ─────────────────────────────────────────────────────────────────────────────
// User-facing types (existing)
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderItem {
  orderItemId: number;
  productName: string;
  sku: string;
  variantName: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface OrderDetail {
  orderId: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  totalAmount: string;
  createdAt: string;
  trackingNumber?: string;
  carrier?: string;
  note?: string | null;
  shippingAddress: {
    recipientName: string;
    phone: string;
    city: string;
    district?: string;
    ward?: string;
    addressDetail: string;
  };
  items: OrderItem[];
  payments?: {
    paymentId: number;
    paymentMethod: string;
    amount: string;
    status: string;
    paymentDate?: string;
    transactionCode?: string;
    note?: string;
  }[];
  actionsAvailable?: {
    canPay?: boolean;
    canTrack?: boolean;
    canCancel?: boolean;
    canReorder?: boolean;
  };
  timeline?: {
    status: string;
    changedAt: string;
    note?: string | null;
  }[];
}

export interface MyOrdersResponse {
  orders: {
    orderId: number;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    totalAmount: string;
    createdAt: string;
    trackingNumber?: string;
    carrier?: string;
    itemCount: number;
  }[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Backward-compatible alias used by StoreMyOrders.tsx
export type Order = MyOrdersResponse['orders'][number];

// ─────────────────────────────────────────────────────────────────────────────
// Admin-facing types
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminOrder {
  orderId: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status: string;
  statusLabel: string;
  paymentStatus: string;
  paymentMethod?: string;
  totalAmount: string;
  createdAt: string;
  itemCount: number;
  user: {
    userId: number;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
  } | null;
}

export interface AdminOrderItem extends OrderItem {
  productId: number;
  image: string | null;
}

export interface AdminOrderDetail {
  orderId: number;
  orderNumber: string;
  status: string;
  statusLabel: string;
  paymentStatus: string;
  paymentMethod?: string;
  totalAmount: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
  trackingNumber?: string;
  carrier?: string;
  shippingAddress: {
    recipientName: string;
    phone: string;
    city: string;
    district?: string;
    addressDetail: string;
  };
  user: {
    userId: number;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
    phone?: string;
  } | null;
  items: AdminOrderItem[];
  payments: {
    paymentId: number;
    method: string;
    amount: string;
    status: string;
    paidAt?: string;
  }[];
  statusHistory: {
    status: string;
    oldStatus: string | null;
    statusLabel: string;
    changedAt: string;
    changedBy: number | null;
    note: string | null;
  }[];
}

export interface AdminOrdersResponse {
  orders: AdminOrder[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateStatusPayload {
  status: string;
  note?: string;
  carrier?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// User order service
// ─────────────────────────────────────────────────────────────────────────────

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
    const response = await api.get<{ data: MyOrdersResponse['orders']; meta?: MyOrdersResponse['pagination'] }>(`/api/orders/my${query ? `?${query}` : ''}`);
    return {
      orders: response.data || [],
      pagination: response.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    };
  },

  async getMyOrderDetail(orderId: number): Promise<OrderDetail> {
    return api.get<OrderDetail>(`/api/orders/my/${orderId}`);
  },

  async cancelMyOrder(orderId: number): Promise<OrderDetail> {
    return api.patch<OrderDetail>(`/api/orders/my/${orderId}/cancel`, {});
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin order service
// ─────────────────────────────────────────────────────────────────────────────

export const adminOrderService = {
  /**
   * Get paginated list of all orders with optional filters.
   */
  async getAll(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AdminOrdersResponse> {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') q.append('status', params.status);
    if (params?.page) q.append('page', params.page.toString());
    if (params?.pageSize) q.append('pageSize', params.pageSize.toString());
    if (params?.search) q.append('search', params.search);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    const query = q.toString();
    const response = await api.get<{ data: AdminOrder[]; meta?: AdminOrdersResponse['pagination'] }>(`/api/orders/admin${query ? `?${query}` : ''}`);
    return {
      orders: response.data || [],
      pagination: response.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    };
  },

  /**
   * Get full order detail including items with images, shipping, payments.
   */
  async getDetail(orderId: number): Promise<AdminOrderDetail> {
    return api.get<AdminOrderDetail>(`/api/orders/admin/${orderId}`);
  },

  /**
   * Update order status — backend validates the transition.
   */
  async updateStatus(
    orderId: number,
    payload: UpdateStatusPayload
  ): Promise<{ success: boolean; message: string; stockRestored: boolean }> {
    return api.patch(`/api/orders/${orderId}/status`, payload);
  },
};