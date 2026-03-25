import { ServiceError } from '../modules/return-order/services/return-request.service';

export type LegacyProcessAction = 'APPROVE' | 'REJECT' | 'COMPLETE_REFUND';

export const LEGACY_PROCESS_ACTIONS: LegacyProcessAction[] = [
  'APPROVE',
  'REJECT',
  'COMPLETE_REFUND',
];

export const LEGACY_REFUND_IDEMPOTENCY_PREFIX = 'legacy-return-refund';

export const mapCreateReturnRequestToLegacy = (record: {
  returnRequestId: number;
  orderId: number;
  status: string;
}) => ({
  returnId: record.returnRequestId,
  orderId: record.orderId,
  status: record.status,
});

type LegacyCreateCompatBridge = {
  createLegacyCompatibleReturnRequest: (
    userId: number,
    payload: { orderId: number; reason: string; proofImages: string[] },
  ) => Promise<{
    returnRequestId: number;
    orderId: number;
    status: string;
  }>;
};

type LegacyCreateFallback = (
  orderId: number,
  userId: number,
  roles: string[],
  reason: string,
  proofImages: string[],
) => Promise<unknown>;

type ReturnRequestWriteBridge = {
  approveReturnRequest: (returnId: number, actorId: number) => Promise<unknown>;
  rejectReturnRequest: (returnId: number, actorId: number, reason: string) => Promise<unknown>;
  getReturnDetail: (returnId: number) => Promise<{ status?: string } | null>;
  markReturnReceived: (returnId: number, actorId: number) => Promise<unknown>;
  refundReturnRequest: (
    returnId: number,
    actorId: number,
    params: { method: 'ORIGINAL_PAYMENT'; idempotencyKey: string },
  ) => Promise<unknown>;
};

export const processReturnWithModernFallback = async (
  service: ReturnRequestWriteBridge,
  returnId: number,
  adminUserId: number,
  action: LegacyProcessAction,
  note?: string,
) => {
  if (action === 'APPROVE') {
    await service.approveReturnRequest(returnId, adminUserId);
    return { success: true, code: 'RETURN_APPROVED' };
  }

  if (action === 'REJECT') {
    await service.rejectReturnRequest(
      returnId,
      adminUserId,
      note ?? 'Return request rejected.',
    );
    return { success: true, code: 'RETURN_REJECTED' };
  }

  const detail = await service.getReturnDetail(returnId);
  if (!detail) {
    throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);
  }

  const currentStatus = String(detail.status ?? '').toUpperCase();
  if (currentStatus === 'REQUESTED') {
    await service.approveReturnRequest(returnId, adminUserId);
  }

  if (currentStatus === 'REQUESTED' || currentStatus === 'APPROVED') {
    await service.markReturnReceived(returnId, adminUserId);
  }

  await service.refundReturnRequest(returnId, adminUserId, {
    method: 'ORIGINAL_PAYMENT',
    idempotencyKey: `${LEGACY_REFUND_IDEMPOTENCY_PREFIX}-${returnId}`,
  });

  return { success: true, code: 'REFUND_COMPLETED' };
};

export const createReturnWithModernFallback = async (
  service: LegacyCreateCompatBridge,
  params: {
    orderId: number;
    userId: number;
    roles: string[];
    reason: string;
    proofImages: string[];
  },
  fallback: LegacyCreateFallback,
) => {
  try {
    const compatResult = await service.createLegacyCompatibleReturnRequest(params.userId, {
      orderId: params.orderId,
      reason: params.reason,
      proofImages: params.proofImages,
    });

    return mapCreateReturnRequestToLegacy(compatResult);
  } catch (error) {
    if (
      error instanceof ServiceError &&
      error.code === 'LEGACY_CREATE_REQUIRES_ITEM_SELECTION'
    ) {
      return fallback(
        params.orderId,
        params.userId,
        params.roles,
        params.reason,
        params.proofImages,
      );
    }

    throw error;
  }
};
