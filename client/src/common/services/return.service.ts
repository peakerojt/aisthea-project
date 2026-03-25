/**
 * return.service.ts (client)
 * API calls for the Return & Refund module.
 */

// Removed api import for return.service.ts

import { normalizeReturnStatus } from '@/common/utils/returnStatus';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReturnReason =
  | 'DEFECTIVE'
  | 'WRONG_ITEM'
  | 'SIZE_ISSUE'
  | 'CHANGED_MIND'
  | 'OTHER';

export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RECEIVED'
  | 'REFUNDED';

type LegacyReturnStatus = 'PENDING_APPROVAL' | 'COMPLETED';
type RawReturnStatus = ReturnStatus | LegacyReturnStatus | string;

export type RefundMethod = 'ORIGINAL_PAYMENT' | 'WALLET_CREDIT';

export interface OrderReturn {
  returnId: number;
  orderId: number;
  userId: number | null;
  reason: string;
  proofImages: string[]; // Cloudinary URLs (already parsed from JSON)
  status: ReturnStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated in admin list
  order?: {
    orderNumber: string;
    totalAmount: string;
    customerName: string;
    customerPhone: string;
  };
  user?: {
    userId: number;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  } | null;
}

export interface ReturnListResponse {
  returns: OrderReturn[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export type ReturnServiceEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
};

export interface ReturnRequestItem {
  returnRequestItemId?: number;
  orderItemId: number;
  quantity: number;
  unitPrice?: string | number | null;
  reason?: ReturnReason | null;
  orderItem?: {
    orderItemId: number;
    productName?: string | null;
    variantName?: string | null;
    unitPrice?: string | number | null;
    quantity?: number;
  };
}

export interface ReturnRequestAttachment {
  attachmentId?: number;
  fileUrl: string;
}

export interface ReturnRequestStatusLog {
  logId: number;
  fromStatus?: string | null;
  toStatus: string;
  comment?: string | null;
  createdAt: string;
  changedByUser?: {
    userId?: number;
    fullName?: string | null;
  } | null;
}

export interface ReturnRefundTransaction {
  transactionId: number;
  amount: number;
  method: RefundMethod;
  status: string;
  transactionRef?: string;
}

export interface ReturnRequest {
  returnRequestId: number;
  orderId: number;
  userId: number | null;
  reason: ReturnReason;
  status: RawReturnStatus;
  note?: string | null;
  totalRefundAmount: string | number;
  createdAt: string;
  updatedAt?: string;
  items?: ReturnRequestItem[];
}

export interface ReturnRequestDetail extends ReturnRequest {
  attachments?: ReturnRequestAttachment[];
  statusLogs?: ReturnRequestStatusLog[];
  refundTransactions?: ReturnRefundTransaction[];
}

export interface MyReturnListResponse {
  data: ReturnRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateReturnPayload {
  orderId: number;
  reason: ReturnReason;
  note?: string;
  items: Array<{
    orderItemId: number;
    quantity: number;
    reason?: ReturnReason;
  }>;
  attachments?: string[];
}

type AdminReturnAction = 'APPROVE' | 'REJECT' | 'COMPLETE_REFUND';

export type AdminReturnRecord = ReturnRequestDetail & {
  order?: {
    orderId?: number;
    orderNumber?: string;
    totalAmount?: string;
    customerName?: string;
    customerPhone?: string;
  };
  user?: {
    userId?: number;
    fullName?: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;
};

export type AdminReturnListPayload = {
  data: AdminReturnRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

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

const getAdminNote = (record: AdminReturnRecord) => {
  const latestMeaningfulLog = [...(record.statusLogs ?? [])]
    .reverse()
    .find((log) => log.comment && log.comment !== 'Customer created return request');

  return latestMeaningfulLog?.comment ?? record.note ?? null;
};

const mapAdminReturnRecord = (record: AdminReturnRecord): OrderReturn => ({
  returnId: record.returnRequestId,
  orderId: record.orderId,
  userId: record.userId,
  reason: record.reason,
  proofImages: (record.attachments ?? []).map((attachment) => attachment.fileUrl),
  status: normalizeReturnStatus(record.status),
  adminNote: getAdminNote(record),
  createdAt: record.createdAt,
  updatedAt: record.updatedAt ?? record.createdAt,
  order: record.order ? {
    orderNumber: record.order.orderNumber ?? `RET-${record.returnRequestId}`,
    totalAmount: record.order.totalAmount ?? '0',
    customerName: record.order.customerName ?? record.user?.fullName ?? '',
    customerPhone: record.order.customerPhone ?? '',
  } : undefined,
  user: record.user ? {
    userId: record.user.userId ?? 0,
    fullName: record.user.fullName ?? '',
    email: record.user.email ?? '',
    avatarUrl: record.user.avatarUrl ?? null,
  } : null,
});

const mapLegacyOrderReturnRecord = (record: OrderReturn): OrderReturn => ({
  ...record,
  status: normalizeReturnStatus(record.status) as ReturnStatus,
});

const mapReturnRequestRecord = <T extends ReturnRequest>(record: T): T => ({
  ...record,
  status: normalizeReturnStatus(record.status),
  statusLogs: record.statusLogs?.map((log) => ({
    ...log,
    fromStatus: log.fromStatus ? normalizeReturnStatus(log.fromStatus) : log.fromStatus,
    toStatus: normalizeReturnStatus(log.toStatus),
  })),
});

const createRefundIdempotencyKey = (returnId: number) =>
  `admin-return-${returnId}-${Date.now()}`;

const createAdminReturnResult = (messageKey: string): AdminReturnProcessResult => ({
  success: true,
  messageKey,
});

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

import { returnApi } from '@/common/api/return.api';

// ─── Customer ─────────────────────────────────────────────────────────────────

export const returnService = {
  /**
   * Customer: submit a return request for a delivered order.
   */
  async request(orderId: number, reason: string, proofImages: string[]): Promise<OrderReturn> {
    const response = await returnApi.requestReturn(orderId, { reason, proofImages });
    return mapLegacyOrderReturnRecord(response.data);
  },
  /**
   * Legacy alias used by some screens/tests. Accepts either a payload object or positional args.
   */
  async create(
    payloadOrOrderId: CreateReturnPayload | number,
    reason?: string,
    proofImages?: string[],
  ): Promise<ReturnRequest> {
    if (typeof payloadOrOrderId === 'object') {
      const response = await returnApi.createReturnRequest(payloadOrOrderId);
      return mapReturnRequestRecord(response.data);
    }
    return this.request(payloadOrOrderId, reason ?? '', proofImages ?? []) as unknown as ReturnRequest;
  },

  /**
   * Get the OrderReturn linked to a specific order (for customer and admin).
   */
  async getForOrder(orderId: number): Promise<OrderReturn | null> {
    const res = await returnApi.getReturnForOrder(orderId);
    return res.data ? mapLegacyOrderReturnRecord(res.data) : null;
  },

  /**
   * Get paginated returns for current customer
   */
  async myReturns(page = 1, limit = 8): Promise<MyReturnListResponse> {
    const response = await returnApi.getMyReturns(page, limit);
    return {
      ...response.data,
      data: response.data.data.map((record) => mapReturnRequestRecord(record)),
    };
  },

  /**
   * Get return detail
   */
  async detail(returnId: number): Promise<ReturnRequestDetail> {
    const response = await returnApi.getUserReturnDetail(returnId);
    return mapReturnRequestRecord(response.data);
  },
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminReturnService = {
  /**
   * Paginated list of all return requests.
   */
  async list(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ReturnListResponse> {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') q.append('status', params.status);
    if (params?.page) q.append('page', params.page.toString());
    if (params?.pageSize) q.append('limit', params.pageSize.toString());
    const query = q.toString();
    const response = await returnApi.getAdminReturnRequests(query ? `?${query}` : '');

    return {
      returns: response.data.data.map(mapAdminReturnRecord),
      pagination: {
        page: response.data.page,
        pageSize: response.data.limit,
        total: response.data.total,
        totalPages: response.data.totalPages,
      },
    };
  },

  /**
   * Admin: approve / reject / complete refund for a return request.
   */
  async process(
    returnId: number,
    action: AdminReturnAction,
    note?: string,
  ): Promise<AdminReturnProcessResult> {
    if (action === 'APPROVE') {
      await returnApi.approveReturnRequest(returnId);
      return createAdminReturnResult('feedback.approveSuccess');
    }

    if (action === 'REJECT') {
      const rejectionReason = note?.trim();
      if (!rejectionReason) {
        throw createAdminReturnError(
          'feedback.rejectReasonRequired',
          'Vui lòng nhập lý do từ chối.',
          'RETURN_REJECT_REASON_REQUIRED',
        );
      }

      await returnApi.rejectReturnRequest(returnId, { reason: rejectionReason });
      return createAdminReturnResult('feedback.rejectSuccess');
    }

    const detail = await this.detail(returnId);
    let currentStatus = normalizeReturnStatus(detail.status);

    if (currentStatus === 'REJECTED') {
      throw createAdminReturnError(
        'feedback.refundRejected',
        'Yêu cầu đã bị từ chối, không thể hoàn tiền.',
        'RETURN_ALREADY_REJECTED',
      );
    }

    if (currentStatus === 'REQUESTED') {
      await returnApi.approveReturnRequest(returnId);
      currentStatus = 'APPROVED';
    }

    if (currentStatus === 'APPROVED') {
      await returnApi.markReturnReceived(returnId);
      currentStatus = 'RECEIVED';
    }

    if (currentStatus === 'RECEIVED') {
      await returnApi.refundReturnRequest(returnId, {
        method: 'ORIGINAL_PAYMENT',
        idempotencyKey: createRefundIdempotencyKey(returnId),
      });
    }

    return createAdminReturnResult('feedback.refundSuccess');
  },

  /**
   * Alias methods to support ReturnDetailPage components
   */
  async detail(returnId: number): Promise<OrderReturn> {
    const response = await returnApi.getAdminReturnRequestDetail(returnId);
    return mapAdminReturnRecord(response.data);
  },
  async adminApprove(returnId: number) {
    return this.process(returnId, 'APPROVE');
  },
  async adminReject(returnId: number, note?: string) {
    return this.process(returnId, 'REJECT', note);
  },
  async adminMarkReceived(returnId: number) {
    await returnApi.markReturnReceived(returnId);
    return createAdminReturnResult('feedback.receivedSuccess');
  },
  async adminRefund(returnId: number, payload: Record<string, unknown>) {
    await returnApi.refundReturnRequest(returnId, {
      method: (payload.method as RefundMethod | undefined) ?? 'ORIGINAL_PAYMENT',
      amount: typeof payload.amount === 'number' ? payload.amount : undefined,
      idempotencyKey: typeof payload.idempotencyKey === 'string'
        ? payload.idempotencyKey
        : createRefundIdempotencyKey(returnId),
    });
    return createAdminReturnResult('feedback.refundSuccess');
  }
};
