import type { RefundWorkflowStatus } from '@/common/services/return.types';
import { resolveRefundTargetAmount, toNumericAmount } from '@/common/utils/returnAmounts';

const REFUND_WORKFLOW_STATUS_VALUES: RefundWorkflowStatus[] = [
  'NOT_APPLICABLE',
  'LOCKED_UNTIL_PAYMENT_CONFIRMED',
  'PENDING',
  'PROCESSING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'FAILED',
  'MANUAL_REVIEW',
];

export const normalizeRefundTransactionStatus = (status?: string | null) =>
  String(status ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

export const coerceRefundWorkflowStatus = (
  status?: string | null,
): RefundWorkflowStatus | undefined => {
  const normalized = String(status ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase() as RefundWorkflowStatus;

  return REFUND_WORKFLOW_STATUS_VALUES.includes(normalized) ? normalized : undefined;
};

export const deriveRefundStatusFromRecord = (record: {
  status?: string | null;
  totalRefundAmount?: string | number | null;
  refundableCapAmount?: string | number | null;
  refundTransactions?: Array<{ amount?: number | string | null; status?: string | null }>;
}): RefundWorkflowStatus => {
  const rawStatus = String(record.status ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
  const refunds = record.refundTransactions ?? [];
  const refundTargetAmount = resolveRefundTargetAmount(record);
  const completedRefunds = refunds.filter(
    (transaction) => normalizeRefundTransactionStatus(transaction.status) === 'COMPLETED',
  );
  const refundedAmount = completedRefunds.reduce(
    (sum, transaction) => sum + toNumericAmount(transaction.amount),
    0,
  );

  if (rawStatus === 'PENDING_PAYMENT_CONFIRMATION') {
    return 'LOCKED_UNTIL_PAYMENT_CONFIRMED';
  }

  if (
    refunds.some((transaction) => normalizeRefundTransactionStatus(transaction.status) === 'FAILED')
  ) {
    return 'FAILED';
  }

  if (
    refunds.some((transaction) => {
      const normalized = normalizeRefundTransactionStatus(transaction.status);
      return normalized === 'PENDING' || normalized === 'PROCESSING';
    })
  ) {
    return 'PROCESSING';
  }

  if (completedRefunds.length > 0) {
    if (refundTargetAmount > 0 && refundedAmount > 0 && refundedAmount < refundTargetAmount) {
      return 'PARTIALLY_REFUNDED';
    }

    return 'REFUNDED';
  }

  if (rawStatus === 'ACCEPTED_FOR_REFUND') {
    return 'PENDING';
  }

  if (rawStatus === 'CLOSED') {
    return 'REFUNDED';
  }

  return 'NOT_APPLICABLE';
};
