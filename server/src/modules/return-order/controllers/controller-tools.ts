import { Request, Response } from 'express';
import { logger } from '../../../lib/logger';
import { ReturnRequestService, ServiceError } from '../services/request.service';

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
