import { adminReturnApi } from '@/admin/api/returns.api';
import { adminReturnReadService } from '@/admin/services/returns.query';
import type {
  OrderReturn,
  RefundMethod,
  RefundWorkflowStatus,
  ReturnListResponse,
} from '@/common/services/return.types';
import { canonicalizeWorkflowStatusFallback } from '@/common/utils/returnStatus';

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

const completeAdminRefundRequest = async (
  detailLoader: (returnId: number) => Promise<OrderReturn>,
  returnId: number,
): Promise<AdminReturnProcessResult> => {
  const detail = await detailLoader(returnId);
  const isPreDeliveryCancellation = detail.reason === 'PRE_DELIVERY_CANCELLATION';
  if (detail.refundStatus === 'LOCKED_UNTIL_PAYMENT_CONFIRMED') {
    throw createAdminReturnError(
      'feedback.refundLocked',
      'Hoàn tiền đang bị khóa cho tới khi đơn hàng được xác nhận thanh toán.',
      'RETURN_REFUND_LOCKED',
    );
  }

  let currentStatus = canonicalizeWorkflowStatusFallback(detail.workflowStatus ?? detail.status);

  if (currentStatus === 'REJECTED') {
    throw createAdminReturnError(
      'feedback.refundRejected',
      'Yêu cầu đã bị từ chối, không thể hoàn tiền.',
      'RETURN_ALREADY_REJECTED',
    );
  }

  if (
    currentStatus === 'REQUESTED' ||
    currentStatus === 'PENDING_ADMIN_REVIEW' ||
    currentStatus === 'SUBMITTED'
  ) {
    await adminReturnApi.approveReturnRequest(returnId);
    currentStatus = isPreDeliveryCancellation ? 'ACCEPTED_FOR_REFUND' : 'APPROVED';
  }

  if (!isPreDeliveryCancellation && currentStatus === 'APPROVED') {
    await adminReturnApi.markReturnInTransit(returnId);
    currentStatus = 'IN_RETURN_TRANSIT';
  }

  if (!isPreDeliveryCancellation && currentStatus === 'IN_RETURN_TRANSIT') {
    await adminReturnApi.markReturnReceived(returnId);
    currentStatus = 'RECEIVED_AND_INSPECTING';
  }

  if (!isPreDeliveryCancellation && (currentStatus === 'RECEIVED' || currentStatus === 'RECEIVED_AND_INSPECTING')) {
    await adminReturnApi.acceptReturnForRefund(returnId);
    currentStatus = 'ACCEPTED_FOR_REFUND';
  }

  if (currentStatus === 'ACCEPTED_FOR_REFUND') {
    await adminReturnApi.refundReturnRequest(returnId, {
      method: 'ORIGINAL_PAYMENT',
      idempotencyKey: createRefundIdempotencyKey(returnId),
    });
  }

  return createAdminReturnResult('feedback.refundSuccess');
};

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

  async adminCompleteRefund(returnId: number) {
    return completeAdminRefundRequest((targetReturnId) => this.detail(targetReturnId), returnId);
  },

  async adminRefund(returnId: number, payload: Record<string, unknown>) {
    return runAdminActionRequest(
      () => adminReturnApi.refundReturnRequest(returnId, buildAdminRefundPayload(returnId, payload)),
      'feedback.refundSuccess',
    );
  },
};
