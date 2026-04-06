import axios from 'axios';
import { orderApi } from '@/common/api/order.api';
import { API_BASE_URL } from '@/common/utils/api';
import i18n from '@/i18n/config';

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
  note?: string | null;
}

export interface OrderPricing {
  itemsTotal: number;
  shippingFee: number;
  discount: number;
  tax: number;
  grandTotal: number;
}

export interface OrderQuoteCoupon {
  couponId: number;
  code: string;
  type: string;
  value: number;
  maxDiscountAmount: number | null;
  minOrderValue: number;
}

export interface OrderQuote {
  itemsSubtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  shippingMethod: 'STANDARD' | 'EXPRESS';
  shippingCityCode: string | null;
  appliedCouponCode: string | null;
  coupon: OrderQuoteCoupon | null;
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
  trackingCode?: string;
  shippingMode?: 'manual' | 'provider';
  provider?: string | null;
  providerOrderCode?: string | null;
  providerStatus?: string | null;
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
    orderCode?: string;
    trackingCode?: string;
    status: string;
    paymentStatus: string;
    paymentMethod?: string;
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
  trackingCode?: string;
  shippingMode?: 'manual' | 'provider';
  provider?: string | null;
  providerOrderCode?: string | null;
  providerStatus?: string | null;
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
  deliveryProof?: {
    images: string[];
    reviewed: boolean;
  };
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
  refundSummary?: {
    totalCollected: number;
    totalRefunded: number;
    remainingRefundable: number;
  };
  pricing?: OrderPricing;
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

export type AdminOrderTabCounts = Record<string, number>;

export interface UpdateStatusPayload {
  status: string;
  note?: string;
  deliveryProofImages?: string[];
  deliveryProofReviewed?: boolean;
}

export interface CancelOrderPayload {
  reason?: string;
  note?: string;
}

export type DeliveryProofUploadProgress = {
  fileKey: string;
  fileName: string;
  percent: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
};

export type ReturnProofUploadProgress = DeliveryProofUploadProgress;

const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';
const DEFAULT_LANGUAGE = 'vi';

const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;
  const source = `; ${document.cookie}`;
  const parts = source.split(`; ${name}=`);
  if (parts.length !== 2) return undefined;
  return decodeURIComponent(parts.pop()!.split(';').shift() || '');
};

const getActiveLanguage = () => {
  const current = i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE;
  return current.split('-')[0] || DEFAULT_LANGUAGE;
};

export const createDeliveryProofFileKey = (file: File) =>
  `${file.name}::${file.size}::${file.lastModified}`;

