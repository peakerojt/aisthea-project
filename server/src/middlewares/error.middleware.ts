import { NextFunction, Request, Response } from 'express';
import { t } from '../i18n';
import { resolveRequestLocale } from './locale.middleware';
import { logger } from '../lib/logger';

export class AppError extends Error {
  statusCode: number;
  errorCode: string;
  messageKey: string;
  messageParams?: Record<string, unknown>;
  details?: unknown;

  constructor(
    statusCode: number,
    errorCode: string,
    messageKey: string,
    messageParams?: Record<string, unknown>,
    details?: unknown,
  ) {
    super(messageKey);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.messageKey = messageKey;
    this.messageParams = messageParams;
    this.details = details;
  }
}

export class AppErrorWithData extends AppError {
  data: Record<string, unknown>;

  constructor(
    statusCode: number,
    errorCode: string,
    messageKey: string,
    data: Record<string, unknown>,
    messageParams?: Record<string, unknown>,
    details?: unknown,
  ) {
    super(statusCode, errorCode, messageKey, messageParams, details);
    this.data = data;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  const locale = resolveRequestLocale(req);
  const message = t(locale, 'common:errors.notFoundRoute', {
    method: req.method,
    url: req.originalUrl,
  });

  res.status(404).json({
    success: false,
    statusCode: 404,
    errorCode: 'NOT_FOUND',
    code: 'NOT_FOUND',
    messageKey: 'common:errors.notFoundRoute',
    message,
  });
}

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction) {
  const locale = resolveRequestLocale(req);
  const isProd = process.env.NODE_ENV === 'production';

  if (error instanceof AppError) {
    const message = t(locale, error.messageKey, error.messageParams);

    logger.error('[AppError]', {
      traceId: req.traceId,
      errorCode: error.errorCode,
      messageKey: error.messageKey,
      statusCode: error.statusCode,
      url: req.originalUrl,
      method: req.method,
    });

    return res.status(error.statusCode).json({
      success: false,
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      code: error.errorCode,
      messageKey: error.messageKey,
      ...(error.messageParams ? { messageParams: error.messageParams } : {}),
      ...(error instanceof AppErrorWithData ? { data: error.data } : {}),
      message,
      ...(isProd ? {} : { details: error.details }), // Hide sensitive details in prod if needed, or keep them. Often AppError details are safe (like validation mismatches)
    });
  }

  // Log full stack internally
    logger.error('[UnhandledError]', {
    traceId: req.traceId,
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Strict JSON payload to client, NEVER leak stack trace
  return res.status(500).json({
    success: false,
    statusCode: 500,
    errorCode: 'INTERNAL_SERVER_ERROR',
    code: 'INTERNAL_SERVER_ERROR',
    messageKey: 'common:errors.internalServer',
    message: t(locale, 'common:errors.internalServer'),
    ...(isProd ? {} : { stack: error.stack }), // Only send stack trace in local dev mode
  });
}
