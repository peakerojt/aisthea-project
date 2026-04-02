import { describe, expect, it } from 'vitest';

import {
  getAdminRefundStatusBadgeTone,
  getAdminRefundStatusLabel,
  getAdminReturnStatusBadgeTone,
  getAdminReturnStatusLabel,
} from '@/admin/utils/returns.utils';
import { normalizeReturnStatus } from '@/common/utils/returnStatus';

describe('adminReturn.utils', () => {
  const t = (key: string) => `translated:${key}`;

  it('normalizes legacy aliases into canonical statuses', () => {
    expect(normalizeReturnStatus('PENDING_APPROVAL')).toBe('REQUESTED');
    expect(normalizeReturnStatus('COMPLETED')).toBe('REFUNDED');
    expect(normalizeReturnStatus('APPROVED')).toBe('APPROVED');
  });

  it('renders canonical labels for legacy aliases', () => {
    expect(getAdminReturnStatusLabel('PENDING_APPROVAL', t)).toBe('translated:status.PENDING_ADMIN_REVIEW');
    expect(getAdminReturnStatusLabel('COMPLETED', t)).toBe('translated:status.CLOSED');
  });

  it('falls back to readable canonical labels when translations are unavailable', () => {
    const rawKeyT = (key: string) => key;

    expect(getAdminReturnStatusLabel('PENDING_APPROVAL', rawKeyT)).toBe('Chờ duyệt');
    expect(getAdminReturnStatusLabel('COMPLETED', rawKeyT)).toBe('Đã đóng');
  });

  it('uses canonical tones for legacy aliases', () => {
    expect(getAdminReturnStatusBadgeTone('PENDING_APPROVAL')).toBe('warning');
    expect(getAdminReturnStatusBadgeTone('COMPLETED')).toBe('success');
  });

  it('keeps admin labels and tones stable for Phase 5 status names', () => {
    expect(getAdminReturnStatusLabel('PENDING_ADMIN_REVIEW', t)).toBe('translated:status.PENDING_ADMIN_REVIEW');
    expect(getAdminReturnStatusLabel('IN_RETURN_TRANSIT', t)).toBe('translated:status.IN_RETURN_TRANSIT');
    expect(getAdminReturnStatusLabel('ACCEPTED_FOR_REFUND', t)).toBe('translated:status.ACCEPTED_FOR_REFUND');
    expect(getAdminReturnStatusLabel('CLOSED', t)).toBe('translated:status.CLOSED');

    expect(getAdminReturnStatusBadgeTone('PENDING_ADMIN_REVIEW')).toBe('warning');
    expect(getAdminReturnStatusBadgeTone('IN_RETURN_TRANSIT')).toBe('info');
    expect(getAdminReturnStatusBadgeTone('ACCEPTED_FOR_REFUND')).toBe('info');
    expect(getAdminReturnStatusBadgeTone('CLOSED')).toBe('success');
  });

  it('uses the shorter inspecting label when translations are unavailable', () => {
    const rawKeyT = (key: string) => key;

    expect(getAdminReturnStatusLabel('RECEIVED_AND_INSPECTING', rawKeyT)).toBe('Đang kiểm tra');
  });

  it('uses the shorter accepted-for-refund label when translations are unavailable', () => {
    const rawKeyT = (key: string) => key;

    expect(getAdminReturnStatusLabel('ACCEPTED_FOR_REFUND', rawKeyT)).toBe('Chấp nhận hoàn tiền');
  });

  it('renders refund workflow labels and tones with translation fallback', () => {
    expect(getAdminRefundStatusLabel('LOCKED_UNTIL_PAYMENT_CONFIRMED', t)).toBe(
      'translated:refundStatus.LOCKED_UNTIL_PAYMENT_CONFIRMED',
    );

    const rawKeyT = (key: string) => key;
    expect(getAdminRefundStatusLabel('PENDING', rawKeyT)).toBe('Chờ hoàn tiền');
    expect(getAdminRefundStatusLabel('PARTIALLY_REFUNDED', rawKeyT)).toBe('Hoàn tiền một phần');

    expect(getAdminRefundStatusBadgeTone('NOT_APPLICABLE')).toBe('default');
    expect(getAdminRefundStatusBadgeTone('LOCKED_UNTIL_PAYMENT_CONFIRMED')).toBe('warning');
    expect(getAdminRefundStatusBadgeTone('PROCESSING')).toBe('info');
    expect(getAdminRefundStatusBadgeTone('REFUNDED')).toBe('success');
    expect(getAdminRefundStatusBadgeTone('FAILED')).toBe('danger');
  });
});
