import { prisma } from '../utils/prisma';

export class ReturnError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, status = 400, message = code) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const LEGACY_REFUND_WORKFLOW_STATUSES = [
  'NOT_APPLICABLE',
  'LOCKED_UNTIL_PAYMENT_CONFIRMED',
  'PENDING',
  'PROCESSING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'FAILED',
  'MANUAL_REVIEW',
] as const;

const normalizeWorkflowStatus = (value: unknown) => {
  const normalized = String(value ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

  return normalized || null;
};

const coerceRefundWorkflowStatus = (value: unknown) => {
  const normalized = normalizeWorkflowStatus(value);
  return normalized &&
    LEGACY_REFUND_WORKFLOW_STATUSES.includes(
      normalized as (typeof LEGACY_REFUND_WORKFLOW_STATUSES)[number],
    )
    ? normalized
    : undefined;
};

const deriveLegacyRefundStatus = (record: { refundStatus?: unknown; status?: unknown }) => {
  const explicitStatus = coerceRefundWorkflowStatus(record.refundStatus);
  if (explicitStatus) {
    return explicitStatus;
  }

  const workflowStatus = normalizeWorkflowStatus(record.status);
  if (workflowStatus === 'PENDING_PAYMENT_CONFIRMATION') {
    return 'LOCKED_UNTIL_PAYMENT_CONFIRMED';
  }

  if (workflowStatus === 'ACCEPTED_FOR_REFUND') {
    return 'PENDING';
  }

  if (
    workflowStatus === 'COMPLETED' ||
    workflowStatus === 'REFUNDED' ||
    workflowStatus === 'CLOSED'
  ) {
    return 'REFUNDED';
  }

  return 'NOT_APPLICABLE';
};

const bucketLegacyWorkflowStatus = (value: unknown) => {
  const workflowStatus = normalizeWorkflowStatus(value);
  if (
    workflowStatus === 'PENDING_APPROVAL' ||
    workflowStatus === 'REQUESTED' ||
    workflowStatus === 'SUBMITTED' ||
    workflowStatus === 'PENDING_PAYMENT_CONFIRMATION' ||
    workflowStatus === 'PENDING_ADMIN_REVIEW'
  ) {
    return 'REQUESTED';
  }

  if (workflowStatus === 'APPROVED' || workflowStatus === 'IN_RETURN_TRANSIT') {
    return 'APPROVED';
  }

  if (workflowStatus === 'REJECTED') {
    return 'REJECTED';
  }

  if (
    workflowStatus === 'RECEIVED' ||
    workflowStatus === 'RECEIVED_AND_INSPECTING' ||
    workflowStatus === 'ACCEPTED_FOR_REFUND'
  ) {
    return 'RECEIVED';
  }

  if (workflowStatus === 'COMPLETED' || workflowStatus === 'REFUNDED' || workflowStatus === 'CLOSED') {
    return 'REFUNDED';
  }

  return 'REQUESTED';
};

const canonicalizeLegacyWorkflowStatusForRead = (value: unknown) => {
  const normalized = normalizeWorkflowStatus(value);
  if (normalized === 'PENDING_APPROVAL') {
    return 'PENDING_ADMIN_REVIEW';
  }
  if (normalized === 'COMPLETED') {
    return 'CLOSED';
  }
  return normalized;
};

const canonicalizeLegacyReadWorkflow = <T extends Record<string, any>>(record: T) => ({
  ...record,
  workflowStatus: canonicalizeLegacyWorkflowStatusForRead(
    record.workflowStatus ?? record.status,
  ),
});

const parseProofImages = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

const enrichLegacyReadRecord = <T extends Record<string, any>>(record: T) => ({
  ...record,
  workflowStatus: record.workflowStatus ?? normalizeWorkflowStatus(record.status),
  refundStatus: deriveLegacyRefundStatus(record),
});

const enrichLegacyReadRecordWithStatusBucket = <T extends Record<string, any>>(record: T) => {
  const enriched = enrichLegacyReadRecord(record);
  return {
    ...enriched,
    statusBucket:
      enriched.statusBucket ?? bucketLegacyWorkflowStatus(enriched.workflowStatus ?? enriched.status),
  };
};

export async function getReturnForOrder(orderId: number) {
  const ret = await (prisma.orderReturn.findUnique as any)({
    where: { orderId },
  });

  if (!ret) return null;

  return canonicalizeLegacyReadWorkflow(
    enrichLegacyReadRecordWithStatusBucket({
      ...ret,
      proofImages: parseProofImages(ret.proofImages),
    }),
  );
}
