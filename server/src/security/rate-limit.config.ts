export type RateLimitBucketName =
  | 'GLOBAL_API'
  | 'PUBLIC_READ'
  | 'AUTH'
  | 'CUSTOMER_MUTATION'
  | 'ADMIN_INTERNAL';

export type RateLimitKeyStrategy = 'ip' | 'userId' | 'userId||ip' | 'ip+account';

export type RateLimitPhase = 'burst' | 'sustained';

export type RateLimitThreshold = {
  windowMs: number;
  limit: number;
};

export type RateLimitBucketPolicy = {
  bucket: RateLimitBucketName;
  keyStrategy: RateLimitKeyStrategy;
  burst: RateLimitThreshold;
  sustained: RateLimitThreshold;
  errorCode: string;
  messageKey: string;
};

export const rateLimitPolicy: Record<RateLimitBucketName, RateLimitBucketPolicy> = {
  GLOBAL_API: {
    bucket: 'GLOBAL_API',
    keyStrategy: 'userId||ip',
    burst: { windowMs: 60_000, limit: 120 },
    sustained: { windowMs: 15 * 60_000, limit: 200 },
    errorCode: 'RATE_LIMIT_EXCEEDED',
    messageKey: 'common:errors.rateLimitExceeded',
  },
  PUBLIC_READ: {
    bucket: 'PUBLIC_READ',
    keyStrategy: 'ip',
    burst: { windowMs: 60_000, limit: 30 },
    sustained: { windowMs: 15 * 60_000, limit: 200 },
    errorCode: 'RATE_LIMIT_EXCEEDED',
    messageKey: 'common:errors.rateLimitExceeded',
  },
  AUTH: {
    bucket: 'AUTH',
    keyStrategy: 'ip+account',
    burst: { windowMs: 60_000, limit: 5 },
    sustained: { windowMs: 15 * 60_000, limit: 10 },
    errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
    messageKey: 'common:errors.authRateLimitExceeded',
  },
  CUSTOMER_MUTATION: {
    bucket: 'CUSTOMER_MUTATION',
    keyStrategy: 'userId||ip',
    burst: { windowMs: 60_000, limit: 10 },
    sustained: { windowMs: 15 * 60_000, limit: 30 },
    errorCode: 'RATE_LIMIT_EXCEEDED',
    messageKey: 'common:errors.rateLimitExceeded',
  },
  ADMIN_INTERNAL: {
    bucket: 'ADMIN_INTERNAL',
    keyStrategy: 'userId',
    burst: { windowMs: 60_000, limit: 30 },
    sustained: { windowMs: 15 * 60_000, limit: 60 },
    errorCode: 'RATE_LIMIT_EXCEEDED',
    messageKey: 'common:errors.rateLimitExceeded',
  },
};
