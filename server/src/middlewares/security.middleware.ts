import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

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

const readHeaderValue = (value: string | string[] | undefined): string | undefined => {
    if (Array.isArray(value)) return value[0];
    return value;
};

const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

export const setCsrfCookie = (res: Response, nodeEnv: string, token?: string) => {
    const csrfToken = token || generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: CSRF_COOKIE_MAX_AGE_MS,
        path: '/',
    });
    return csrfToken;
};

export const ensureCsrfCookie = (req: Request, res: Response, nodeEnv: string) => {
    const csrfToken = req.cookies?.[CSRF_COOKIE_NAME];
    if (typeof csrfToken === 'string' && csrfToken.length > 0) {
        return csrfToken;
    }
    return setCsrfCookie(res, nodeEnv);
};

export const applyCsrfProtection = (clientUrl: string, nodeEnv: string) => {
    const allowedOrigin = normalizeOrigin(clientUrl);

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
            if (requestOrigin !== allowedOrigin) {
                return res.status(403).json({
                    success: false,
                    errorCode: 'CSRF_ORIGIN_FORBIDDEN',
                    messageKey: 'common:errors.csrfOriginForbidden',
                    message: 'Cross-site requests are not allowed.',
                });
            }
        }

        const tokenHeader = readHeaderValue(req.headers[CSRF_HEADER_NAME]);
        if (!tokenHeader || tokenHeader !== csrfToken) {
            return res.status(403).json({
                success: false,
                errorCode: 'CSRF_TOKEN_INVALID',
                messageKey: 'common:errors.csrfTokenInvalid',
                message: 'CSRF token is missing or invalid.',
            });
        }

        return next();
    };
};

/**
 * Helmet — sets secure HTTP response headers.
 * Applied globally in app.ts before any routes.
 */
export const applyHelmet = helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Cloudinary images
});

/**
 * Global rate limiter — 200 requests per 15 minutes per IP.
 * Applied to all /api/* routes.
 */
export const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        messageKey: 'common:errors.rateLimitExceeded',
        message: 'Too many requests. Please try again later.',
    },
});

/**
 * Strict rate limiter for auth endpoints — 10 requests per 15 minutes per IP.
 * Protects login & register from brute-force.
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // only count failed login attempts
    message: {
        success: false,
        errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
        messageKey: 'common:errors.authRateLimitExceeded',
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
            messageKey: 'common:errors.authRateLimitExceeded',
            message: 'Too many authentication attempts. Please try again in 15 minutes.',
        });
    },
});
