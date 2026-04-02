import { NextFunction, Request, Response } from 'express';
import { AppLocale, t } from '../i18n';
import { normalizeErrorCode, resolveErrorMessageKey, resolveSuccessMessageKey } from '../i18n/message-key-map';
import { resolveRequestLocale } from './locale.middleware';

type JsonObject = Record<string, unknown>;

const PREFER_LOCALIZED_ERROR_MESSAGE_CODES = new Set(['INVALID_RETURN_QUANTITY']);

const RESPONSE_BYPASS_PATHS = ['/api/vnpay/vnpay_return', '/api/vnpay/vnpay_ipn', '/api/vnpay/vnpay_query'];

const shouldBypassNormalization = (req: Request, body: JsonObject) => {
  const path = req.path || req.originalUrl;
  if (RESPONSE_BYPASS_PATHS.some((bypassPath) => path.startsWith(bypassPath))) {
    return true;
  }

  if ('RspCode' in body || 'vnp_ResponseCode' in body) {
    return true;
  }

  return false;
};

const toLocale = (req: Request): AppLocale => req.locale || resolveRequestLocale(req);

const inferErrorType = (
  statusCode: number,
  errorCode?: string,
): 'VALIDATION' | 'BUSINESS' | 'AUTH' | 'PERMISSION' | 'SYSTEM' => {
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
  typeof body.error === 'string';

const localizeMessage = (
  locale: AppLocale,
  messageKey?: string,
  rawMessage?: string,
  messageParams?: Record<string, unknown>,
) => {
  if (typeof messageKey === 'string' && messageKey.trim().length > 0) {
    return t(locale, messageKey, messageParams);
  }

  if (typeof rawMessage === 'string' && rawMessage.trim().length > 0) {
    return rawMessage.trim();
  }

  return t(locale, 'common:success.ok');
};

const localizeDetails = (locale: AppLocale, details: unknown) => {
  if (!Array.isArray(details)) {
    return undefined;
  }

  return details.map((detail) => {
    if (!detail || typeof detail !== 'object' || Array.isArray(detail)) {
      return detail;
    }

    const detailRecord = detail as Record<string, unknown>;
    const detailCode = normalizeErrorCode(detailRecord.code);
    const detailMessageKey =
      typeof detailRecord.messageKey === 'string' && detailRecord.messageKey.trim().length > 0
        ? detailRecord.messageKey
        : resolveErrorMessageKey(detailCode);
    const params =
      typeof detailRecord.field === 'string' && detailRecord.field.trim().length > 0
        ? { field: detailRecord.field }
        : undefined;

    return {
      ...detailRecord,
      ...(detailMessageKey ? { messageKey: detailMessageKey } : {}),
      message:
        typeof detailRecord.message === 'string' && detailRecord.message.trim().length > 0 && !detailMessageKey
          ? detailRecord.message
          : t(locale, detailMessageKey || 'common:errors.validation', params),
    };
  });
};

const getNestedErrorRecord = (body: JsonObject) => {
  const nestedError = body.error;
  if (!nestedError || typeof nestedError !== 'object' || Array.isArray(nestedError)) {
    return undefined;
  }

  return nestedError as JsonObject;
};

const normalizeErrorPayload = (req: Request, statusCode: number, body: JsonObject): JsonObject => {
  const locale = toLocale(req);
  const nestedError = getNestedErrorRecord(body);
  const detailsRecord =
    body.details && typeof body.details === 'object' && !Array.isArray(body.details)
      ? (body.details as Record<string, unknown>)
      : nestedError?.details && typeof nestedError.details === 'object' && !Array.isArray(nestedError.details)
        ? (nestedError.details as Record<string, unknown>)
        : undefined;
  const normalizedCode =
    normalizeErrorCode(body.errorCode) ||
    normalizeErrorCode(body.code) ||
    normalizeErrorCode(nestedError?.errorCode) ||
    normalizeErrorCode(nestedError?.code) ||
    normalizeErrorCode(body.error) ||
    (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'UNKNOWN_ERROR');

  const explicitMessageKey =
    typeof body.messageKey === 'string' && body.messageKey.trim().length > 0
      ? body.messageKey
      : typeof nestedError?.messageKey === 'string' && nestedError.messageKey.trim().length > 0
        ? nestedError.messageKey
        : undefined;

  const messageParams =
    body.messageParams && typeof body.messageParams === 'object' && !Array.isArray(body.messageParams)
      ? (body.messageParams as Record<string, unknown>)
      : detailsRecord;
  const rawMessage =
    typeof body.message === 'string'
      ? body.message
      : typeof nestedError?.message === 'string'
        ? nestedError.message
        : undefined;
  const messageKey =
    explicitMessageKey ??
    ((rawMessage && !PREFER_LOCALIZED_ERROR_MESSAGE_CODES.has(normalizedCode))
      ? undefined
      : resolveErrorMessageKey(normalizedCode));
  const details = localizeDetails(locale, body.details ?? nestedError?.details);
  const message = localizeMessage(
    locale,
    messageKey,
    rawMessage,
    messageParams,
  );
  const field =
    typeof body.field === 'string'
      ? body.field
      : typeof nestedError?.field === 'string'
        ? nestedError.field
      : typeof details?.[0] === 'object' && details[0] && 'field' in details[0]
        ? String((details[0] as Record<string, unknown>).field ?? '')
        : undefined;

  return {
    ...body,
    success: false,
    ...(nestedError ? { error: nestedError } : {}),
    statusCode: typeof body.statusCode === 'number' ? body.statusCode : statusCode,
    type:
      typeof body.type === 'string'
        ? body.type
        : typeof nestedError?.type === 'string'
          ? nestedError.type
          : inferErrorType(statusCode, normalizedCode),
    errorCode: normalizedCode,
    code: typeof body.code === 'string' ? body.code : normalizedCode,
    ...(messageKey ? { messageKey } : {}),
    message,
    ...(field ? { field } : {}),
    ...(details ? { details } : {}),
    ...(req.traceId ? { traceId: req.traceId } : {}),
  };
};

const normalizeSuccessPayload = (req: Request, body: JsonObject): JsonObject => {
  const locale = toLocale(req);
  const inferredCode = normalizeErrorCode(body.code);
  const messageParams =
    body.messageParams && typeof body.messageParams === 'object' && !Array.isArray(body.messageParams)
      ? (body.messageParams as Record<string, unknown>)
      : undefined;
  const messageKey =
    typeof body.messageKey === 'string' && body.messageKey.trim().length > 0
      ? body.messageKey
      : resolveSuccessMessageKey(inferredCode);
  const message = localizeMessage(
    locale,
    messageKey,
    typeof body.message === 'string' ? body.message : undefined,
    messageParams,
  );

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
