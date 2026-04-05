import { Request, Response } from 'express';
import { logger } from '../../../lib/logger';
import { resolveWorkflowAccess } from '../../../shared/role-access';
import {
  ReturnRequestService,
  ServiceError,
  type ReturnWorkflowActor,
} from '../services/request.service';

export type AuthenticatedRequest = Request & {
  user?: {
    userId?: number;
    role?: string;
    roles?: string[];
  };
};

export type ParseableSchema<T> = {
  safeParse: (input: unknown) => {
    success: boolean;
    data?: T;
    error?: { issues?: Array<{ message?: string }> };
  };
};

export const sendSuccess = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ success: true, data });

export const sendError = (
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
) =>
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });

export const parseOrError = <T>(schema: ParseableSchema<T>, input: unknown) => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError(
      'VALIDATION_ERROR',
      parsed.error?.issues?.[0]?.message || 'Validation failed',
      400,
    );
  }

  return parsed.data as T;
};

export const getUserId = (req: AuthenticatedRequest): number => Number(req.user?.userId);

const getRawRoles = (req: AuthenticatedRequest): string[] => {
  const directRoles = Array.isArray(req.user?.roles)
    ? req.user.roles.filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
    : [];
  const fallbackRole =
    typeof req.user?.role === 'string' && req.user.role.trim().length > 0
      ? [req.user.role]
      : [];

  return [...new Set([...directRoles, ...fallbackRole])];
};

export const getWorkflowActor = (req: AuthenticatedRequest): ReturnWorkflowActor => {
  const actorId = getUserId(req);
  const workflowAccess = resolveWorkflowAccess({
    role: req.user?.role,
    roles: req.user?.roles,
  });
  const rawRoles = getRawRoles(req);

  return {
    actorId,
    rawRoles: workflowAccess.rawRoles.length > 0 ? workflowAccess.rawRoles : rawRoles,
    businessRole: workflowAccess.businessRole,
    canManageReturnWorkflow: workflowAccess.canManageReturnWorkflow,
    canManageRefundWorkflow: workflowAccess.canManageRefundWorkflow,
  };
};

export const createReturnRequestControllerTools = (
  service = new ReturnRequestService(),
) => {
  const handleUnexpectedError = (
    res: Response,
    error: unknown,
    code: string,
    logScope?: string,
  ) => {
    if (error instanceof ServiceError) {
      return sendError(res, error.code, error.message, error.status, error.details);
    }

    const message = error instanceof Error ? error.message : 'Unexpected error';
    if (logScope) {
      logger.error(logScope, {
        message,
        errorCode: error instanceof ServiceError ? error.code : undefined,
      });
    }

    return sendError(res, code, message, 500);
  };

  const runAction = async (
    res: Response,
    action: () => Promise<unknown>,
    options?: { successStatus?: number; failureCode: string; logScope?: string },
  ) => {
    try {
      const result = await action();
      return sendSuccess(res, result, options?.successStatus);
    } catch (error: unknown) {
      return handleUnexpectedError(
        res,
        error,
        options?.failureCode ?? 'INTERNAL_SERVER_ERROR',
        options?.logScope,
      );
    }
  };

  return {
    service,
    runAction,
  };
};

export type ReturnRequestControllerTools = ReturnType<
  typeof createReturnRequestControllerTools
>;
