import { describe, expect, it } from 'vitest';

import { deriveRefundStatusFromRecord } from '@/common/services/return.refund-status';

describe('return refund status helpers', () => {
  it('prefers refundableCapAmount over legacy totalRefundAmount when deriving completed refund state', () => {
    expect(
      deriveRefundStatusFromRecord({
        status: 'ACCEPTED_FOR_REFUND',
        totalRefundAmount: '150000',
        refundableCapAmount: '80000',
        refundTransactions: [{ amount: 80000, status: 'COMPLETED' }],
      }),
    ).toBe('REFUNDED');
  });
});
