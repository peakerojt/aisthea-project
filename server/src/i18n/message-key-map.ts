const ERROR_CODE_TO_MESSAGE_KEY: Record<string, string> = {
  ACCOUNT_BANNED: 'auth:errors.accountBanned',
  AUTH_RATE_LIMIT_EXCEEDED: 'common:errors.authRateLimitExceeded',
  BAD_REQUEST: 'common:errors.validation',
  CART_EMPTY: 'orders:errors.cartEmpty',
  CSRF_ORIGIN_FORBIDDEN: 'common:errors.csrfOriginForbidden',
  CSRF_TOKEN_INVALID: 'common:errors.csrfTokenInvalid',
  EMAIL_EXISTS: 'auth:errors.emailExists',
  EMAIL_NOT_VERIFIED: 'auth:errors.emailNotVerified',
  FORBIDDEN: 'common:errors.forbidden',
  FORBIDDEN_ROLE: 'common:errors.forbidden',
  INTERNAL_ERROR: 'common:errors.internalServer',
  INTERNAL_SERVER_ERROR: 'common:errors.internalServer',
  INVALID_CREDENTIALS: 'auth:errors.invalidCredentials',
  INVALID_STATUS_TRANSITION: 'orders:errors.invalidTransition',
  INVALID_TOKEN: 'auth:errors.invalidToken',
  MISSING_TOKEN: 'auth:errors.missingToken',
  NO_TOKEN: 'auth:errors.missingToken',
  NOT_FOUND: 'common:errors.notFound',
  PERMISSION_DENIED: 'common:errors.forbidden',
  ORDER_CANNOT_BE_CANCELLED: 'orders:errors.cannotCancel',
  OUT_OF_STOCK: 'orders:errors.outOfStock',
  RATE_LIMIT_EXCEEDED: 'common:errors.rateLimitExceeded',
  REFRESH_TOKEN_REVOKED: 'auth:errors.refreshTokenRevoked',
  TOKEN_EXPIRED: 'auth:errors.tokenExpired',
  UNAUTHORIZED: 'common:errors.unauthorized',
  USER_NOT_FOUND: 'common:errors.notFound',
  VARIANT_NOT_FOUND: 'products:errors.notFound',
  VALIDATION_ERROR: 'common:errors.validation',
};

const SUCCESS_CODE_TO_MESSAGE_KEY: Record<string, string> = {
  OK: 'common:success.ok',
  SUCCESS: 'common:success.ok',
};

const NON_ALNUM = /[^A-Za-z0-9]+/g;

export function normalizeErrorCode(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value
    .trim()
    .replace(NON_ALNUM, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

  return normalized.length > 0 ? normalized : undefined;
}

export function resolveErrorMessageKey(errorCode?: string): string {
  if (!errorCode) return 'common:errors.internalServer';
  return ERROR_CODE_TO_MESSAGE_KEY[errorCode] || 'common:errors.unknown';
}

export function resolveSuccessMessageKey(code?: string): string {
  if (!code) return 'common:success.ok';
  return SUCCESS_CODE_TO_MESSAGE_KEY[code] || 'common:success.ok';
}
