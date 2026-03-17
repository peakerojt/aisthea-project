import { deriveOrderPaymentStatus, getOrderTrackingSummary, PaymentStatusLike, ShipmentLike } from './order-state';

type StatusHistoryLike = {
  status?: string | null;
  oldStatus?: string | null;
  changedAt?: Date | string | null;
  changedBy?: number | null;
  note?: string | null;
};

type OrderSummaryLike = {
  orderId: number;
  orderNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  status?: string | null;
  paymentMethod?: string | null;
  totalAmount?: { toString(): string } | string | number | null;
  createdAt?: Date | string | null;
  payments?: PaymentStatusLike[] | null;
  shipment?: ShipmentLike | null;
  _count?: {
    items?: number | null;
  } | null;
  user?: {
    userId: number;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
  } | null;
};

const ORDER_STATUS_ALIAS_MAP: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Processing',
  PACKING: 'Processing',
  PROCESSING: 'Processing',
  PAID: 'Processing',
  SHIPPING: 'Shipping',
  SHIPPED: 'Shipping',
  OUT_FOR_DELIVERY: 'Shipping',
  DELIVERED: 'Delivered',
  FAILED_DELIVERY: 'Shipping',
  CANCELLED: 'Cancelled',
  CANCELED: 'Cancelled',
  RETURN_REQUESTED: 'Return_Requested',
  RETURNED: 'Returned',
};

const normalizeKey = (value: string | null | undefined) =>
  (value ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const toIsoString = (value: Date | string | null | undefined) => {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
};

export function toCanonicalOrderStatus(status: string | null | undefined): string {
  const normalized = normalizeKey(status);
  return ORDER_STATUS_ALIAS_MAP[normalized] ?? (status?.trim() || 'Pending');
}

export function toCanonicalTrackingStatus(status: string | null | undefined): string {
  return normalizeKey(toCanonicalOrderStatus(status)) || 'PENDING';
}

export function deriveCanonicalPaymentStatus(
  payments: PaymentStatusLike[] | null | undefined,
  paymentMethod?: string | null,
): string {
  const normalizedStatuses = (payments ?? [])
    .map((payment) => normalizeKey(payment.status))
    .filter(Boolean);

  if (normalizedStatuses.some((status) => status === 'REFUNDED')) return 'REFUNDED';
  if (normalizedStatuses.some((status) => status === 'PARTIALLY_REFUNDED')) return 'PARTIALLY_REFUNDED';
  if (normalizedStatuses.some((status) => status === 'COMPLETED' || status === 'PAID' || status === 'SUCCESS')) return 'PAID';
  if (normalizedStatuses.some((status) => status === 'FAILED' || status === 'CANCELLED' || status === 'CANCELED' || status === 'DECLINED' || status === 'EXPIRED')) return 'FAILED';

  const method = normalizeKey(paymentMethod);
  if (method === 'COD') return 'COD_PENDING';

  if (normalizedStatuses.some((status) => status === 'PROCESSING' || status === 'VERIFYING')) return 'VERIFYING';
  if (normalizedStatuses.some((status) => status === 'PENDING')) return 'PENDING';

  const derived = normalizeKey(deriveOrderPaymentStatus(payments));
  if (derived === 'REFUNDED') return 'REFUNDED';
  if (derived === 'PARTIALLY_REFUNDED') return 'PARTIALLY_REFUNDED';
  if (derived === 'PAID' || derived === 'COMPLETED') return 'PAID';
  if (derived === 'FAILED') return 'FAILED';

  return 'PENDING';
}

export function buildCanonicalTimeline(
  statusHistory: StatusHistoryLike[] | null | undefined,
  createdAt?: Date | string | null,
) {
  const timeline = (statusHistory ?? []).map((entry) => ({
    status: toCanonicalOrderStatus(entry.status),
    timestamp: toIsoString(entry.changedAt),
    note: entry.note ?? null,
    changedBy: entry.changedBy ?? null,
    oldStatus: entry.oldStatus ? toCanonicalOrderStatus(entry.oldStatus) : null,
  }));

  const hasPending = timeline.some((entry) => normalizeKey(entry.status) === 'PENDING');
  if (!hasPending) {
    timeline.unshift({
      status: 'Pending',
      timestamp: toIsoString(createdAt),
      note: 'Order placed',
      changedBy: null,
      oldStatus: null,
    });
  }

  return timeline.sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
}

export function buildOrderSummaryRow(order: OrderSummaryLike) {
  const shipping = getOrderTrackingSummary(order.orderNumber, order.shipment);

  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    orderCode: order.orderNumber,
    trackingCode: shipping.trackingCode,
    customerName: order.customerName ?? null,
    customerPhone: order.customerPhone ?? null,
    status: toCanonicalOrderStatus(order.status),
    paymentStatus: deriveCanonicalPaymentStatus(order.payments, order.paymentMethod),
    paymentMethod: order.paymentMethod ?? null,
    totalAmount: order.totalAmount?.toString?.() ?? String(order.totalAmount ?? '0'),
    createdAt: order.createdAt ? toIsoString(order.createdAt) : null,
    itemCount: order._count?.items ?? 0,
    user: order.user
      ? {
          userId: order.user.userId,
          email: order.user.email,
          fullName: order.user.fullName,
          avatarUrl: order.user.avatarUrl ?? null,
        }
      : null,
  };
}
