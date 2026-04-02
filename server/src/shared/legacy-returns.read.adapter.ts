const CUSTOMER_CREATED_COMMENT = 'Customer created return request';
const EMPTY_LEGACY_PAGINATION = { page: 1, pageSize: 20, total: 0, totalPages: 0 };
const EMPTY_PROOF_IMAGES: string[] = [];
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

const getLatestMeaningfulComment = (statusLogs?: Array<{ comment?: string | null }>) =>
  [...(statusLogs ?? [])]
    .reverse()
    .find((log) => log?.comment && log.comment !== CUSTOMER_CREATED_COMMENT)?.comment ?? null;

const normalizeWorkflowStatus = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const canonicalizeWorkflowStatus = (value: unknown) => {
  const normalized = normalizeWorkflowStatus(value);
  if (normalized === 'PENDING_APPROVAL') {
    return 'PENDING_ADMIN_REVIEW';
  }
  if (normalized === 'COMPLETED') {
    return 'CLOSED';
  }
  return normalized;
};

const bucketWorkflowStatus = (value: unknown) => {
  const workflowStatus = canonicalizeWorkflowStatus(value);

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

const coerceRefundWorkflowStatus = (value: unknown) => {
  const normalized = normalizeWorkflowStatus(value);
  return LEGACY_REFUND_WORKFLOW_STATUSES.includes(
    normalized as (typeof LEGACY_REFUND_WORKFLOW_STATUSES)[number],
  )
    ? normalized
    : undefined;
};

const deriveLegacyRefundStatus = (record: {
  refundStatus?: unknown;
  status?: unknown;
  workflowStatus?: unknown;
}) => {
  const explicitStatus = coerceRefundWorkflowStatus(record.refundStatus);
  if (explicitStatus) {
    return explicitStatus;
  }

  const workflowStatus = canonicalizeWorkflowStatus(record.workflowStatus ?? record.status);
  if (workflowStatus === 'PENDING_PAYMENT_CONFIRMATION') {
    return 'LOCKED_UNTIL_PAYMENT_CONFIRMED';
  }

  if (workflowStatus === 'ACCEPTED_FOR_REFUND') {
    return 'PENDING';
  }

  if (workflowStatus === 'COMPLETED' || workflowStatus === 'REFUNDED' || workflowStatus === 'CLOSED') {
    return 'REFUNDED';
  }

  return 'NOT_APPLICABLE';
};

const enrichLegacyWorkflowFields = <T extends Record<string, any>>(record: T): T & {
  workflowStatus: string | null;
  refundStatus: string;
  statusBucket: string;
} => ({
  ...record,
  workflowStatus: record.workflowStatus
    ? canonicalizeWorkflowStatus(record.workflowStatus)
    : (canonicalizeWorkflowStatus(record.status) || null),
  statusBucket: record.statusBucket ?? bucketWorkflowStatus(record.workflowStatus ?? record.status),
  refundStatus: deriveLegacyRefundStatus(record),
});

const mapReturnRequestItemsToLegacy = (items: unknown) => {
  if (!Array.isArray(items)) {
    return items;
  }

  return items.map((item: any) => ({
    ...{
      returnRequestItemId: item.returnRequestItemId,
      orderItemId: item.orderItemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice ?? null,
      requestedRefundAmount: item.requestedRefundAmount ?? null,
      orderItemGrossAmount: item.orderItemGrossAmount ?? null,
      orderItemAllocatedDiscountAmount: item.orderItemAllocatedDiscountAmount ?? null,
      orderItemNetPaidAmount: item.orderItemNetPaidAmount ?? null,
      reason: item.reason ?? null,
      reasonText: item.reasonText ?? null,
    },
    ...(Array.isArray(item.attachments)
      ? {
          attachments: item.attachments.map((attachment: any) => ({
            attachmentId: attachment.attachmentId ?? null,
            returnRequestItemId: attachment.returnRequestItemId ?? null,
            fileUrl: attachment.fileUrl,
          })),
        }
      : {}),
    ...(typeof item.orderItem !== 'undefined' ? { orderItem: item.orderItem } : {}),
  }));
};

const mapRefundTransactionsToLegacy = (refundTransactions: unknown) => {
  if (!Array.isArray(refundTransactions)) {
    return refundTransactions;
  }

  return refundTransactions.map((transaction: any) => ({
    transactionId: transaction.transactionId ?? transaction.refundTransactionId,
    refundTransactionId: transaction.refundTransactionId ?? transaction.transactionId,
    amount: transaction.amount ?? null,
    method: transaction.method ?? null,
    status: transaction.status ?? null,
    transactionRef: transaction.transactionRef ?? null,
  }));
};

const mergeLegacyNormalizedRecord = (
  legacyRecord: any,
  modernRecord: any,
) => {
  if (!legacyRecord) {
    return modernRecord;
  }

  if (!modernRecord) {
    return legacyRecord;
  }

  const legacyProofImages = Array.isArray(legacyRecord.proofImages)
    ? legacyRecord.proofImages
    : EMPTY_PROOF_IMAGES;

  return {
    ...legacyRecord,
    orderId: legacyRecord.orderId ?? modernRecord.orderId,
    userId: legacyRecord.userId ?? modernRecord.userId ?? null,
    reason: legacyRecord.reason ?? modernRecord.reason ?? null,
    proofImages: legacyProofImages.length > 0 ? legacyProofImages : modernRecord.proofImages,
    workflowStatus: modernRecord.workflowStatus ?? legacyRecord.workflowStatus,
    statusBucket: modernRecord.statusBucket ?? legacyRecord.statusBucket,
    refundStatus: modernRecord.refundStatus ?? legacyRecord.refundStatus,
    totalRefundAmount: modernRecord.totalRefundAmount ?? legacyRecord.totalRefundAmount ?? null,
    refundableCapAmount: modernRecord.refundableCapAmount ?? legacyRecord.refundableCapAmount ?? null,
    economicsSummary: modernRecord.economicsSummary ?? legacyRecord.economicsSummary ?? undefined,
    financeNote: modernRecord.financeNote ?? legacyRecord.financeNote ?? null,
    financeNoteUpdatedAt:
      modernRecord.financeNoteUpdatedAt ?? legacyRecord.financeNoteUpdatedAt ?? null,
    financeNoteUpdatedBy:
      modernRecord.financeNoteUpdatedBy ?? legacyRecord.financeNoteUpdatedBy ?? null,
    items: modernRecord.items ?? legacyRecord.items,
    refundTransactions:
      modernRecord.refundTransactions ?? legacyRecord.refundTransactions ?? undefined,
    adminNote: legacyRecord.adminNote ?? modernRecord.adminNote ?? null,
    createdAt: legacyRecord.createdAt ?? modernRecord.createdAt,
    updatedAt: legacyRecord.updatedAt ?? modernRecord.updatedAt,
    order: legacyRecord.order ?? modernRecord.order,
    user: legacyRecord.user ?? modernRecord.user,
  };
};

export const parseLegacyProofImages = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value !== 'string') {
    return EMPTY_PROOF_IMAGES;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : EMPTY_PROOF_IMAGES;
  } catch {
    return EMPTY_PROOF_IMAGES;
  }
};

