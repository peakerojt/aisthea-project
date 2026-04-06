import helmet from 'helmet';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import { buildCsrfCookieOptions } from '../lib/cookies';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import {
  rateLimitPolicy,
  RateLimitBucketName,
  RateLimitBucketPolicy,
  RateLimitPhase,
} from '../security/rate-limit.config';
import { resolveActorType, resolveRateLimitKey } from '../security/resolveRateLimitKey';

const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const normalizeOrigin = (value: string) => {
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
};
const normalizeAllowedOrigins = (allowedOrigins: string[] | string) =>
  new Set(
    (Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins])
      .map(normalizeOrigin)
      .filter(Boolean),
  );

const readHeaderValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const readAccessToken = (req: Request) => {
  const cookieToken = req.cookies?.accessToken;
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }

  const authorization = readHeaderValue(req.headers.authorization);
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return undefined;
};

const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

const resolveRetryAfterSeconds = (req: Request) => {
  const resetTime = req.rateLimit?.resetTime;
  if (!(resetTime instanceof Date)) return undefined;

  return Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
};

const buildRateLimitPayload = (
  req: Request,
  policy: RateLimitBucketPolicy,
  phase: RateLimitPhase,
) => {
  const retryAfterSeconds = resolveRetryAfterSeconds(req);

  return {
    success: false,
    statusCode: 429,
    type: 'BUSINESS',
    errorCode: policy.errorCode,
    code: policy.errorCode,
    messageKey: policy.messageKey,
    bucket: policy.bucket,
    phase,
    retryAfterSeconds,
    limit: req.rateLimit?.limit,
    remaining: req.rateLimit?.remaining,
    traceId: req.traceId,
  };
};

const logRateLimitDecision = (
  req: Request,
  policy: RateLimitBucketPolicy,
  phase: RateLimitPhase,
  resource: string,
  outcome: 'blocked' | 'monitor-only',
) => {
  const requestUser = req.user as { userId?: number } | undefined;

  logger.warn('[rate-limit] threshold reached', {
    traceId: req.traceId,
    route: req.originalUrl.split('?')[0],
    method: req.method,
    actorType: resolveActorType(req),
    userId: requestUser?.userId ?? null,
    realIp: req.ip,
    bucket: policy.bucket,
    resource,
    phase,
    key: req.rateLimit?.key,
    used: req.rateLimit?.used,
    limit: req.rateLimit?.limit,
    remaining: req.rateLimit?.remaining,
    retryAfterSeconds: resolveRetryAfterSeconds(req),
    status: outcome === 'blocked' ? 429 : 200,
    outcome,
  });
};

type RateLimiterFactoryOptions = {
  bucket: RateLimitBucketName;
  phase: RateLimitPhase;
  resource: string;
  skipSuccessfulRequests?: boolean;
};

const createRateLimiter = ({
  bucket,
  phase,
  resource,
  skipSuccessfulRequests = false,
}: RateLimiterFactoryOptions): RateLimitRequestHandler => {
  const policy = rateLimitPolicy[bucket];
  const threshold = policy[phase];

  return rateLimit({
    windowMs: threshold.windowMs,
    limit: threshold.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    identifier: `${bucket.toLowerCase()}-${phase}`,
    skipSuccessfulRequests,
    skip: (req) => req.method === 'OPTIONS',
    keyGenerator: (req, res) =>
      resolveRateLimitKey(req, {
        bucket,
        resource,
        strategy: policy.keyStrategy,
      }),
    handler: (req, res, next) => {
      const payload = buildRateLimitPayload(req, policy, phase);

      if (env.securityRateLimitMonitorOnly) {
        logRateLimitDecision(req, policy, phase, resource, 'monitor-only');
        res.setHeader('x-rate-limit-observed', 'true');
        return next();
      }

      logRateLimitDecision(req, policy, phase, resource, 'blocked');
      if (typeof payload.retryAfterSeconds === 'number') {
        res.setHeader('Retry-After', String(payload.retryAfterSeconds));
      }
      return res.status(429).json(payload);
    },
  });
};

