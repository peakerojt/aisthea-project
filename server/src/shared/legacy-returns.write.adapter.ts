import {
  type ReturnWorkflowActor,
  ServiceError,
} from '../modules/return-order/services/request.service';
import { resolveWorkflowAccess } from './role-access';
import {
  type LegacyProcessAction,
  type LegacyRefundStatusAction,
} from './legacy-returns.process.types';

export const LEGACY_REFUND_IDEMPOTENCY_PREFIX = 'legacy-return-refund';

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

export const mapCreateReturnRequestToLegacy = (record: {
  returnRequestId: number;
  orderId: number;
  status: string;
  statusBucket?: string;
  workflowStatus?: string;
  refundStatus?: string;
}) => ({
  returnId: record.returnRequestId,
  orderId: record.orderId,
  status: record.status,
  statusBucket: record.statusBucket,
  workflowStatus: canonicalizeWorkflowStatus(record.workflowStatus ?? record.status),
  refundStatus: record.refundStatus ?? 'NOT_APPLICABLE',
});

type LegacyCreateCompatBridge = {
  createLegacyCompatibleReturnRequest: (
    userId: number,
    payload: { orderId: number; reason: string; proofImages: string[] },
  ) => Promise<{
    returnRequestId: number;
    orderId: number;
    status: string;
    statusBucket?: string;
    workflowStatus?: string;
    refundStatus?: string;
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
  approveReturnRequest: (
    returnId: number,
    actorId: number,
    actor: ReturnWorkflowActor,
  ) => Promise<unknown>;
  rejectReturnRequest: (
    returnId: number,
    actorId: number,
    reason: string,
    actor: ReturnWorkflowActor,
  ) => Promise<unknown>;
  getReturnDetail: (
    returnId: number,
    actor: ReturnWorkflowActor,
  ) => Promise<{
    status?: string;
    workflowStatus?: string;
    refundStatus?: string;
  } | null>;
  markReturnInTransit: (
    returnId: number,
    actorId: number,
    actor: ReturnWorkflowActor,
  ) => Promise<unknown>;
  markReturnReceived: (
    returnId: number,
    actorId: number,
    actor: ReturnWorkflowActor,
  ) => Promise<unknown>;
  acceptReturnForRefund: (
    returnId: number,
    actorId: number,
    actor: ReturnWorkflowActor,
  ) => Promise<unknown>;
  updateRefundStatus: (
    returnId: number,
    actorId: number,
    payload: {
      refundStatus: 'PENDING' | 'PROCESSING' | 'FAILED' | 'MANUAL_REVIEW';
      comment?: string;
    },
    actor: ReturnWorkflowActor,
  ) => Promise<unknown>;
  refundReturnRequest: (
    returnId: number,
    actorId: number,
    params: { method: 'ORIGINAL_PAYMENT'; idempotencyKey: string },
    actor: ReturnWorkflowActor,
  ) => Promise<unknown>;
};

const REQUESTED_WORKFLOW_STATUSES = new Set([
  'REQUESTED',
  'PENDING_APPROVAL',
  'PENDING_ADMIN_REVIEW',
  'SUBMITTED',
]);

const REFUND_STATUS_ACTIONS: Record<
  Extract<
    LegacyProcessAction,
    'SET_REFUND_PENDING' | 'SET_REFUND_PROCESSING' | 'SET_REFUND_FAILED' | 'SET_REFUND_MANUAL_REVIEW'
  >,
  'PENDING' | 'PROCESSING' | 'FAILED' | 'MANUAL_REVIEW'
> = {
  SET_REFUND_PENDING: 'PENDING',
  SET_REFUND_PROCESSING: 'PROCESSING',
  SET_REFUND_FAILED: 'FAILED',
  SET_REFUND_MANUAL_REVIEW: 'MANUAL_REVIEW',
};

const ACTION_SUCCESS_CODES: Record<LegacyProcessAction, string> = {
  APPROVE: 'RETURN_APPROVED',
  REJECT: 'RETURN_REJECTED',
  MARK_IN_TRANSIT: 'RETURN_MARKED_IN_TRANSIT',
  MARK_RECEIVED: 'RETURN_MARKED_RECEIVED',
  ACCEPT_FOR_REFUND: 'RETURN_ACCEPTED_FOR_REFUND',
  SET_REFUND_PENDING: 'RETURN_REFUND_PENDING',
  SET_REFUND_PROCESSING: 'RETURN_REFUND_PROCESSING',
  SET_REFUND_FAILED: 'RETURN_REFUND_FAILED',
  SET_REFUND_MANUAL_REVIEW: 'RETURN_REFUND_MANUAL_REVIEW',
  COMPLETE_REFUND: 'REFUND_COMPLETED',
};

const buildLegacyAdminWorkflowActor = (actorId: number): ReturnWorkflowActor => {
  const workflowAccess = resolveWorkflowAccess(['admin']);

  return {
    actorId,
    rawRoles: workflowAccess.rawRoles,
    businessRole: workflowAccess.businessRole,
    canManageReturnWorkflow: workflowAccess.canManageReturnWorkflow,
    canManageRefundWorkflow: workflowAccess.canManageRefundWorkflow,
  };
};

const getCanonicalFallbackDetail = async (
  service: ReturnRequestWriteBridge,
  returnId: number,
  adminUserId: number,
) => {
  const detail = await service.getReturnDetail(returnId, buildLegacyAdminWorkflowActor(adminUserId));
  if (!detail) {
    throw new ServiceError('RETURN_REQUEST_NOT_FOUND', 'Return request not found', 404);
  }

  return {
    detail,
    currentStatus: canonicalizeWorkflowStatus(detail.workflowStatus ?? detail.status),
  };
};

const ensureRefundPhaseUnlocked = (detail: {
  refundStatus?: string;
}) => {
  if (normalizeWorkflowStatus(detail.refundStatus) === 'LOCKED_UNTIL_PAYMENT_CONFIRMED') {
    throw new ServiceError(
      'RETURN_REFUND_LOCKED',
      'Refund is locked until payment confirmation is completed',
      409,
    );
  }
};

const advanceToApproved = async (
  service: ReturnRequestWriteBridge,
  returnId: number,
  adminUserId: number,
  currentStatus: string,
) => {
  const workflowActor = buildLegacyAdminWorkflowActor(adminUserId);
  if (REQUESTED_WORKFLOW_STATUSES.has(currentStatus)) {
    await service.approveReturnRequest(returnId, adminUserId, workflowActor);
    return 'APPROVED';
  }

  return currentStatus;
};

const advanceToInTransit = async (
  service: ReturnRequestWriteBridge,
  returnId: number,
  adminUserId: number,
  currentStatus: string,
) => {
  const workflowActor = buildLegacyAdminWorkflowActor(adminUserId);
  const approvedStatus = await advanceToApproved(service, returnId, adminUserId, currentStatus);

  if (approvedStatus === 'APPROVED') {
    await service.markReturnInTransit(returnId, adminUserId, workflowActor);
    return 'IN_RETURN_TRANSIT';
  }

  return approvedStatus;
};

const advanceToRefundReady = async (
  service: ReturnRequestWriteBridge,
  returnId: number,
  adminUserId: number,
  detail: { refundStatus?: string; status?: string; workflowStatus?: string },
) => {
  ensureRefundPhaseUnlocked(detail);

  let currentStatus = await advanceToInTransit(
    service,
    returnId,
    adminUserId,
    canonicalizeWorkflowStatus(detail.workflowStatus ?? detail.status),
  );

  if (currentStatus === 'IN_RETURN_TRANSIT') {
    await service.markReturnReceived(
      returnId,
      adminUserId,
      buildLegacyAdminWorkflowActor(adminUserId),
    );
    currentStatus = 'RECEIVED_AND_INSPECTING';
  }

  if (currentStatus === 'RECEIVED' || currentStatus === 'RECEIVED_AND_INSPECTING') {
    await service.acceptReturnForRefund(
      returnId,
      adminUserId,
      buildLegacyAdminWorkflowActor(adminUserId),
    );
    currentStatus = 'ACCEPTED_FOR_REFUND';
  }

  return currentStatus;
};

export const approveLegacyReturnWithModernFallback = async (
  service: ReturnRequestWriteBridge,
  returnId: number,
  adminUserId: number,
) => {
  await service.approveReturnRequest(
    returnId,
    adminUserId,
    buildLegacyAdminWorkflowActor(adminUserId),
  );
  return { success: true, code: ACTION_SUCCESS_CODES.APPROVE };
};

export const rejectLegacyReturnWithModernFallback = async (
  service: ReturnRequestWriteBridge,
  returnId: number,
  adminUserId: number,
  note?: string,
) => {
  await service.rejectReturnRequest(
    returnId,
    adminUserId,
    note ?? 'Return request rejected.',
    buildLegacyAdminWorkflowActor(adminUserId),
  );
  return { success: true, code: ACTION_SUCCESS_CODES.REJECT };
};

export const markLegacyReturnInTransitWithModernFallback = async (
  service: ReturnRequestWriteBridge,
  returnId: number,
  adminUserId: number,
) => {
  const { currentStatus } = await getCanonicalFallbackDetail(service, returnId, adminUserId);
  await advanceToInTransit(service, returnId, adminUserId, currentStatus);
  return { success: true, code: ACTION_SUCCESS_CODES.MARK_IN_TRANSIT };
};

export const markLegacyReturnReceivedWithModernFallback = async (
  service: ReturnRequestWriteBridge,
  returnId: number,
  adminUserId: number,
) => {
  const { detail } = await getCanonicalFallbackDetail(service, returnId, adminUserId);
  await advanceToRefundReady(service, returnId, adminUserId, detail);
  return { success: true, code: ACTION_SUCCESS_CODES.MARK_RECEIVED };
};

export const acceptLegacyReturnForRefundWithModernFallback = async (
  service: ReturnRequestWriteBridge,
  returnId: number,
  adminUserId: number,
) => {
  const { detail } = await getCanonicalFallbackDetail(service, returnId, adminUserId);
  await advanceToRefundReady(service, returnId, adminUserId, detail);
  return { success: true, code: ACTION_SUCCESS_CODES.ACCEPT_FOR_REFUND };
};

export const updateLegacyReturnRefundStatusWithModernFallback = async (
  service: ReturnRequestWriteBridge,
  returnId: number,
  adminUserId: number,
  action: LegacyRefundStatusAction,
  note?: string,
) => {
  const { detail } = await getCanonicalFallbackDetail(service, returnId, adminUserId);
  await advanceToRefundReady(service, returnId, adminUserId, detail);
  await service.updateRefundStatus(returnId, adminUserId, {
    refundStatus: REFUND_STATUS_ACTIONS[action],
    ...(note ? { comment: note } : {}),
  }, buildLegacyAdminWorkflowActor(adminUserId));

  return { success: true, code: ACTION_SUCCESS_CODES[action] };
};

export const completeLegacyReturnRefundWithModernFallback = async (
  service: ReturnRequestWriteBridge,
  returnId: number,
  adminUserId: number,
) => {
  const { detail } = await getCanonicalFallbackDetail(service, returnId, adminUserId);
  await advanceToRefundReady(service, returnId, adminUserId, detail);
  await service.refundReturnRequest(returnId, adminUserId, {
    method: 'ORIGINAL_PAYMENT',
    idempotencyKey: `${LEGACY_REFUND_IDEMPOTENCY_PREFIX}-${returnId}`,
  }, buildLegacyAdminWorkflowActor(adminUserId));

  return { success: true, code: ACTION_SUCCESS_CODES.COMPLETE_REFUND };
};

export const processReturnWithModernFallback = async (
  service: ReturnRequestWriteBridge,
  returnId: number,
  adminUserId: number,
  action: LegacyProcessAction,
  note?: string,
) => {
  if (action === 'APPROVE') {
    return approveLegacyReturnWithModernFallback(service, returnId, adminUserId);
  }

  if (action === 'REJECT') {
    return rejectLegacyReturnWithModernFallback(service, returnId, adminUserId, note);
  }

  if (action === 'MARK_IN_TRANSIT' || action === 'MARK_RECEIVED' || action === 'ACCEPT_FOR_REFUND') {
    if (action === 'MARK_IN_TRANSIT') {
      return markLegacyReturnInTransitWithModernFallback(service, returnId, adminUserId);
    }

    if (action === 'MARK_RECEIVED') {
      return markLegacyReturnReceivedWithModernFallback(service, returnId, adminUserId);
    }

    return acceptLegacyReturnForRefundWithModernFallback(service, returnId, adminUserId);
  }

  if (action in REFUND_STATUS_ACTIONS) {
    return updateLegacyReturnRefundStatusWithModernFallback(
      service,
      returnId,
      adminUserId,
      action as LegacyRefundStatusAction,
      note,
    );
  }

  if (action === 'COMPLETE_REFUND') {
    return completeLegacyReturnRefundWithModernFallback(service, returnId, adminUserId);
  }

  throw new ServiceError('INVALID_ACTION', 'Invalid action', 400);
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
  _fallback: LegacyCreateFallback,
) => {
  const compatResult = await service.createLegacyCompatibleReturnRequest(params.userId, {
    orderId: params.orderId,
    reason: params.reason,
    proofImages: params.proofImages,
  });

  return mapCreateReturnRequestToLegacy(compatResult);
};
