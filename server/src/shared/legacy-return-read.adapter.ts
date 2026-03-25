const CUSTOMER_CREATED_COMMENT = 'Customer created return request';
const EMPTY_LEGACY_PAGINATION = { page: 1, pageSize: 20, total: 0, totalPages: 0 };
const EMPTY_PROOF_IMAGES: string[] = [];

const getLatestMeaningfulComment = (statusLogs?: Array<{ comment?: string | null }>) =>
  [...(statusLogs ?? [])]
    .reverse()
    .find((log) => log?.comment && log.comment !== CUSTOMER_CREATED_COMMENT)?.comment ?? null;

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

export const mapReturnRequestDetailToLegacy = (record: any) => ({
  returnId: record.returnRequestId,
  orderId: record.orderId,
  userId: record.userId ?? null,
  reason: record.reason,
  proofImages: (record.attachments ?? []).map((attachment: any) => attachment.fileUrl),
  status: record.status,
  adminNote: getLatestMeaningfulComment(record.statusLogs) ?? record.note ?? null,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt ?? record.createdAt,
  order: record.order
    ? {
        orderNumber: record.order.orderNumber ?? `RET-${record.returnRequestId}`,
        totalAmount: String(record.order.totalAmount ?? '0'),
        customerName: record.order.customerName ?? record.user?.fullName ?? '',
        customerPhone: record.order.customerPhone ?? '',
      }
    : undefined,
  user: record.user
    ? {
        userId: record.user.userId,
        fullName: record.user.fullName ?? '',
        email: record.user.email ?? '',
        avatarUrl: record.user.avatarUrl ?? null,
      }
    : null,
});

export const mapReturnRequestListItemToLegacy = (record: any) => ({
  returnId: record.returnRequestId,
  orderId: record.orderId,
  userId: record.userId ?? null,
  reason: record.reason,
  proofImages: (record.attachments ?? []).map((attachment: any) => attachment.fileUrl),
  status: record.status,
  adminNote: record.note ?? null,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt ?? record.createdAt,
  order: record.order
    ? {
        orderNumber: record.order.orderNumber ?? `RET-${record.returnRequestId}`,
        totalAmount: String(record.order.totalAmount ?? '0'),
        customerName: record.order.customerName ?? record.user?.fullName ?? '',
        customerPhone: record.order.customerPhone ?? '',
      }
    : undefined,
  user: record.user
    ? {
        userId: record.user.userId,
        fullName: record.user.fullName ?? '',
        email: record.user.email ?? '',
        avatarUrl: record.user.avatarUrl ?? null,
      }
    : null,
});

export const mapLegacyRouteReturnListItem = (record: any) => ({
  ...record,
  proofImages: parseLegacyProofImages(record.proofImages),
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
}) => ({
  returns: fallbackData.data.map(mapReturnRequestListItemToLegacy),
  pagination: {
    page: fallbackData.page,
    pageSize: fallbackData.limit,
    total: fallbackData.total,
    totalPages: fallbackData.totalPages,
  },
});

export const resolveLegacyOrderReturnData = (
  legacyRecord: any,
  detailRecord: any,
) => legacyRecord ?? (detailRecord ? mapReturnRequestDetailToLegacy(detailRecord) : null);

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
  const returns = params.fallbackResult
    ? params.fallbackResult.data.map(mapReturnRequestListItemToLegacy)
    : params.legacyReturns.map(mapLegacyRouteReturnListItem);
  const total = params.fallbackResult ? params.fallbackResult.total : params.legacyTotal;
  const pageSize = params.fallbackResult ? params.fallbackResult.limit : params.limit;

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
  const baseRecord = legacyRecord ?? (fallbackDetail ? mapReturnRequestDetailToLegacy(fallbackDetail) : null);
  if (!baseRecord) {
    return null;
  }

  return {
    ...baseRecord,
    proofImages: parseLegacyProofImages(baseRecord.proofImages),
  };
};
