import { returnApi } from '@/common/api/return.api';
import type {
  MyReturnListResponse,
  RawReturnStatus,
  RawReturnWorkflowStatus,
  RefundWorkflowStatus,
  ReturnRequest,
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

const deriveRefundStatus = (record: {
  status?: string | null;
  totalRefundAmount?: string | number;
  refundableCapAmount?: string | number | null;
  refundTransactions?: Array<{
    amount?: number | null;
    status?: string | null;
    method?: string | null;
    transactionRef?: string | null;
  }>;
}): RefundWorkflowStatus => deriveRefundStatusFromRecord(record);

const resolveRefundStatus = (record: {
  refundStatus?: string | null;
  status?: string | null;
  totalRefundAmount?: string | number;
  refundTransactions?: Array<{
    amount?: number | null;
    status?: string | null;
    method?: string | null;
    transactionRef?: string | null;
  }>;
}): RefundWorkflowStatus => coerceRefundWorkflowStatus(record.refundStatus) ?? deriveRefundStatus(record);

const normalizeStatusLogRecord = (log: ReturnRequestStatusLog): ReturnRequestStatusLog => ({
  ...log,
  fromWorkflowStatus: log.fromStatus || log.fromWorkflowStatus
    ? resolveWorkflowStatus(log.fromWorkflowStatus, log.fromStatus)
    : null,
  toWorkflowStatus: resolveWorkflowStatus(log.toWorkflowStatus, log.toStatus),
  fromStatus: log.fromStatus ? normalizeReturnStatus(log.fromStatus) : log.fromStatus,
  toStatus: normalizeReturnStatus(log.toStatus),
});

const normalizeReturnWorkflowRecord = <
  T extends {
    status: RawReturnStatus;
    workflowStatus?: RawReturnWorkflowStatus | null;
    refundStatus?: string | null;
    financeNote?: string | null;
    financeNoteUpdatedAt?: string | null;
    financeNoteUpdatedBy?: {
      userId?: number;
      fullName?: string | null;
    } | null;
  },
>(record: T): T => ({
  ...record,
  status: normalizeWorkflowStatusValue(record.status),
  statusBucket: record.statusBucket ?? bucketReturnStatus(record.workflowStatus ?? record.status),
  workflowStatus: resolveWorkflowStatus(record.workflowStatus, record.status),
  refundStatus: resolveRefundStatus(record),
  financeNote: record.financeNote ?? null,
  financeNoteUpdatedAt: record.financeNoteUpdatedAt ?? null,
  financeNoteUpdatedBy: record.financeNoteUpdatedBy ?? null,
});

const mapReturnRequestRecord = <T extends ReturnRequest & { statusLogs?: ReturnRequestStatusLog[] }>(record: T): T => ({
  ...normalizeReturnWorkflowRecord(record),
  refundTransactions: record.refundTransactions?.map((transaction) => ({
    ...transaction,
    method: normalizeRefundTransactionMethod(transaction.method),
  })),
  statusLogs: record.statusLogs?.map((log) => ({
    ...normalizeStatusLogRecord(log),
  })),
});

export const returnCustomerListReadService = {
  async myReturns(page = 1, limit = 8): Promise<MyReturnListResponse> {
    const response = await returnApi.getMyReturns(page, limit);

    return {
      ...response.data,
      data: response.data.data.map((record) => mapReturnRequestRecord(record)),
    };
  },
};
