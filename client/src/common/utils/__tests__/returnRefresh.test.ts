import { describe, expect, it } from 'vitest';
import {
  shouldAutoRefreshRefundState,
  shouldRefreshOnVisibilityResume,
  shouldRunReturnPollingNow,
} from '@/common/utils/returnRefresh';

describe('returnRefresh', () => {
  it('treats active refund states as pollable', () => {
    expect(shouldAutoRefreshRefundState('pending')).toBe(true);
    expect(shouldAutoRefreshRefundState('PROCESSING')).toBe(true);
    expect(shouldAutoRefreshRefundState('manual-review')).toBe(true);
    expect(shouldAutoRefreshRefundState('LOCKED_UNTIL_PAYMENT_CONFIRMED')).toBe(true);
    expect(shouldAutoRefreshRefundState('FAILED')).toBe(false);
  });

  it('skips polling when the current document is hidden', () => {
    expect(shouldRunReturnPollingNow({ visibilityState: 'visible' })).toBe(true);
    expect(shouldRunReturnPollingNow({ visibilityState: 'hidden' })).toBe(false);
    expect(shouldRunReturnPollingNow(null)).toBe(true);
  });

  it('debounces visibility-resume refreshes right after a recent poll', () => {
    expect(
      shouldRefreshOnVisibilityResume({
        doc: { visibilityState: 'visible' },
        lastRefreshAt: 10_000,
        now: 10_200,
        minGapMs: 500,
      }),
    ).toBe(false);

    expect(
      shouldRefreshOnVisibilityResume({
        doc: { visibilityState: 'visible' },
        lastRefreshAt: 10_000,
        now: 10_600,
        minGapMs: 500,
      }),
    ).toBe(true);

    expect(
      shouldRefreshOnVisibilityResume({
        doc: { visibilityState: 'hidden' },
        lastRefreshAt: 0,
        now: 10_600,
        minGapMs: 500,
      }),
    ).toBe(false);
  });
});
