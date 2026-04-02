import { deriveOrderPaymentStatus } from '../order-state';

describe('order-state payment normalization', () => {
  it('treats settled aliases as paid', () => {
    expect(deriveOrderPaymentStatus([{ status: 'success' }])).toBe('PAID');
    expect(deriveOrderPaymentStatus([{ status: 'partial_refund' }])).toBe('PARTIALLY_REFUNDED');
  });

  it('normalizes cancelled and manual-review aliases into stable buckets', () => {
    expect(deriveOrderPaymentStatus([{ status: 'canceled' }])).toBe('CANCELLED');
    expect(deriveOrderPaymentStatus([{ status: 'needs_review' }])).toBe('NEEDS_REVIEW');
  });

  it('treats payment-method-specific pending aliases as pending', () => {
    expect(deriveOrderPaymentStatus([{ status: 'pending_cod' }])).toBe('PENDING');
    expect(deriveOrderPaymentStatus([{ status: 'pending_vnpay' }])).toBe('PENDING');
    expect(deriveOrderPaymentStatus([{ status: 'verifying' }])).toBe('PENDING');
  });
});
