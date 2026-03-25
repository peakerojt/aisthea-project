import {
  SETTLED_PAYMENT_STATUSES,
  isSettledPaymentStatus,
  normalizePaymentStatusKey,
} from '../paymentStatus.config';

describe('paymentStatus.config', () => {
  it('defines the settled payment statuses used by payment confirmation flows', () => {
    expect(SETTLED_PAYMENT_STATUSES).toEqual([
      'COMPLETED',
      'PAID',
      'REFUNDED',
      'PARTIALLY_REFUNDED',
    ]);
  });

  it('normalizes drifted payment status keys', () => {
    expect(normalizePaymentStatusKey(' paid ')).toBe('PAID');
    expect(normalizePaymentStatusKey('partially-refunded')).toBe('PARTIALLY_REFUNDED');
  });

  it('checks whether a payment status should be treated as settled', () => {
    expect(isSettledPaymentStatus('COMPLETED')).toBe(true);
    expect(isSettledPaymentStatus(' refunded ')).toBe(true);
    expect(isSettledPaymentStatus('processing')).toBe(false);
  });
});