export const mapReturnRequestDetailToLegacy = (record: any) => {
  const refundTransactions = mapRefundTransactionsToLegacy(record.refundTransactions);

  return enrichLegacyWorkflowFields({
    returnId: record.returnRequestId,
    orderId: record.orderId,
    userId: record.userId ?? null,
    reason: record.reason,
    proofImages: (record.attachments ?? []).map((attachment: any) => attachment.fileUrl),
    status: record.status,
    workflowStatus: record.workflowStatus,
    statusBucket: record.statusBucket,
    refundStatus: record.refundStatus,
    totalRefundAmount: record.totalRefundAmount ?? null,
    refundableCapAmount: record.refundableCapAmount ?? null,
    economicsSummary: record.economicsSummary ?? undefined,
    financeNote: record.financeNote ?? null,
    financeNoteUpdatedAt: record.financeNoteUpdatedAt ?? null,
    financeNoteUpdatedBy: record.financeNoteUpdatedBy ?? null,
    items: mapReturnRequestItemsToLegacy(record.items),
    ...(typeof refundTransactions !== 'undefined' ? { refundTransactions } : {}),
    adminNote: getLatestMeaningfulComment(record.statusLogs) ?? record.note ?? null,
    ...(typeof record.createdAt !== 'undefined' ? { createdAt: record.createdAt } : {}),
    ...(typeof record.updatedAt !== 'undefined' || typeof record.createdAt !== 'undefined'
      ? { updatedAt: record.updatedAt ?? record.createdAt }
      : {}),
    ...(record.order
      ? {
          order: {
            orderNumber: record.order.orderNumber ?? `RET-${record.returnRequestId}`,
            totalAmount: String(record.order.totalAmount ?? '0'),
            customerName: record.order.customerName ?? record.user?.fullName ?? '',
            customerPhone: record.order.customerPhone ?? '',
          },
        }
      : {}),
    user: record.user
      ? {
          userId: record.user.userId,
          fullName: record.user.fullName ?? '',
          email: record.user.email ?? '',
          avatarUrl: record.user.avatarUrl ?? null,
        }
      : null,
  });
};

