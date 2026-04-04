import { adminReturnApi } from '@/admin/api/returns.api';
import { adminReturnReadService } from '@/admin/services/returns.query';
import type {
  CompleteBankRefundPayload,
  OrderReturn,
  RefundMethod,
  RefundWorkflowStatus,
  ReturnListResponse,
} from '@/common/services/return.types';

type AdminReturnProcessResult = {
  success: boolean;
  message?: string;
  messageKey?: string;
  code?: string;
};

type AdminReturnClientError = Error & {
  messageKey?: string;
  code?: string;
};

const createRefundIdempotencyKey = (returnId: number) =>
  `admin-return-${returnId}-${Date.now()}`;

const createAdminReturnResult = (messageKey: string): AdminReturnProcessResult => ({
  success: true,
  messageKey,
});

const buildAdminRefundPayload = (returnId: number, payload: Record<string, unknown>) => ({
  method: (payload.method as RefundMethod | undefined) ?? 'ORIGINAL_PAYMENT',
  amount: typeof payload.amount === 'number' ? payload.amount : undefined,
  idempotencyKey:
    typeof payload.idempotencyKey === 'string'
      ? payload.idempotencyKey
      : createRefundIdempotencyKey(returnId),
});

const runAdminActionRequest = async (
  request: () => Promise<unknown>,
  messageKey: string,
): Promise<AdminReturnProcessResult> => {
  await request();
  return createAdminReturnResult(messageKey);
};

const createAdminReturnError = (
  messageKey: string,
  fallbackMessage: string,
  code?: string,
): AdminReturnClientError => {
  const error = new Error(fallbackMessage) as AdminReturnClientError;
  error.messageKey = messageKey;
  error.code = code;
  return error;
};

const approveAdminReturnRequest = (returnId: number) =>
  runAdminActionRequest(
    () => adminReturnApi.approveReturnRequest(returnId),
    'feedback.approveSuccess',
  );

const rejectAdminReturnRequest = (returnId: number, note?: string) => {
  const rejectionReason = note?.trim();
  if (!rejectionReason) {
    throw createAdminReturnError(
      'feedback.rejectReasonRequired',
      'Vui lòng nhập lý do từ chối.',
      'RETURN_REJECT_REASON_REQUIRED',
    );
  }

  return runAdminActionRequest(
    () => adminReturnApi.rejectReturnRequest(returnId, { reason: rejectionReason }),
    'feedback.rejectSuccess',
  );
};

const updateAdminRefundWorkflowStatus = (
  returnId: number,
  refundStatus: RefundWorkflowStatus,
  note?: string,
  messageKey?: string,
) =>
  runAdminActionRequest(
    () =>
      adminReturnApi.updateRefundStatus(returnId, {
        refundStatus,
        comment: note?.trim() || undefined,
      }),
    messageKey ?? 'feedback.refundSuccess',
  );

export const adminReturnRuntimeService = {
  async list(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ReturnListResponse> {
    return adminReturnReadService.list(params);
  },

  async detail(returnId: number): Promise<OrderReturn> {
    return adminReturnReadService.detail(returnId);
  },

  async adminApprove(returnId: number) {
    return approveAdminReturnRequest(returnId);
  },

  async adminReject(returnId: number, note?: string) {
    return rejectAdminReturnRequest(returnId, note);
  },

  async adminMarkReceived(returnId: number) {
    return runAdminActionRequest(
      () => adminReturnApi.markReturnReceived(returnId),
      'feedback.receivedSuccess',
    );
  },

  async adminMarkInTransit(returnId: number) {
    return runAdminActionRequest(
      () => adminReturnApi.markReturnInTransit(returnId),
      'feedback.inTransitSuccess',
    );
  },

  async adminAcceptForRefund(returnId: number) {
    return runAdminActionRequest(
      () => adminReturnApi.acceptReturnForRefund(returnId),
      'feedback.acceptRefundSuccess',
    );
  },

  async adminSendBankInfoReminder(returnId: number) {
    return runAdminActionRequest(
      () => adminReturnApi.sendBankInfoReminder(returnId),
      'feedback.bankInfoReminderSent',
    );
  },

  async adminSetRefundPending(returnId: number, note?: string) {
    return updateAdminRefundWorkflowStatus(
      returnId,
      'PENDING',
      note,
      'feedback.refundStatusPendingSuccess',
    );
  },

  async adminSetRefundProcessing(returnId: number, note?: string) {
    return updateAdminRefundWorkflowStatus(
      returnId,
      'PROCESSING',
      note,
      'feedback.refundStatusProcessingSuccess',
    );
  },

  async adminSetRefundFailed(returnId: number, note?: string) {
    return updateAdminRefundWorkflowStatus(
      returnId,
      'FAILED',
      note,
      'feedback.refundStatusFailedSuccess',
    );
  },

  async adminSetRefundManualReview(returnId: number, note?: string) {
    return updateAdminRefundWorkflowStatus(
      returnId,
      'MANUAL_REVIEW',
      note,
      'feedback.refundStatusManualReviewSuccess',
    );
  },

  async uploadPayoutProofImage(imageData: string, fileName?: string) {
    const response = await adminReturnApi.uploadPayoutProofImage({ imageData, fileName });
    return response.data;
  },

  async adminCompleteRefund(returnId: number, payload: CompleteBankRefundPayload) {
    return runAdminActionRequest(
      () => adminReturnApi.completeBankRefund(returnId, payload),
      'feedback.refundSuccess',
    );
  },

  async adminRefund(returnId: number, payload: Record<string, unknown>) {
    return runAdminActionRequest(
      () => adminReturnApi.refundReturnRequest(returnId, buildAdminRefundPayload(returnId, payload)),
      'feedback.refundSuccess',
    );
  },
};
