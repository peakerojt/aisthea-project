export const SETTLED_PAYMENT_STATUSES = [
  'COMPLETED',
  'PAID',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;

export type SettledPaymentStatus = (typeof SETTLED_PAYMENT_STATUSES)[number];

const PAYMENT_STATUS_ALIASES: Record<string, string> = {
  COD_PENDING: 'PENDING_COD',
  SUCCESS: 'PAID',
  PARTIAL_REFUND: 'PARTIALLY_REFUNDED',
  CANCELED: 'CANCELLED',
};

export const normalizePaymentStatusKey = (status: string | null | undefined) => {
  const normalized = (status ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

  return PAYMENT_STATUS_ALIASES[normalized] ?? normalized;
};

export const isSettledPaymentStatus = (status: string | null | undefined): boolean =>
  SETTLED_PAYMENT_STATUSES.includes(
    normalizePaymentStatusKey(status) as SettledPaymentStatus,
  );
