import { NextFunction, Request, Response } from 'express';
import { AppLocale, t } from '../i18n';
import { normalizeErrorCode, resolveErrorMessageKey, resolveSuccessMessageKey } from '../i18n/message-key-map';
import { resolveRequestLocale } from './locale.middleware';

type JsonObject = Record<string, unknown>;

const RESPONSE_BYPASS_PREFIXES = ['/api/vnpay'];

const shouldBypassNormalization = (req: Request, body: JsonObject) => {
  if (RESPONSE_BYPASS_PREFIXES.some((prefix) => req.originalUrl.startsWith(prefix))) {
    return true;
  }

  if ('RspCode' in body || 'vnp_ResponseCode' in body) {
    return true;
  }

  return false;
};

const toLocale = (req: Request): AppLocale => req.locale || resolveRequestLocale(req);

const inferErrorType = (statusCode: number, errorCode?: string): 'VALIDATION' | 'BUSINESS' | 'AUTH' | 'PERMISSION' | 'SYSTEM' => {
  const normalized = normalizeErrorCode(errorCode);

  if (statusCode >= 500) return 'SYSTEM';
  if (statusCode === 401) return 'AUTH';
  if (statusCode === 403) {
    return normalized === 'ACCOUNT_BANNED' ? 'AUTH' : 'PERMISSION';
  }
  if (
    statusCode === 422 ||
    normalized?.startsWith('VALIDATION_') ||
    normalized === 'VALIDATION_ERROR' ||
    normalized === 'BAD_REQUEST' ||
    normalized === 'INVALID_BODY'
  ) {
    return 'VALIDATION';
  }

  return 'BUSINESS';
};

const hasErrorShape = (statusCode: number, body: JsonObject) =>
  statusCode >= 400 ||
  body.success === false ||
  typeof body.errorCode === 'string' ||
  typeof body.code === 'string' ||
  typeof body.error === 'string';

const normalizeErrorPayload = (req: Request, statusCode: number, body: JsonObject): JsonObject => {
  const locale = toLocale(req);
  const normalizedCode =
    normalizeErrorCode(body.errorCode) ||
    normalizeErrorCode(body.code) ||
    normalizeErrorCode(body.error) ||
    (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'UNKNOWN_ERROR');

  const messageKey =
    typeof body.messageKey === 'string' && body.messageKey.trim().length > 0
      ? body.messageKey
      : resolveErrorMessageKey(normalizedCode);

  const message =
    typeof body.message === 'string' && body.message.trim().length > 0
      ? body.message
      : t(locale, messageKey);
  const details = Array.isArray(body.details) ? body.details : undefined;
  const field =
    typeof body.field === 'string'
      ? body.field
      : typeof details?.[0] === 'object' && details[0] && 'field' in details[0]
        ? String((details[0] as Record<string, unknown>).field ?? '')
        : undefined;

  return {
    ...body,
    success: false,
    statusCode: typeof body.statusCode === 'number' ? body.statusCode : statusCode,
    type: typeof body.type === 'string' ? body.type : inferErrorType(statusCode, normalizedCode),
    errorCode: normalizedCode,
    // keep legacy clients working while moving to errorCode
    code: typeof body.code === 'string' ? body.code : normalizedCode,
    messageKey,
    message,
    ...(field ? { field } : {}),
    ...(details ? { details } : {}),
    ...(req.traceId ? { traceId: req.traceId } : {}),
  };
};

const normalizeSuccessPayload = (req: Request, body: JsonObject): JsonObject => {
  const locale = toLocale(req);
  const inferredCode = normalizeErrorCode(body.code);
  const messageKey =
    typeof body.messageKey === 'string' && body.messageKey.trim().length > 0
      ? body.messageKey
      : resolveSuccessMessageKey(inferredCode);
  const message =
    typeof body.message === 'string' && body.message.trim().length > 0
      ? body.message
      : t(locale, messageKey);

  return {
    ...body,
    success: body.success !== false,
    messageKey,
    message,
  };
};

export const normalizeApiResponseBody = (req: Request, statusCode: number, payload: unknown): unknown => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const body = payload as JsonObject;
  if (shouldBypassNormalization(req, body)) {
    return payload;
  }

  if (hasErrorShape(statusCode, body)) {
    return normalizeErrorPayload(req, statusCode, body);
  }

  return normalizeSuccessPayload(req, body);
};

export const responseNormalizer = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  res.json = ((payload: unknown) => {
    const normalized = normalizeApiResponseBody(req, res.statusCode, payload);
    return originalJson(normalized as unknown);
  }) as Response['json'];

  next();
};