export const mapReturnRequestListItemToLegacy = (record: any) => {
  const refundTransactions = mapRefundTransactionsToLegacy(record.refundTransactions);

  return enrichLegacyWorkflowFields({
    returnId: record.returnRequestId,
    orderId: record.orderId,
    userId: record.userId ?? null,
    reason: record.reason,
    proofImages: (record.attachments ?? []).map((attachment: any) => attachment.fileUrl),
    status: record.status,
    workflowStatus: record.workflowStatus,
    statusBucket: record.statusBucket,
    refundStatus: record.refundStatus,
    totalRefundAmount: record.totalRefundAmount ?? null,
    refundableCapAmount: record.refundableCapAmount ?? null,
    economicsSummary: record.economicsSummary ?? undefined,
    financeNote: record.financeNote ?? null,
    financeNoteUpdatedAt: record.financeNoteUpdatedAt ?? null,
    financeNoteUpdatedBy: record.financeNoteUpdatedBy ?? null,
    items: mapReturnRequestItemsToLegacy(record.items),
    ...(typeof refundTransactions !== 'undefined' ? { refundTransactions } : {}),
    adminNote: record.note ?? null,
    ...(typeof record.createdAt !== 'undefined' ? { createdAt: record.createdAt } : {}),
    ...(typeof record.updatedAt !== 'undefined' || typeof record.createdAt !== 'undefined'
      ? { updatedAt: record.updatedAt ?? record.createdAt }
      : {}),
    ...(record.order
      ? {
          order: {
            orderNumber: record.order.orderNumber ?? `RET-${record.returnRequestId}`,
            totalAmount: String(record.order.totalAmount ?? '0'),
            customerName: record.order.customerName ?? record.user?.fullName ?? '',
            customerPhone: record.order.customerPhone ?? '',
          },
        }
      : {}),
    user: record.user
      ? {
          userId: record.user.userId,
          fullName: record.user.fullName ?? '',
          email: record.user.email ?? '',
          avatarUrl: record.user.avatarUrl ?? null,
        }
      : null,
  });
};

export const mapLegacyRouteReturnListItem = (record: any) => enrichLegacyWorkflowFields({
  ...record,
  statusBucket: record.statusBucket,
  proofImages: parseLegacyProofImages(record.proofImages),
  economicsSummary: record.economicsSummary ?? undefined,
  refundTransactions: mapRefundTransactionsToLegacy(record.refundTransactions),
});