const createDualRateLimiters = (bucket: RateLimitBucketName, resource: string) => [
  createRateLimiter({ bucket, phase: 'burst', resource }),
  createRateLimiter({ bucket, phase: 'sustained', resource }),
] as const;

export const setCsrfCookie = (res: Response, nodeEnv: string, token?: string) => {
  const csrfToken = token || generateCsrfToken();
  void nodeEnv;
  res.cookie(CSRF_COOKIE_NAME, csrfToken, buildCsrfCookieOptions(CSRF_COOKIE_MAX_AGE_MS));
  return csrfToken;
};

export const ensureCsrfCookie = (req: Request, res: Response, nodeEnv: string) => {
  const csrfToken = req.cookies?.[CSRF_COOKIE_NAME];
  if (typeof csrfToken === 'string' && csrfToken.length > 0) {
    return csrfToken;
  }
  return setCsrfCookie(res, nodeEnv);
};

export const applyCsrfProtection = (allowedOrigins: string[] | string, nodeEnv: string) => {
  const allowedOriginSet = normalizeAllowedOrigins(allowedOrigins);

  return (req: Request, res: Response, next: NextFunction) => {
    const csrfToken = ensureCsrfCookie(req, res, nodeEnv);

    if (nodeEnv === 'test') return next();
    if (SAFE_METHODS.has(req.method)) return next();

    const hasAuthCookie = Boolean(
      req.cookies?.accessToken ||
      req.cookies?.refreshToken ||
      req.cookies?.resetToken,
    );

    if (!hasAuthCookie) return next();

    const originHeader = readHeaderValue(req.headers.origin) || readHeaderValue(req.headers.referer);
    if (originHeader) {
      const requestOrigin = normalizeOrigin(originHeader);
      if (allowedOriginSet.size > 0 && !allowedOriginSet.has(requestOrigin)) {
        return res.status(403).json({
          success: false,
          errorCode: 'CSRF_ORIGIN_FORBIDDEN',
          messageKey: 'common:errors.csrfOriginForbidden',
        });
      }
    }

    const tokenHeader = readHeaderValue(req.headers[CSRF_HEADER_NAME]);
    if (!tokenHeader || tokenHeader !== csrfToken) {
      return res.status(403).json({
        success: false,
        errorCode: 'CSRF_TOKEN_INVALID',
        messageKey: 'common:errors.csrfTokenInvalid',
      });
    }

    return next();
  };
};

export const applyHelmet = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

export const applyPermissionsPolicy = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Permissions-Policy', 'geolocation=(self)');
  next();
};

export const attachRateLimitIdentity = (req: Request, _res: Response, next: NextFunction) => {
  if (req.rateLimitIdentity || req.user) {
    req.rateLimitIdentity = req.user ?? req.rateLimitIdentity;
    return next();
  }

  const token = readAccessToken(req);
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as {
      userId?: number;
      email?: string;
      roles?: string[];
    };

    if (typeof decoded?.userId === 'number' && Number.isFinite(decoded.userId)) {
      req.rateLimitIdentity = {
        userId: decoded.userId,
        email: typeof decoded.email === 'string' ? decoded.email : undefined,
        roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      };
    }
  } catch {
    // Ignore invalid/expired tokens here; real auth still happens in authenticateToken.
  }

  return next();
};

export const isAdminShellRequest = (_req: Request) => false;

export const resolveGlobalRateLimit = (_req: Request) => rateLimitPolicy.GLOBAL_API.sustained.limit;

export const globalRateLimiter = createRateLimiter({
  bucket: 'GLOBAL_API',
  phase: 'sustained',
  resource: 'api.global',
});

export const authRateLimiter = createRateLimiter({
  bucket: 'AUTH',
  phase: 'sustained',
  resource: 'auth.public',
  skipSuccessfulRequests: true,
});

export const createPublicReadRateLimiters = (resource: string) =>
  createDualRateLimiters('PUBLIC_READ', resource);

export const createCustomerMutationRateLimiters = (resource: string) =>
  createDualRateLimiters('CUSTOMER_MUTATION', resource);

export const createAdminRateLimiters = (resource: string) =>
  createDualRateLimiters('ADMIN_INTERNAL', resource);
