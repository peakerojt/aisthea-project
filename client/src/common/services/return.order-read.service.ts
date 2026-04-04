import { returnApi } from '@/common/api/return.api';
import type {
  OrderReturn,
  RawReturnStatus,
  RawReturnWorkflowStatus,
  RefundWorkflowStatus,
} from '@/common/services/return.types';
import {
  coerceRefundWorkflowStatus,
  deriveRefundStatusFromRecord,
} from '@/common/services/return.refund-status';
import { normalizeRefundTransactionMethod } from '@/common/services/return.refund-transaction';
import {
  bucketReturnStatus,
  normalizeWorkflowStatusValue,
  resolveWorkflowStatus,
} from '@/common/utils/returnStatus';

type OrderReturnRecord = OrderReturn & {
  status: RawReturnStatus;
  workflowStatus?: RawReturnWorkflowStatus | null;
  refundStatus?: string | null;
  totalRefundAmount?: string | number | null;
  refundableCapAmount?: string | number | null;
  refundTransactions?: Array<{
    amount?: number | null;
    status?: string | null;
    method?: string | null;
    transactionRef?: string | null;
  }>;
};

const deriveRefundStatus = (record: OrderReturnRecord): RefundWorkflowStatus =>
  deriveRefundStatusFromRecord(record);

const resolveRefundStatus = (record: OrderReturnRecord): RefundWorkflowStatus =>
  coerceRefundWorkflowStatus(record.refundStatus) ?? deriveRefundStatus(record);

const mapOrderReturnRecord = (record: OrderReturnRecord): OrderReturn => ({
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
});

export const returnOrderReadService = {
  async getForOrder(orderId: number): Promise<OrderReturn | null> {
    const response = await returnApi.getReturnForOrder(orderId);
    return response.data ? mapOrderReturnRecord(response.data as OrderReturnRecord) : null;
  },
};
