import { describe, expect, it } from 'vitest';

import { normalizeRefundStatus } from '@/admin/services/refund.service';

describe('refund.service', () => {
  it('normalizes refund statuses for admin refund UI consumers', () => {
    expect(normalizeRefundStatus(' success ')).toBe('SUCCESS');
    expect(normalizeRefundStatus('failed')).toBe('FAILED');
    expect(normalizeRefundStatus('processing')).toBe('PROCESSING');
    expect(normalizeRefundStatus('')).toBe('PENDING');
  });
});