const ensureCsrfToken = async () => {
  const existing = getCookie(CSRF_COOKIE_NAME);
  if (existing) return existing;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/csrf-token`, {
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as { data?: { csrfToken?: string } } | null;
      return getCookie(CSRF_COOKIE_NAME) || payload?.data?.csrfToken;
    }
  } catch {
    // Let the request fail naturally if the token still cannot be obtained.
  }

  return getCookie(CSRF_COOKIE_NAME);
};

const normalizePricing = (raw: any): OrderPricing => {
  if (raw?.pricing) {
    return raw.pricing;
  }

  const itemsTotal = Array.isArray(raw?.items)
    ? raw.items.reduce((sum: number, item: any) => {
      const unitPrice = parseFloat(item.unitPrice ?? item.price ?? '0');
      const quantity = Number(item.quantity ?? 0);
      return sum + unitPrice * quantity;
    }, 0)
    : parseFloat(raw?.totalAmount ?? '0') + parseFloat(raw?.discountAmount ?? '0');

  return {
    itemsTotal,
    shippingFee: parseFloat(raw?.shippingFee ?? '0'),
    discount: parseFloat(raw?.discountAmount ?? '0'),
    tax: 0,
    grandTotal: parseFloat(raw?.totalAmount ?? '0'),
  };
};


// ─────────────────────────────────────────────────────────────────────────────
// User order service
// ─────────────────────────────────────────────────────────────────────────────

export const orderService = {
  async fetchOrderDetail(id: string): Promise<any> {
    const response = await orderApi.getMyOrderDetail<any>(id);
    const raw = response.data ? response.data : response;
    return {
      ...raw,
      orderCode: raw.orderCode ?? raw.orderNumber,
      trackingCode: raw.trackingCode ?? raw.orderCode ?? raw.orderNumber,
      pricing: normalizePricing(raw),
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
        at: h.changedAt ?? h.timestamp ?? h.at ?? new Date().toISOString(),
        note: h.note ?? null,
      })) || (raw.timeline ?? []).map((entry: any) => ({
        status: entry.status,
        at: entry.timestamp ?? entry.changedAt ?? entry.at ?? new Date().toISOString(),
        note: entry.note ?? null,
      })),
    };
  },

  async cancelOrderUser(id: string, payload?: CancelOrderPayload): Promise<any> {
    const res = await orderApi.cancelOrder<any>(id, payload);
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
    const orders = (response.data || []).map((order: any) => ({
      ...order,
      orderCode: order.orderCode ?? order.orderNumber,
      trackingCode: order.trackingCode ?? order.orderCode ?? order.orderNumber,
      itemCount: order.itemCount ?? order._count?.items ?? order.items?.length ?? 0,
    }));
    return {
      orders,
      pagination: response.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    };
  },

  async getMyOrderDetail(orderId: number): Promise<OrderDetail> {
    const res = await orderApi.getMyOrderDetail<any>(orderId);
    const raw = res.data ? res.data : res;
    return {
      ...raw,
      orderCode: raw.orderCode ?? raw.orderNumber,
      trackingCode: raw.trackingCode ?? raw.orderCode ?? raw.orderNumber,
    };
  },

  async cancelMyOrder(orderId: number, payload?: CancelOrderPayload): Promise<OrderDetail> {
    const res = await orderApi.cancelMyOrder<any>(orderId, payload);
    return res.data ? res.data : res;
  },

  async uploadReturnProofImages(
    orderId: number,
    files: File[],
    onProgress?: (progress: ReturnProofUploadProgress) => void,
  ) {
    const uploadedImages: Array<{ url: string; width: number; height: number }> = [];
    const csrfToken = await ensureCsrfToken();
    const activeLanguage = getActiveLanguage();

    for (const file of files) {
      const fileKey = createDeliveryProofFileKey(file);

      onProgress?.({
        fileKey,
        fileName: file.name,
        percent: 0,
        status: 'pending',
      });

      const formData = new FormData();
      formData.append('files', file);

      try {
        const response = await axios.post<{
          success: boolean;
          data?: { images?: Array<{ url: string; width: number; height: number }> };
        }>(`${API_BASE_URL}/api/orders/${orderId}/return-proof-images`, formData, {
          withCredentials: true,
          headers: {
            'x-lang': activeLanguage,
            'accept-language': activeLanguage,
            ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
          },
          onUploadProgress: (event) => {
            const total = event.total || file.size || 1;
            const percent = Math.min(99, Math.round((event.loaded / total) * 100));

            onProgress?.({
              fileKey,
              fileName: file.name,
              percent,
              status: 'uploading',
            });
          },
        });

        const nextImages = response.data?.data?.images ?? [];
        uploadedImages.push(...nextImages);
        onProgress?.({
          fileKey,
          fileName: file.name,
          percent: 100,
          status: 'completed',
        });
      } catch (error) {
        onProgress?.({
          fileKey,
          fileName: file.name,
          percent: 100,
          status: 'failed',
        });
        throw error;
      }
    }

    return uploadedImages;
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
    sort?: string;
  }): Promise<AdminOrdersResponse> {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') q.append('status', params.status);
    if (params?.page) q.append('page', params.page.toString());
    if (params?.pageSize) q.append('pageSize', params.pageSize.toString());
    if (params?.search) q.append('search', params.search);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    if (params?.sort) q.append('sort', params.sort);
    const query = q.toString();

    const response = await orderApi.getAdminOrders<AdminOrder[]>(query ? `?${query}` : '');
    return {
      orders: response.data || [],
      pagination: response.meta || { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    };
  },

  async getTabCounts(params?: {
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AdminOrderTabCounts> {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);

    const query = q.toString();
    const response = await orderApi.getAdminOrderTabCounts(query ? `?${query}` : '');
    return response.data || {};
  },

  /**
   * Get full order detail including items with images, shipping, payments.
   */
  async getDetail(orderId: number): Promise<AdminOrderDetail> {
    const raw = await orderApi.getAdminOrderDetail<any>(orderId);
    return {
      ...raw,
      trackingCode: raw.trackingCode ?? raw.orderCode ?? raw.orderNumber,
      deliveryProof: raw.deliveryProof ?? { images: [], reviewed: false },
    };
  },

  async uploadDeliveryProofImages(
    orderId: number,
    files: File[],
    onProgress?: (progress: DeliveryProofUploadProgress) => void,
  ) {
    const uploadedImages: Array<{ url: string; width: number; height: number }> = [];
    const csrfToken = await ensureCsrfToken();
    const activeLanguage = getActiveLanguage();

    for (const file of files) {
      const fileKey = createDeliveryProofFileKey(file);

      onProgress?.({
        fileKey,
        fileName: file.name,
        percent: 0,
        status: 'pending',
      });

      const formData = new FormData();
      formData.append('files', file);

      try {
        const response = await axios.post<{
          success: boolean;
          data?: { images?: Array<{ url: string; width: number; height: number }> };
        }>(`${API_BASE_URL}/api/orders/${orderId}/delivery-proof-images`, formData, {
          withCredentials: true,
          headers: {
            'x-lang': activeLanguage,
            'accept-language': activeLanguage,
            ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
          },
          onUploadProgress: (event) => {
            const total = event.total || file.size || 1;
            const percent = Math.min(99, Math.round((event.loaded / total) * 100));

            onProgress?.({
              fileKey,
              fileName: file.name,
              percent,
              status: 'uploading',
            });
          },
        });

        const nextImages = response.data?.data?.images ?? [];
        uploadedImages.push(...nextImages);
        onProgress?.({
          fileKey,
          fileName: file.name,
          percent: 100,
          status: 'completed',
        });
      } catch (error) {
        onProgress?.({
          fileKey,
          fileName: file.name,
          percent: 100,
          status: 'failed',
        });
        throw error;
      }
    }

    return uploadedImages;
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
