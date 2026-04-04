import { returnApi } from '@/common/api/return.api';
import type {
  RawReturnStatus,
  RawReturnWorkflowStatus,
  RefundWorkflowStatus,
  ReturnRequestDetail,
  ReturnRequestStatusLog,
} from '@/common/services/return.types';
import {
  coerceRefundWorkflowStatus,
  deriveRefundStatusFromRecord,
} from '@/common/services/return.refund-status';
import { normalizeRefundTransactionMethod } from '@/common/services/return.refund-transaction';
import {
  bucketReturnStatus,
  normalizeReturnStatus,
  normalizeWorkflowStatusValue,
  resolveWorkflowStatus,
} from '@/common/utils/returnStatus';

type DetailRecord = ReturnRequestDetail & {
  status: RawReturnStatus;
  workflowStatus?: RawReturnWorkflowStatus | null;
  refundStatus?: string | null;
  financeNote?: string | null;
  financeNoteUpdatedAt?: string | null;
  financeNoteUpdatedBy?: {
    userId?: number;
    fullName?: string | null;
  } | null;
  totalRefundAmount?: string | number | null;
  refundableCapAmount?: string | number | null;
  refundTransactions?: Array<{ amount?: number | null; status?: string | null; method?: string | null }>;
  statusLogs?: ReturnRequestStatusLog[];
};

const deriveRefundStatus = (record: DetailRecord): RefundWorkflowStatus =>
  deriveRefundStatusFromRecord(record);

const resolveRefundStatus = (record: DetailRecord): RefundWorkflowStatus =>
  coerceRefundWorkflowStatus(record.refundStatus) ?? deriveRefundStatus(record);

const normalizeStatusLogRecord = (log: ReturnRequestStatusLog): ReturnRequestStatusLog => ({
  ...log,
  fromWorkflowStatus: log.fromStatus || log.fromWorkflowStatus
    ? resolveWorkflowStatus(log.fromWorkflowStatus, log.fromStatus)
    : null,
  toWorkflowStatus: resolveWorkflowStatus(log.toWorkflowStatus, log.toStatus),
  fromStatus: log.fromStatus ? normalizeReturnStatus(log.fromStatus) : log.fromStatus,
  toStatus: normalizeReturnStatus(log.toStatus),
});

const mapReturnDetailRecord = (record: DetailRecord): ReturnRequestDetail => ({
  ...record,
  status: normalizeWorkflowStatusValue(record.status),
  statusBucket: record.statusBucket ?? bucketReturnStatus(record.workflowStatus ?? record.status),
  workflowStatus: resolveWorkflowStatus(record.workflowStatus, record.status),
  refundStatus: resolveRefundStatus(record),
  financeNote: record.financeNote ?? null,
  financeNoteUpdatedAt: record.financeNoteUpdatedAt ?? null,
  financeNoteUpdatedBy: record.financeNoteUpdatedBy ?? null,
  bankInfo: record.bankInfo ?? null,
  bankInfoRequestedAt: record.bankInfoRequestedAt ?? null,
  bankInfoSubmittedAt: record.bankInfoSubmittedAt ?? null,
  refundCompletedAt: record.refundCompletedAt ?? null,
  refundBenefit: record.refundBenefit ?? null,
  refundTransactions: record.refundTransactions?.map((transaction) => ({
    ...transaction,
    method: normalizeRefundTransactionMethod(transaction.method),
  })),
  refundPayoutProofs: record.refundPayoutProofs ?? [],
  statusLogs: record.statusLogs?.map((log) => ({
    ...normalizeStatusLogRecord(log),
  })),
});

export const returnDetailReadService = {
  async detail(returnId: number): Promise<ReturnRequestDetail> {
    const response = await returnApi.getUserReturnDetail(returnId);
    return mapReturnDetailRecord(response.data as DetailRecord);
  },
};
