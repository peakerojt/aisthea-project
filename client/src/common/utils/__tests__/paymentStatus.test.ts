import { describe, expect, it } from 'vitest';
import { getPaymentMethodMeta, getPaymentStatusMeta, normalizePaymentStatus } from '@/common/utils/paymentStatus';

describe('paymentStatus fallbacks', () => {
  it('returns Vietnamese fallback labels for refunded and verifying states', () => {
    expect(getPaymentStatusMeta('VNPAY', 'REFUNDED').defaultLabel).toBe('Đã hoàn tiền');
    expect(getPaymentStatusMeta('VNPAY', 'VERIFYING').defaultLabel).toBe('Đang xác nhận thanh toán');
  });

  it('returns Vietnamese fallback labels for payment methods', () => {
    expect(getPaymentMethodMeta('COD').defaultLabel).toBe('Thanh toán khi nhận hàng');
    expect(getPaymentMethodMeta('BANK_TRANSFER').defaultLabel).toBe('Chuyển khoản ngân hàng');
  });

  it('normalizes drifted payment statuses to canonical refund/payment labels', () => {
    expect(getPaymentStatusMeta('VNPAY', 'completed').canonicalStatus).toBe('PAID');
    expect(getPaymentStatusMeta('VNPAY', 'partially-refunded').canonicalStatus).toBe('PARTIALLY_REFUNDED');
    expect(getPaymentStatusMeta('VNPAY', 'partially-refunded').defaultLabel).toBe('Hoàn tiền một phần');
  });

  it('normalizes drifted payment methods before resolving labels', () => {
    expect(getPaymentMethodMeta('bank-transfer').defaultLabel).toBe('Chuyển khoản ngân hàng');
    expect(getPaymentMethodMeta('vnpay').defaultLabel).toBe('VNPay');
  });

  it('exports shared payment-status normalization for payment return flows', () => {
    expect(normalizePaymentStatus(' completed ')).toBe('PAID');
    expect(normalizePaymentStatus('processing')).toBe('VERIFYING');
    expect(normalizePaymentStatus('')).toBe('UNPAID');
  });
});
