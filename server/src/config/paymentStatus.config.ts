export const SETTLED_PAYMENT_STATUSES = [
  'COMPLETED',
  'PAID',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;

export type SettledPaymentStatus = (typeof SETTLED_PAYMENT_STATUSES)[number];

export const normalizePaymentStatusKey = (status: string | null | undefined) =>
  (status ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

export const isSettledPaymentStatus = (status: string | null | undefined): boolean =>
  SETTLED_PAYMENT_STATUSES.includes(
    normalizePaymentStatusKey(status) as SettledPaymentStatus,
  );
