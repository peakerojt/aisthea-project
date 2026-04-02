import { describe, expect, it } from 'vitest';
import { resolveExpectedRefundEconomics } from '@/common/utils/returnEconomics';

describe('resolveExpectedRefundEconomics', () => {
  it('prefers refundableCapAmount when available', () => {
    expect(
      resolveExpectedRefundEconomics({
        totalRefundAmount: '150000',
        refundableCapAmount: '80000',
      }),
    ).toEqual({
      expectedRefundAmount: 80000,
      legacyTotalRefundAmount: 150000,
      hasRefundableCap: true,
      showsRefundCapAdjustment: true,
    });
  });

  it('falls back to totalRefundAmount for legacy records without cap', () => {
    expect(
      resolveExpectedRefundEconomics({
        totalRefundAmount: '50000',
        refundableCapAmount: null,
      }),
    ).toEqual({
      expectedRefundAmount: 50000,
      legacyTotalRefundAmount: 50000,
      hasRefundableCap: false,
      showsRefundCapAdjustment: false,
    });
  });
});
