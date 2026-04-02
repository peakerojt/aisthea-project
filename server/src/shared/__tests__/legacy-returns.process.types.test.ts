import {
  LEGACY_FINANCE_PROCESS_ACTIONS,
  LEGACY_NATIVE_PROCESS_ACTIONS,
  LEGACY_PROCESS_ACTIONS,
  isLegacyFinanceProcessAction,
  isLegacyNativeProcessAction,
  isLegacyProcessAction,
} from '../legacy-returns.process.types';

describe('legacy-returns.process.types', () => {
  it('keeps the compatibility action inventory stable', () => {
    expect(LEGACY_PROCESS_ACTIONS).toEqual([
      'APPROVE',
      'REJECT',
      'MARK_IN_TRANSIT',
      'MARK_RECEIVED',
      'ACCEPT_FOR_REFUND',
      'SET_REFUND_PENDING',
      'SET_REFUND_PROCESSING',
      'SET_REFUND_FAILED',
      'SET_REFUND_MANUAL_REVIEW',
      'COMPLETE_REFUND',
    ]);
    expect(LEGACY_NATIVE_PROCESS_ACTIONS).toEqual([
      'APPROVE',
      'REJECT',
      'COMPLETE_REFUND',
    ]);
    expect(LEGACY_FINANCE_PROCESS_ACTIONS).toEqual([
      'SET_REFUND_PENDING',
      'SET_REFUND_PROCESSING',
      'SET_REFUND_FAILED',
      'SET_REFUND_MANUAL_REVIEW',
      'COMPLETE_REFUND',
    ]);
  });

  it('recognizes compatibility action buckets via shared guards', () => {
    expect(isLegacyProcessAction('approve')).toBe(true);
    expect(isLegacyProcessAction('SET_REFUND_PROCESSING')).toBe(true);
    expect(isLegacyProcessAction('INVALID')).toBe(false);

    expect(isLegacyNativeProcessAction('COMPLETE_REFUND')).toBe(true);
    expect(isLegacyNativeProcessAction('MARK_RECEIVED')).toBe(false);

    expect(isLegacyFinanceProcessAction('SET_REFUND_FAILED')).toBe(true);
    expect(isLegacyFinanceProcessAction('APPROVE')).toBe(false);
  });
});
