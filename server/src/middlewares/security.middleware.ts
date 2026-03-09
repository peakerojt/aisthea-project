import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

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
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            errorCode: 'AUTH_RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts. Please try again in 15 minutes.',
        });
    },
});
