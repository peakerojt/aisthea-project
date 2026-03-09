import { Request, Response } from 'express';
import { ReturnRequestService, ServiceError } from '../services/return-request.service';
import {
  createReturnRequestSchema,
  idParamSchema,
  listAdminReturnsSchema,
  refundSchema,
  rejectSchema,
} from '../validators/return-request.validator';
import { logger } from '../../../lib/logger';

const service = new ReturnRequestService();

const sendSuccess = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

const sendError = (res: Response, code: string, message: string, status = 400) =>
  res.status(status).json({ success: false, error: { code, message } });

const parseOrError = <T>(schema: { safeParse: (input: unknown) => { success: boolean; data?: T; error?: any } }, input: unknown) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError('VALIDATION_ERROR', parsed.error?.issues?.[0]?.message || 'Validation failed', 400);
  }
  return parsed.data as T;
};

const getRole = (req: any): string => {
  const roles = req.user?.roles;
  if (Array.isArray(roles) && roles.length > 0) {
    const lowered = roles.map((r: string) => r.toLowerCase());
    if (lowered.includes('admin')) return 'admin';
    if (lowered.includes('support')) return 'support';
  }
  return (req.user?.role || 'customer').toLowerCase();
};

const canViewReturn = (role: string) => role === 'admin' || role === 'support';

export class ReturnRequestController {
  create = async (req: Request, res: Response) => {
    try {
      const userId = Number((req as Request & { user?: { userId?: number } }).user?.userId);
      if (!userId) return sendError(res, 'UNAUTHORIZED', 'Unauthorized', 401);

      const body = parseOrError(createReturnRequestSchema, req.body);
      const created = await service.createReturnRequest(userId, body);
      return sendSuccess(res, created, 201);
    } catch (error: unknown) {
      const e = error as { code?: string; message?: string; status?: number };
      logger.error('[returnRequestController] create failed', { code: e.code, message: e.message });
      if (error instanceof ServiceError) {
        return sendError(res, error.code, error.message, error.status);
      }
      return sendError(res, 'CREATE_RETURN_REQUEST_FAILED', e.message || 'Unexpected error', 500);
    }
  };

  myReturns = async (req: any, res: Response) => {
    try {
      const userId = Number(req.user?.userId);
      if (!userId) return sendError(res, 'UNAUTHORIZED', 'Unauthorized', 401);
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 10);
      const result = await service.getMyReturns(userId, page, limit);
      return sendSuccess(res, result);
    } catch (error: any) {
      return sendError(res, 'GET_MY_RETURNS_FAILED', error.message || 'Unexpected error', 500);
    }
  };

  detail = async (req: any, res: Response) => {
    try {
      const { id } = parseOrError(idParamSchema, req.params);
      const data = await service.getReturnDetail(id);
      if (!data) return sendError(res, 'NOT_FOUND', 'Return request not found', 404);

      const role = getRole(req);
      if (!canViewReturn(role) && data.userId !== Number(req.user?.userId)) {
        return sendError(res, 'FORBIDDEN', 'Insufficient access rights', 403);
      }

      return sendSuccess(res, data);
    } catch (error: any) {
      if (error instanceof ServiceError) return sendError(res, error.code, error.message, error.status);
      return sendError(res, 'GET_RETURN_DETAIL_FAILED', error.message || 'Unexpected error', 500);
    }
  };

  adminList = async (req: Request, res: Response) => {
    try {
      const filters = parseOrError(listAdminReturnsSchema, req.query);
      const result = await service.getAdminReturns(filters);
      return sendSuccess(res, result);
    } catch (error: any) {
      if (error instanceof ServiceError) return sendError(res, error.code, error.message, error.status);
      return sendError(res, 'GET_ADMIN_RETURNS_FAILED', error.message || 'Unexpected error', 500);
    }
  };

  approve = async (req: any, res: Response) => {
    try {
      const { id } = parseOrError(idParamSchema, req.params);
      const actorId = Number(req.user?.userId);
      const result = await service.approveReturnRequest(id, actorId);
      return sendSuccess(res, result);
    } catch (error: any) {
      if (error instanceof ServiceError) return sendError(res, error.code, error.message, error.status);
      return sendError(res, 'APPROVE_RETURN_FAILED', error.message || 'Unexpected error', 500);
    }
  };

  reject = async (req: any, res: Response) => {
    try {
      const { id } = parseOrError(idParamSchema, req.params);
      const { reason } = parseOrError(rejectSchema, req.body);
      const actorId = Number(req.user?.userId);
      const result = await service.rejectReturnRequest(id, actorId, reason);
      return sendSuccess(res, result);
    } catch (error: any) {
      if (error instanceof ServiceError) return sendError(res, error.code, error.message, error.status);
      return sendError(res, 'REJECT_RETURN_FAILED', error.message || 'Unexpected error', 500);
    }
  };

  markReceived = async (req: any, res: Response) => {
    try {
      const { id } = parseOrError(idParamSchema, req.params);
      const actorId = Number(req.user?.userId);
      const result = await service.markReturnReceived(id, actorId);
      return sendSuccess(res, result);
    } catch (error: any) {
      if (error instanceof ServiceError) return sendError(res, error.code, error.message, error.status);
      return sendError(res, 'MARK_RECEIVED_FAILED', error.message || 'Unexpected error', 500);
    }
  };

  refund = async (req: any, res: Response) => {
    try {
      const { id } = parseOrError(idParamSchema, req.params);
      const body = parseOrError(refundSchema, req.body);
      const actorId = Number(req.user?.userId);
      const result = await service.refundReturnRequest(id, actorId, body);
      return sendSuccess(res, result);
    } catch (error: any) {
      if (error instanceof ServiceError) return sendError(res, error.code, error.message, error.status);
      return sendError(res, 'REFUND_RETURN_FAILED', error.message || 'Unexpected error', 500);
    }
  };
}
