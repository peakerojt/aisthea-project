import { describe, expect, it } from 'vitest';

import {
  getAdminReturnStatusBadgeTone,
  getAdminReturnStatusLabel,
} from '@/admin/utils/adminReturn.utils';
import { normalizeReturnStatus } from '@/common/utils/returnStatus';

describe('adminReturn.utils', () => {
  const t = (key: string) => `translated:${key}`;

  it('normalizes legacy aliases into canonical statuses', () => {
    expect(normalizeReturnStatus('PENDING_APPROVAL')).toBe('REQUESTED');
    expect(normalizeReturnStatus('COMPLETED')).toBe('REFUNDED');
    expect(normalizeReturnStatus('APPROVED')).toBe('APPROVED');
  });

  it('renders canonical labels for legacy aliases', () => {
    expect(getAdminReturnStatusLabel('PENDING_APPROVAL', t)).toBe('translated:status.REQUESTED');
    expect(getAdminReturnStatusLabel('COMPLETED', t)).toBe('translated:status.REFUNDED');
  });

  it('falls back to readable canonical labels when translations are unavailable', () => {
    const rawKeyT = (key: string) => key;

    expect(getAdminReturnStatusLabel('PENDING_APPROVAL', rawKeyT)).toBe('Chờ duyệt');
    expect(getAdminReturnStatusLabel('COMPLETED', rawKeyT)).toBe('Đã hoàn tiền');
  });

  it('uses canonical tones for legacy aliases', () => {
    expect(getAdminReturnStatusBadgeTone('PENDING_APPROVAL')).toBe('warning');
    expect(getAdminReturnStatusBadgeTone('COMPLETED')).toBe('success');
  });
});
