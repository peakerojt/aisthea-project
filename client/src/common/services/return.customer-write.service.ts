import { returnApi } from '@/common/api/return.api';
import type {
  CreateReturnPayload,
  RawReturnStatus,
  RawReturnWorkflowStatus,
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

type ReturnWriteApiError = {
  code?: string;
  message?: string;
  response?: {
    data?: {
      code?: string;
      message?: string;
      error?: {
        code?: string;
        message?: string;
        details?: {
          returnRequestId?: number;
        };
      };
      details?: {
        returnRequestId?: number;
      };
    };
  };
};

export class ReturnCustomerWriteError extends Error {
  constructor(
    message: string,
    public code?: string,
    public existingReturnId?: number,
  ) {
    super(message);
    this.name = 'ReturnCustomerWriteError';
  }
}

const resolveRefundStatus = (record: {
  refundStatus?: string | null;
  status?: string | null;
  totalRefundAmount?: string | number | null;
  refundableCapAmount?: string | number | null;
  refundTransactions?: Array<{ amount?: number | string | null; status?: string | null; method?: string | null }>;
}) => coerceRefundWorkflowStatus(record.refundStatus) ?? deriveRefundStatusFromRecord(record);

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
  refundTransactions: Array.isArray((record as { refundTransactions?: unknown[] }).refundTransactions)
    ? (record as { refundTransactions: Array<{ method?: string | null }> }).refundTransactions.map((transaction) => ({
      ...transaction,
      method: normalizeRefundTransactionMethod(transaction.method),
    }))
    : (record as { refundTransactions?: undefined }).refundTransactions,
});

const mapReturnRequestRecord = <T extends ReturnRequest & { statusLogs?: ReturnRequestStatusLog[] }>(record: T): T => ({
  ...normalizeReturnWorkflowRecord(record),
  statusLogs: record.statusLogs?.map((log) => ({
    ...normalizeStatusLogRecord(log),
  })),
});

const normalizeCreateReturnError = (error: unknown): unknown => {
  const apiError = error as ReturnWriteApiError;
  const code =
    apiError?.response?.data?.error?.code ??
    apiError?.response?.data?.code ??
    apiError?.code;

  if (code !== 'RETURN_ALREADY_EXISTS' && code !== 'ITEM_SELECTION_REQUIRED') {
    return error;
  }

  const existingReturnId =
    apiError?.response?.data?.error?.details?.returnRequestId ??
    apiError?.response?.data?.details?.returnRequestId;
  const message =
    apiError?.response?.data?.error?.message ??
    apiError?.response?.data?.message ??
    apiError?.message ??
    'This order already has an active return request';

  return new ReturnCustomerWriteError(
    message,
    code,
    code === 'RETURN_ALREADY_EXISTS' ? existingReturnId : undefined,
  );
};

const createReturn = async (payload: CreateReturnPayload): Promise<ReturnRequest> => {
  let response;
  try {
    response = await returnApi.createReturnRequest(payload);
  } catch (error) {
    throw normalizeCreateReturnError(error);
  }
  return mapReturnRequestRecord(response.data);
};

export const returnCustomerWriteService = {
  create: createReturn,
};
