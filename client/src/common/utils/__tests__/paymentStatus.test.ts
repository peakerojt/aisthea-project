import { describe, expect, it } from 'vitest';
import { getPaymentMethodMeta, getPaymentStatusMeta } from '@/common/utils/paymentStatus';

describe('paymentStatus fallbacks', () => {
  it('returns Vietnamese fallback labels for refunded and verifying states', () => {
    expect(getPaymentStatusMeta('VNPAY', 'REFUNDED').defaultLabel).toBe('Đã hoàn tiền');
    expect(getPaymentStatusMeta('VNPAY', 'VERIFYING').defaultLabel).toBe('Đang xác nhận thanh toán');
  });

  it('returns Vietnamese fallback labels for payment methods', () => {
    expect(getPaymentMethodMeta('COD').defaultLabel).toBe('Thanh toán khi nhận hàng');
    expect(getPaymentMethodMeta('BANK_TRANSFER').defaultLabel).toBe('Chuyển khoản ngân hàng');
  });
});
