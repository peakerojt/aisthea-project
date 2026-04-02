import { buildOrderSummaryRow, deriveCanonicalPaymentStatus } from '../order-contract';

describe('order-contract payment status naming', () => {
  it('emits PENDING_COD for COD orders without a settled payment', () => {
    expect(deriveCanonicalPaymentStatus([], 'COD')).toBe('PENDING_COD');
    expect(deriveCanonicalPaymentStatus([{ status: 'PENDING' }], 'COD')).toBe('PENDING_COD');
  });

  it('emits PENDING_VNPAY for VNPay orders that are still unpaid', () => {
    expect(deriveCanonicalPaymentStatus([], 'VNPAY')).toBe('PENDING_VNPAY');
    expect(deriveCanonicalPaymentStatus([{ status: 'PENDING' }], 'VNPAY')).toBe('PENDING_VNPAY');
  });

  it('normalizes drifted pending aliases before resolving canonical payment status', () => {
    expect(deriveCanonicalPaymentStatus([{ status: 'pending_vnpay' }], 'VNPAY')).toBe('PENDING_VNPAY');
    expect(deriveCanonicalPaymentStatus([{ status: 'cod-pending' }], 'COD')).toBe('PENDING_COD');
  });

  it('keeps settled payment outcomes above COD fallback', () => {
    expect(deriveCanonicalPaymentStatus([{ status: 'COMPLETED' }], 'COD')).toBe('PAID');
    expect(deriveCanonicalPaymentStatus([{ status: 'success' }], 'COD')).toBe('PAID');
    expect(deriveCanonicalPaymentStatus([{ status: 'REFUNDED' }], 'COD')).toBe('REFUNDED');
  });

  it('emits canonical cancelled and needs-review statuses for gateway edge cases', () => {
    expect(deriveCanonicalPaymentStatus([{ status: 'canceled' }], 'VNPAY')).toBe('CANCELLED');
    expect(deriveCanonicalPaymentStatus([{ status: 'needs_review' }], 'VNPAY')).toBe('NEEDS_REVIEW');
  });

  it('builds order summary rows with the canonical PENDING_COD value', () => {
    expect(
      buildOrderSummaryRow({
        orderId: 1,
        orderNumber: 'ORD-1',
        status: 'Pending',
        paymentMethod: 'COD',
        totalAmount: 100000,
        payments: [],
      }).paymentStatus,
    ).toBe('PENDING_COD');
  });

  it('builds order summary rows with the canonical PENDING_VNPAY value', () => {
    expect(
      buildOrderSummaryRow({
        orderId: 2,
        orderNumber: 'ORD-2',
        status: 'Pending',
        paymentMethod: 'VNPAY',
        totalAmount: 100000,
        payments: [],
      }).paymentStatus,
    ).toBe('PENDING_VNPAY');
  });
});
