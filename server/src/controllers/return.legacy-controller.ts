import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  ReturnError,
  requestReturn,
  processReturn,
  listReturns,
  getReturnForOrder,
} from '../services/return.service';
import {
  ReturnRequestService,
  ServiceError,
} from '../modules/return-order/services/return-request.service';
import { logger } from '../lib/logger';
import { createLegacyReturnAdminHandlers } from './return.admin-handlers';
import { createLegacyReturnOrderHandlers } from './return.order-handlers';

const returnRequestService = new ReturnRequestService();
const sendCode = (res: Response, status: number, code: string) =>
  res.status(status).json({ success: false, code });
const parsePositiveId = (value: unknown): number => Number(value);
const isAdminUser = (req: AuthRequest) => Boolean(req.user?.roles?.includes('Admin'));
const returnRequestAdminBridge = {
  getAdminReturns: (params: { page: number; limit: number; status?: string }) =>
    returnRequestService.getAdminReturns(params as any),
  approveReturnRequest: (returnId: number, actorId: number) =>
    returnRequestService.approveReturnRequest(returnId, actorId),
  rejectReturnRequest: (returnId: number, actorId: number, reason: string) =>
    returnRequestService.rejectReturnRequest(returnId, actorId, reason),
  getReturnDetail: (returnId: number) => returnRequestService.getReturnDetail(returnId),
  markReturnReceived: (returnId: number, actorId: number) =>
    returnRequestService.markReturnReceived(returnId, actorId),
  refundReturnRequest: (
    returnId: number,
    actorId: number,
    params: { method: 'ORIGINAL_PAYMENT'; idempotencyKey: string },
  ) => returnRequestService.refundReturnRequest(returnId, actorId, params),
};
const returnRequestOrderBridge = {
  createLegacyCompatibleReturnRequest: (
    userId: number,
    payload: { orderId: number; reason: string; proofImages: string[] },
  ) => returnRequestService.createLegacyCompatibleReturnRequest(userId, payload),
  getReturnDetailByOrderId: (orderId: number) =>
    returnRequestService.getReturnDetailByOrderId(orderId),
};

const sendError = (res: Response, error: ReturnError | Error) => {
  if (error instanceof ReturnError) {
    return sendCode(res, error.status, error.code);
  }

  logger.error('[returnController] Unexpected error', { error });
  return sendCode(res, 500, 'INTERNAL_SERVER_ERROR');
};

const sendWriteFallbackError = (res: Response, error: unknown) => {
  if (error instanceof ServiceError) {
    return sendCode(res, error.status, error.code);
  }

  return sendError(res, error as Error);
};

export const { getAdminReturns, patchProcessReturn } = createLegacyReturnAdminHandlers({
  sendCode,
  sendError,
  sendWriteFallbackError,
  parsePositiveId,
  isAdminUser,
  listReturns,
  processReturn,
  returnRequestService: returnRequestAdminBridge,
});

export const { getOrderReturn, postReturnRequest } = createLegacyReturnOrderHandlers({
  sendCode,
  sendError,
  parsePositiveId,
  requestReturn,
  getReturnForOrder,
  returnRequestService: returnRequestOrderBridge,
});
