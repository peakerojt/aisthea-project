import { describe, expect, it } from 'vitest';

import { normalizeReturnStatus } from '@/common/utils/returnStatus';

describe('normalizeReturnStatus', () => {
  it('normalizes legacy aliases into canonical statuses', () => {
    expect(normalizeReturnStatus('PENDING_APPROVAL')).toBe('REQUESTED');
    expect(normalizeReturnStatus('COMPLETED')).toBe('REFUNDED');
  });

  it('normalizes casing and spacing for known statuses', () => {
    expect(normalizeReturnStatus(' pending approval ')).toBe('REQUESTED');
    expect(normalizeReturnStatus('completed')).toBe('REFUNDED');
    expect(normalizeReturnStatus('reCeived')).toBe('RECEIVED');
    expect(normalizeReturnStatus('return requested')).toBe('RETURN_REQUESTED');
  });
});
