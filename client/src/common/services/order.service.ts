import { orderApi } from '@/common/api/order.api';

// ─────────────────────────────────────────────────────────────────────────────
// User-facing types
// ─────────────────────────────────────────────────────────────────────────────





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

export interface OrderPricing {
  itemsTotal: number;
  shippingFee: number;
  discount: number;
  tax: number;
  grandTotal: number;
}

export interface OrderItem {
  orderItemId: number;
  productId: string | null;
  productName: string;
  sku: string;
  variantId?: number | null;
  variantName?: string;
  variant?: string;
  unitPrice: string;
  price?: number;
  quantity: number;
  lineTotal: string;
  subtotal?: number;
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
  isReviewed?: boolean;
  reviewId?: number | null;
}

export interface OrderDetail {
  orderId: number;
  orderNumber: string;
  orderCode?: string; // used by some storefront components
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
    recipientPhone?: string; // mapped backwards compatible
    phone: string;
    city: string;
    district?: string;
    ward?: string;
    addressDetail: string;
    addressLine?: string; // mapped backwards compatible
  };
  pricing?: OrderPricing;
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

// Backward-compatible alias used by MyOrders.tsx
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
  productId: string | null;
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
  async fetchOrderDetail(id: string): Promise<any> {
    const response = await orderApi.getMyOrderDetail<any>(id);
    const raw = response.data ? response.data : response;
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
        productId: item.productId ?? null,
        thumbnailUrl: item.thumbnailUrl ?? item.thumbnail ?? null,
        variantName: item.variantName ?? item.variant ?? '',
        price: parseFloat(item.unitPrice ?? item.price ?? '0'),
        subtotal: parseFloat(item.lineTotal ?? item.subtotal ?? '0'),
      })),
      timeline: raw.statusHistory?.map((h: any) => ({
        status: h.status,
        at: h.changedAt ?? h.at ?? new Date().toISOString(),
      })) || raw.timeline || [],
    };
  },

  async cancelOrderUser(id: string): Promise<any> {
    const res = await orderApi.cancelOrder<any>(id);
    return res.data ? res.data : res;
  },

  async confirmReceipt(id: string): Promise<any> {
    return orderApi.confirmReceipt(id);
  },


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

    const response = await orderApi.getMyOrders(query ? `?${query}` : '');
    return {
      orders: response.data || [],
      pagination: response.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    };
  },

  async getMyOrderDetail(orderId: number): Promise<OrderDetail> {
    const res = await orderApi.getMyOrderDetail<any>(orderId);
    return res.data ? res.data : res;
  },

  async cancelMyOrder(orderId: number): Promise<OrderDetail> {
    const res = await orderApi.cancelMyOrder<any>(orderId);
    return res.data ? res.data : res;
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

    const response = await orderApi.getAdminOrders<AdminOrder[]>(query ? `?${query}` : '');
    return {
      orders: response.data || [],
      pagination: response.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    };
  },

  /**
   * Get full order detail including items with images, shipping, payments.
   */
  async getDetail(orderId: number): Promise<AdminOrderDetail> {
    return orderApi.getAdminOrderDetail<AdminOrderDetail>(orderId);
  },

  /**
   * Update order status — backend validates the transition.
   */
  async updateStatus(
    orderId: number,
    payload: UpdateStatusPayload
  ): Promise<{ success: boolean; message: string; stockRestored: boolean }> {
    return orderApi.updateOrderStatus(orderId, payload);
  },
};
