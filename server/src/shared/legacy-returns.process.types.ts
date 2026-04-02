export type LegacyReviewAction = 'APPROVE' | 'REJECT';
export type LegacyWarehouseAction = 'MARK_IN_TRANSIT' | 'MARK_RECEIVED' | 'ACCEPT_FOR_REFUND';
export type LegacyRefundStatusAction =
  | 'SET_REFUND_PENDING'
  | 'SET_REFUND_PROCESSING'
  | 'SET_REFUND_FAILED'
  | 'SET_REFUND_MANUAL_REVIEW';
export type LegacyRefundCompletionAction = 'COMPLETE_REFUND';

export type LegacyNativeProcessAction = LegacyReviewAction | LegacyRefundCompletionAction;
export type LegacyProcessAction =
  | LegacyReviewAction
  | LegacyWarehouseAction
  | LegacyRefundStatusAction
  | LegacyRefundCompletionAction;

export const LEGACY_REVIEW_PROCESS_ACTIONS = ['APPROVE', 'REJECT'] as const;
export const LEGACY_WAREHOUSE_PROCESS_ACTIONS = [
  'MARK_IN_TRANSIT',
  'MARK_RECEIVED',
  'ACCEPT_FOR_REFUND',
] as const;
export const LEGACY_REFUND_STATUS_PROCESS_ACTIONS = [
  'SET_REFUND_PENDING',
  'SET_REFUND_PROCESSING',
  'SET_REFUND_FAILED',
  'SET_REFUND_MANUAL_REVIEW',
] as const;
export const LEGACY_REFUND_COMPLETION_PROCESS_ACTIONS = ['COMPLETE_REFUND'] as const;

export const LEGACY_NATIVE_PROCESS_ACTIONS = [
  ...LEGACY_REVIEW_PROCESS_ACTIONS,
  ...LEGACY_REFUND_COMPLETION_PROCESS_ACTIONS,
] as const satisfies readonly LegacyNativeProcessAction[];

export const LEGACY_FINANCE_PROCESS_ACTIONS = [
  ...LEGACY_REFUND_STATUS_PROCESS_ACTIONS,
  ...LEGACY_REFUND_COMPLETION_PROCESS_ACTIONS,
] as const satisfies readonly (LegacyRefundStatusAction | LegacyRefundCompletionAction)[];

export const LEGACY_PROCESS_ACTIONS = [
  ...LEGACY_REVIEW_PROCESS_ACTIONS,
  ...LEGACY_WAREHOUSE_PROCESS_ACTIONS,
  ...LEGACY_REFUND_STATUS_PROCESS_ACTIONS,
  ...LEGACY_REFUND_COMPLETION_PROCESS_ACTIONS,
] as const satisfies readonly LegacyProcessAction[];

const LEGACY_PROCESS_ACTION_SET = new Set<string>(LEGACY_PROCESS_ACTIONS);
const LEGACY_NATIVE_PROCESS_ACTION_SET = new Set<string>(LEGACY_NATIVE_PROCESS_ACTIONS);
const LEGACY_FINANCE_PROCESS_ACTION_SET = new Set<string>(LEGACY_FINANCE_PROCESS_ACTIONS);

export const isLegacyProcessAction = (value: unknown): value is LegacyProcessAction =>
  LEGACY_PROCESS_ACTION_SET.has(String(value ?? '').trim().toUpperCase());

export const isLegacyNativeProcessAction = (value: unknown): value is LegacyNativeProcessAction =>
  LEGACY_NATIVE_PROCESS_ACTION_SET.has(String(value ?? '').trim().toUpperCase());

export const isLegacyFinanceProcessAction = (
  value: unknown,
): value is LegacyRefundStatusAction | LegacyRefundCompletionAction =>
  LEGACY_FINANCE_PROCESS_ACTION_SET.has(String(value ?? '').trim().toUpperCase());
