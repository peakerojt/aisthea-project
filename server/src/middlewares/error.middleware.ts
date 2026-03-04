import { NextFunction, Request, Response } from 'express';
import { t } from '../i18n';
import { resolveRequestLocale } from './locale.middleware';

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

export function notFoundHandler(req: Request, res: Response) {
  const locale = resolveRequestLocale(req);
  const message = t(locale, 'common:errors.notFoundRoute', {
    method: req.method,
    url: req.originalUrl,
  });

  res.status(404).json({
    success: false,
    errorCode: 'NOT_FOUND',
    messageKey: 'common:errors.notFoundRoute',
    message,
  });
}

export function errorHandler(error: Error, req: Request, res: Response, _next: NextFunction) {
  const locale = resolveRequestLocale(req);

  if (error instanceof AppError) {
    const message = t(locale, error.messageKey, error.messageParams);

    console.error('[AppError]', {
      errorCode: error.errorCode,
      messageKey: error.messageKey,
      statusCode: error.statusCode,
    });

    return res.status(error.statusCode).json({
      success: false,
      errorCode: error.errorCode,
      messageKey: error.messageKey,
      message,
      details: error.details,
    });
  }

  console.error('[UnhandledError]', {
    message: error.message,
    stack: error.stack,
  });

  return res.status(500).json({
    success: false,
    errorCode: 'INTERNAL_SERVER_ERROR',
    messageKey: 'common:errors.internalServer',
    message: t(locale, 'common:errors.internalServer'),
  });
}
