import { returnApi } from '@/common/api/return.api';
import type {
  ReturnEconomicsSummary,
  RawReturnStatus,
  RawReturnWorkflowStatus,
  RefundWorkflowStatus,
  ReturnStatusBucket,
} from '@/common/services/return.types';
import {
  coerceRefundWorkflowStatus,
  deriveRefundStatusFromRecord,
} from '@/common/services/return.refund-status';
import { bucketReturnStatus, resolveWorkflowStatus } from '@/common/utils/returnStatus';

export interface MyReturnSummary {
  returnRequestId: number;
  orderId: number;
  statusBucket?: ReturnStatusBucket;
  workflowStatus?: RawReturnWorkflowStatus;
  refundStatus?: RefundWorkflowStatus;
  totalRefundAmount?: string | number | null;
  refundableCapAmount?: string | number | null;
  updatedAt?: string | null;
  financeNote?: string | null;
  financeNoteUpdatedAt?: string | null;
  financeNoteUpdatedBy?: {
    userId?: number;
    fullName?: string | null;
  } | null;
  economicsSummary?: ReturnEconomicsSummary;
}

type SummaryRecord = {
  returnRequestId: number;
  orderId: number;
  statusBucket?: ReturnStatusBucket | null;
  status?: RawReturnStatus | null;
  workflowStatus?: RawReturnWorkflowStatus | null;
  refundStatus?: string | null;
  totalRefundAmount?: string | number | null;
  refundableCapAmount?: string | number | null;
  refundTransactions?: Array<{ amount?: number | null; status?: string | null }>;
  updatedAt?: string | null;
  financeNote?: string | null;
  financeNoteUpdatedAt?: string | null;
  financeNoteUpdatedBy?: {
    userId?: number;
    fullName?: string | null;
  } | null;
  economicsSummary?: ReturnEconomicsSummary | null;
};

type MyReturnSummaryOptions = {
  orderIds?: number[];
  updatedSince?: string;
};

const deriveRefundStatus = (record: SummaryRecord): RefundWorkflowStatus =>
  deriveRefundStatusFromRecord(record);

const resolveRefundStatus = (record: SummaryRecord): RefundWorkflowStatus =>
  coerceRefundWorkflowStatus(record.refundStatus) ?? deriveRefundStatus(record);

const mapReturnSummaryRecord = (record: SummaryRecord): MyReturnSummary => ({
  returnRequestId: record.returnRequestId,
  orderId: record.orderId,
  statusBucket: record.statusBucket ?? bucketReturnStatus(record.workflowStatus ?? record.status),
  workflowStatus: resolveWorkflowStatus(record.workflowStatus, record.status),
  refundStatus: resolveRefundStatus(record),
  totalRefundAmount: record.totalRefundAmount ?? null,
  refundableCapAmount: record.refundableCapAmount ?? null,
  updatedAt: record.updatedAt ?? null,
  financeNote: record.financeNote ?? null,
  financeNoteUpdatedAt: record.financeNoteUpdatedAt ?? null,
  financeNoteUpdatedBy: record.financeNoteUpdatedBy ?? null,
  economicsSummary: record.economicsSummary ?? undefined,
});

export const returnSummaryService = {
  async myReturnSummaries(
    page = 1,
    limit = 8,
    options?: MyReturnSummaryOptions,
  ): Promise<MyReturnSummary[]> {
    const response = await returnApi.getMyReturns(page, limit, {
      view: 'summary',
      orderIds: options?.orderIds,
      updatedSince: options?.updatedSince,
    });

    return response.data.data.map((record) => mapReturnSummaryRecord(record as SummaryRecord));
  },
};
