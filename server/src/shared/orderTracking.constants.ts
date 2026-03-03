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

export const ORDER_STATUS_TRANSITION_MAP: Record<OrderTrackingStatus, OrderTrackingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKING', 'CANCELLED'],
  PACKING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'FAILED_DELIVERY', 'RETURN_REQUESTED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_DELIVERY', 'RETURN_REQUESTED'],
  DELIVERED: ['RETURN_REQUESTED'],
  FAILED_DELIVERY: ['OUT_FOR_DELIVERY', 'CANCELLED', 'RETURN_REQUESTED'],
  CANCELLED: [],
  RETURN_REQUESTED: ['RETURNED'],
  RETURNED: [],
};

export const STATUS_COLOR_MAP: Record<OrderTrackingStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PACKING: 'bg-indigo-100 text-indigo-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  OUT_FOR_DELIVERY: 'bg-amber-100 text-amber-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  FAILED_DELIVERY: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  RETURN_REQUESTED: 'bg-fuchsia-100 text-fuchsia-700',
  RETURNED: 'bg-red-100 text-red-700',
};

export function canTransition(from: string, to: string): boolean {
  const fromStatus = from as OrderTrackingStatus;
  const toStatus = to as OrderTrackingStatus;
  return ORDER_STATUS_TRANSITION_MAP[fromStatus]?.includes(toStatus) ?? false;
}
