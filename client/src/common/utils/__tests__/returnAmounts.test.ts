import { describe, expect, it } from 'vitest';

import {
  resolveRefundTargetAmount,
  toNumericAmount,
} from '@/common/utils/returnAmounts';

describe('returnAmounts', () => {
  it('normalizes numeric-like values safely', () => {
    expect(toNumericAmount('125000')).toBe(125000);
    expect(toNumericAmount(Number.NaN)).toBe(0);
    expect(toNumericAmount('not-a-number')).toBe(0);
  });

  it('prefers refundableCapAmount over legacy totalRefundAmount', () => {
    expect(
      resolveRefundTargetAmount({
        refundableCapAmount: '80000',
        totalRefundAmount: '150000',
      }),
    ).toBe(80000);
  });

  it('falls back to legacy totalRefundAmount when cap is unavailable', () => {
    expect(
      resolveRefundTargetAmount({
        refundableCapAmount: null,
        totalRefundAmount: '50000',
      }),
    ).toBe(50000);
  });
});
