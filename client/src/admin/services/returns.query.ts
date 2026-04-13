import { adminReturnApi } from '@/admin/api/returns.api';
import type { AdminReturnRecord } from '@/admin/services/types';
import type {
  OrderReturn,
  RawReturnStatus,
  RawReturnWorkflowStatus,
  RefundWorkflowStatus,
  ReturnListResponse,
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

const deriveRefundStatus = (record: {
  status?: RawReturnStatus | null;
  totalRefundAmount?: string | number;
  refundableCapAmount?: string | number | null;
  refundTransactions?: Array<{ amount?: number | null; status?: string | null; method?: string | null }>;
}): RefundWorkflowStatus => deriveRefundStatusFromRecord(record);

const resolveRefundStatus = (record: {
  refundStatus?: string | null;
  status?: RawReturnStatus | null;
  totalRefundAmount?: string | number;
  refundTransactions?: Array<{ amount?: number | null; status?: string | null; method?: string | null }>;
}): RefundWorkflowStatus => coerceRefundWorkflowStatus(record.refundStatus) ?? deriveRefundStatus(record);

type CanonicalizableAdminReturnRecord = AdminReturnRecord & {
  status: RawReturnStatus;
  workflowStatus?: RawReturnWorkflowStatus | null;
};

export type AdminReturnSortValue =
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'updatedAt_desc'
  | 'updatedAt_asc'
  | 'refundStatus_asc';

const getAdminNote = (record: AdminReturnRecord) => {
  const latestMeaningfulLog = [...(record.statusLogs ?? [])]
    .reverse()
    .find((log) => {
      const fromWorkflow = resolveWorkflowStatus(log.fromWorkflowStatus, log.fromStatus);
      const toWorkflow = resolveWorkflowStatus(log.toWorkflowStatus, log.toStatus);

      return (
        Boolean(log.comment) &&
        log.comment !== 'Customer created return request' &&
        !(fromWorkflow === 'ACCEPTED_FOR_REFUND' && toWorkflow === 'ACCEPTED_FOR_REFUND')
      );
    });

  return latestMeaningfulLog?.comment ?? record.note ?? null;
};

const getFinanceNoteContext = (record: AdminReturnRecord) => {
  const latestFinanceLog = [...(record.statusLogs ?? [])]
    .reverse()
    .find((log) => {
      const fromWorkflow = resolveWorkflowStatus(log.fromWorkflowStatus, log.fromStatus);
      const toWorkflow = resolveWorkflowStatus(log.toWorkflowStatus, log.toStatus);
      const comment = log.comment?.trim();

      return (
        Boolean(comment) &&
        fromWorkflow === 'ACCEPTED_FOR_REFUND' &&
        toWorkflow === 'ACCEPTED_FOR_REFUND' &&
        !comment!.startsWith('Refund status updated:')
      );
    });

  const financeNote =
    (typeof record.financeNote === 'string' && record.financeNote.trim()) ||
    latestFinanceLog?.comment ||
    null;
  const matchedFinanceLog = financeNote
    ? [...(record.statusLogs ?? [])]
        .reverse()
        .find((log) => log.comment?.trim() === financeNote)
    : latestFinanceLog;

  return {
    financeNote,
    financeNoteUpdatedAt: record.financeNoteUpdatedAt ?? matchedFinanceLog?.createdAt ?? null,
    financeNoteUpdatedBy: record.financeNoteUpdatedBy ?? matchedFinanceLog?.changedByUser ?? null,
  };
};

const mapAdminReturnRecord = (record: CanonicalizableAdminReturnRecord): OrderReturn => {
  const financeNoteContext = getFinanceNoteContext(record);

  return {
    returnId: record.returnRequestId,
    orderId: record.orderId,
    userId: record.userId,
    reason: record.reason,
    proofImages: (record.attachments ?? []).map((attachment) => attachment.fileUrl),
    status: normalizeWorkflowStatusValue(record.status),
    statusBucket: record.statusBucket ?? bucketReturnStatus(record.workflowStatus ?? record.status),
    workflowStatus: resolveWorkflowStatus(record.workflowStatus, record.status),
    refundStatus: resolveRefundStatus(record),
    adminNote: getAdminNote(record),
    financeNote: financeNoteContext.financeNote,
    financeNoteUpdatedAt: financeNoteContext.financeNoteUpdatedAt,
    financeNoteUpdatedBy: financeNoteContext.financeNoteUpdatedBy,
    bankInfo: record.bankInfo ?? null,
    bankInfoRequestedAt: record.bankInfoRequestedAt ?? null,
    bankInfoSubmittedAt: record.bankInfoSubmittedAt ?? null,
    refundCompletedAt: record.refundCompletedAt ?? null,
    refundBenefit: record.refundBenefit ?? null,
    totalRefundAmount: record.totalRefundAmount ?? null,
    refundableCapAmount: record.refundableCapAmount ?? null,
    economicsSummary: record.economicsSummary ?? undefined,
    refundTransactions: record.refundTransactions?.map((transaction) => ({
      ...transaction,
      method: normalizeRefundTransactionMethod(transaction.method),
    })),
    refundPayoutProofs: record.refundPayoutProofs ?? [],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt ?? record.createdAt,
    items: record.items,
    order: record.order
      ? {
          orderNumber: record.order.orderNumber ?? `RET-${record.returnRequestId}`,
          totalAmount: record.order.totalAmount ?? '0',
          customerName: record.order.customerName ?? record.user?.fullName ?? '',
          customerPhone: record.order.customerPhone ?? '',
        }
      : undefined,
    user: record.user
      ? {
          userId: record.user.userId ?? 0,
          fullName: record.user.fullName ?? '',
          email: record.user.email ?? '',
          avatarUrl: record.user.avatarUrl ?? null,
        }
      : null,
  };
};

const buildAdminReturnListQuery = (params?: {
  status?: string;
  search?: string;
  sort?: AdminReturnSortValue;
  page?: number;
  pageSize?: number;
}) => {
  const query = new URLSearchParams();

  if (params?.status && params.status !== 'ALL') {
    query.append('status', params.status);
  }
  if (params?.search) {
    query.append('search', params.search);
  }
  if (params?.sort) {
    query.append('sort', params.sort);
  }
  if (params?.page) {
    query.append('page', params.page.toString());
  }
  if (params?.pageSize) {
    query.append('limit', params.pageSize.toString());
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
};

export const adminReturnReadService = {
  async list(params?: {
    status?: string;
    search?: string;
    sort?: AdminReturnSortValue;
    page?: number;
    pageSize?: number;
  }): Promise<ReturnListResponse> {
    const response = await adminReturnApi.getAdminReturnRequests(buildAdminReturnListQuery(params));

    return {
      returns: response.data.data.map(mapAdminReturnRecord),
      pagination: {
        page: response.data.page,
        pageSize: response.data.limit,
        total: response.data.total,
        totalPages: response.data.totalPages,
      },
      summary: response.data.summary,
    };
  },

  async detail(returnId: number): Promise<OrderReturn> {
    const response = await adminReturnApi.getAdminReturnRequestDetail(returnId);
    return mapAdminReturnRecord(response.data);
  },
};