export const shouldFallbackToReturnRequestList = (legacyData: {
  returns: unknown[];
  pagination?: { total?: number };
}) =>
  legacyData.returns.length === 0 &&
  (legacyData.pagination?.total ?? EMPTY_LEGACY_PAGINATION.total) === 0;

export const mapReturnRequestAdminListToLegacy = (fallbackData: {
  data: any[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}, legacyData?: {
  returns: any[];
  pagination?: { page?: number; pageSize?: number; total?: number; totalPages?: number };
}) => {
  if (!legacyData) {
    return {
      returns: fallbackData.data.map(mapReturnRequestListItemToLegacy),
      pagination: {
        page: fallbackData.page,
        pageSize: fallbackData.limit,
        total: fallbackData.total,
        totalPages: fallbackData.totalPages,
      },
    };
  }

  const modernByOrderId = new Map(
    fallbackData.data
      .map((item) => [item.orderId, mapReturnRequestListItemToLegacy(item)] as const),
  );

  return {
    returns: legacyData.returns.map((item) =>
      mergeLegacyNormalizedRecord(
        mapLegacyRouteReturnListItem(item),
        modernByOrderId.get(item.orderId) ?? null,
      )),
    pagination: {
      page: legacyData.pagination?.page ?? fallbackData.page,
      pageSize: legacyData.pagination?.pageSize ?? fallbackData.limit,
      total: legacyData.pagination?.total ?? fallbackData.total,
      totalPages: legacyData.pagination?.totalPages ?? fallbackData.totalPages,
    },
  };
};

export const resolveLegacyOrderReturnData = (
  legacyRecord: any,
  detailRecord: any,
) => mergeLegacyNormalizedRecord(
  legacyRecord ? mapLegacyRouteReturnListItem(legacyRecord) : null,
  detailRecord ? mapReturnRequestDetailToLegacy(detailRecord) : null,
);

export const buildLegacyCustomerReturnsPayload = (params: {
  legacyReturns: any[];
  legacyTotal: number;
  fallbackResult: null | {
    data: any[];
    total: number;
    limit: number;
  };
  page: number;
  limit: number;
}) => {
  const modernByOrderId = new Map(
    (params.fallbackResult?.data ?? [])
      .map((item) => [item.orderId, mapReturnRequestListItemToLegacy(item)] as const),
  );
  const returns = params.fallbackResult
    ? params.legacyReturns.length > 0
      ? params.legacyReturns.map((item) =>
          mergeLegacyNormalizedRecord(
            mapLegacyRouteReturnListItem(item),
            modernByOrderId.get(item.orderId) ?? null,
          ))
      : params.fallbackResult.data.map(mapReturnRequestListItemToLegacy)
    : params.legacyReturns.map(mapLegacyRouteReturnListItem);
  const total = params.legacyReturns.length > 0
    ? params.legacyTotal
    : params.fallbackResult
      ? params.fallbackResult.total
      : params.legacyTotal;
  const pageSize = params.legacyReturns.length > 0
    ? params.limit
    : params.fallbackResult
      ? params.fallbackResult.limit
      : params.limit;

  return {
    returns,
    pagination: {
      page: params.page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

export const resolveLegacyRouteDetailData = (
  legacyRecord: any,
  fallbackDetail: any,
) => {
  const baseRecord = mergeLegacyNormalizedRecord(
    legacyRecord ? mapLegacyRouteReturnListItem(legacyRecord) : null,
    fallbackDetail ? mapReturnRequestDetailToLegacy(fallbackDetail) : null,
  );
  if (!baseRecord) {
    return null;
  }

  return {
    ...baseRecord,
    proofImages: parseLegacyProofImages(baseRecord.proofImages),
  };
};
