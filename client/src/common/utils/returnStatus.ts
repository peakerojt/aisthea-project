import type {
  RawReturnStatus,
  RawReturnWorkflowStatus,
  ReturnStatusBucket,
} from '@/common/services/return.types';

export const normalizeWorkflowStatusValue = (
  status?: RawReturnWorkflowStatus | RawReturnStatus | null,
) =>
  String(status ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase() || 'REQUESTED';

export const canonicalizeWorkflowStatusFallback = (
  status?: RawReturnWorkflowStatus | RawReturnStatus | null,
) => {
  const normalized = normalizeWorkflowStatusValue(status);
  if (normalized === 'PENDING_APPROVAL') {
    return 'PENDING_ADMIN_REVIEW';
  }
  if (normalized === 'COMPLETED') {
    return 'CLOSED';
  }
  return normalized;
};

export const resolveWorkflowStatus = (
  workflowStatus?: RawReturnWorkflowStatus | null,
  fallbackStatus?: RawReturnStatus | null,
) =>
  workflowStatus
    ? canonicalizeWorkflowStatusFallback(workflowStatus)
    : canonicalizeWorkflowStatusFallback(fallbackStatus);

export const bucketReturnStatus = (
  status?: RawReturnWorkflowStatus | RawReturnStatus | null,
): ReturnStatusBucket => {
  const normalized = normalizeWorkflowStatusValue(status);

  if (!normalized) return 'REQUESTED';
  if (
    normalized === 'PENDING_APPROVAL' ||
    normalized === 'REQUESTED' ||
    normalized === 'SUBMITTED' ||
    normalized === 'PENDING_PAYMENT_CONFIRMATION' ||
    normalized === 'PENDING_ADMIN_REVIEW'
  ) {
    return 'REQUESTED';
  }
  if (normalized === 'APPROVED') return 'APPROVED';
  if (normalized === 'IN_RETURN_TRANSIT') return 'APPROVED';
  if (normalized === 'REJECTED') return 'REJECTED';
  if (
    normalized === 'RECEIVED' ||
    normalized === 'RECEIVED_AND_INSPECTING' ||
    normalized === 'ACCEPTED_FOR_REFUND'
  ) {
    return 'RECEIVED';
  }
  if (normalized === 'COMPLETED' || normalized === 'REFUNDED' || normalized === 'CLOSED') {
    return 'REFUNDED';
  }
  return 'REQUESTED';
};

export const normalizeReturnStatus = bucketReturnStatus;
