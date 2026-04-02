import { describe, expect, it } from 'vitest';
import {
  getPaymentMethodMeta,
  getPaymentStatusMeta,
  isCollectedPaymentStatus,
  normalizePaymentStatus,
} from '@/common/utils/paymentStatus';

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
    expect(getPaymentStatusMeta('VNPAY', 'canceled').canonicalStatus).toBe('CANCELLED');
    expect(getPaymentStatusMeta('VNPAY', 'needs_review').canonicalStatus).toBe('NEEDS_REVIEW');
  });

  it('normalizes drifted payment methods before resolving labels', () => {
    expect(getPaymentMethodMeta('bank-transfer').defaultLabel).toBe('Chuyển khoản ngân hàng');
    expect(getPaymentMethodMeta('vnpay').defaultLabel).toBe('VNPay');
  });

  it('exports shared payment-status normalization for payment return flows', () => {
    expect(normalizePaymentStatus(' completed ')).toBe('PAID');
    expect(normalizePaymentStatus('success')).toBe('PAID');
    expect(normalizePaymentStatus('processing')).toBe('VERIFYING');
    expect(normalizePaymentStatus('needs_review')).toBe('NEEDS_REVIEW');
    expect(normalizePaymentStatus('canceled')).toBe('CANCELLED');
    expect(normalizePaymentStatus('pending_cod')).toBe('PENDING_COD');
    expect(normalizePaymentStatus('cod-pending')).toBe('PENDING_COD');
    expect(normalizePaymentStatus('pending_vnpay')).toBe('PENDING_VNPAY');
    expect(normalizePaymentStatus('partial_refund')).toBe('PARTIALLY_REFUNDED');
    expect(normalizePaymentStatus('')).toBe('UNPAID');
  });

  it('exposes one collected-payment helper for refund/read-side consumers', () => {
    expect(isCollectedPaymentStatus('PAID')).toBe(true);
    expect(isCollectedPaymentStatus('success')).toBe(true);
    expect(isCollectedPaymentStatus('partial-refund')).toBe(true);
    expect(isCollectedPaymentStatus('processing')).toBe(false);
    expect(isCollectedPaymentStatus('pending_cod')).toBe(false);
  });

  it('treats explicit COD pending statuses consistently even without a payment method', () => {
    expect(getPaymentStatusMeta(undefined, 'PENDING_COD').canonicalStatus).toBe('PENDING_COD');
    expect(getPaymentStatusMeta(undefined, 'COD_PENDING').labelKey).toBe('paymentStatus.PENDING_COD');
  });

  it('treats explicit VNPay pending statuses as the generic pending display bucket', () => {
    expect(getPaymentStatusMeta(undefined, 'PENDING_VNPAY').canonicalStatus).toBe('PENDING_VNPAY');
    expect(getPaymentStatusMeta(undefined, 'PENDING_VNPAY').labelKey).toBe('paymentStatus.PENDING_VNPAY');
  });

  it('upgrades legacy generic VNPay pending aliases into the canonical VNPay bucket', () => {
    expect(getPaymentStatusMeta('VNPAY', 'PENDING').canonicalStatus).toBe('PENDING_VNPAY');
    expect(getPaymentStatusMeta('VNPAY', 'UNPAID').canonicalStatus).toBe('PENDING_VNPAY');
    expect(getPaymentStatusMeta('VNPAY', 'pending').labelKey).toBe('paymentStatus.PENDING_VNPAY');
  });

  it('keeps generic pending and unpaid buckets distinct from payment-method-specific pending states', () => {
    expect(getPaymentStatusMeta(undefined, 'PENDING').canonicalStatus).toBe('PENDING');
    expect(getPaymentStatusMeta(undefined, 'UNPAID').canonicalStatus).toBe('UNPAID');
  });

  it('renders dedicated labels for cancelled and needs-review payment states', () => {
    expect(getPaymentStatusMeta('VNPAY', 'CANCELLED').defaultLabel).toBe('Đã hủy thanh toán');
    expect(getPaymentStatusMeta('VNPAY', 'NEEDS_REVIEW').defaultLabel).toBe('Cần kiểm tra thanh toán');
  });
});
