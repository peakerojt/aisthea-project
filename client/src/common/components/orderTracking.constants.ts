export const ORDER_TRACKING_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PACKING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED_DELIVERY',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
] as const;

export type OrderTrackingStatus = (typeof ORDER_TRACKING_STATUSES)[number];

export const STATUS_LABEL: Record<OrderTrackingStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PACKING: 'Packing',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FAILED_DELIVERY: 'Failed delivery',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Return requested',
  RETURNED: 'Returned',
};

export const STATUS_COLOR_MAP: Record<OrderTrackingStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PACKING: 'bg-sky-100 text-sky-700',
  SHIPPED: 'bg-teal-100 text-teal-700',
  OUT_FOR_DELIVERY: 'bg-amber-100 text-amber-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  FAILED_DELIVERY: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURN_REQUESTED: 'bg-fuchsia-100 text-fuchsia-700',
  RETURNED: 'bg-rose-100 text-rose-700',
};
