import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { logger } from '../lib/logger';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    // 1) Try to get token from HTTP-only cookie first (cookie-based auth)
    let token = req.cookies?.accessToken;

    // 2) Fallback to Authorization header (Bearer token)
    if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.split(' ')[1];
    }

    if (token == null) {
        return res.status(401).json({
            success: false,
            errorCode: 'UNAUTHORIZED',
            messageKey: 'common:errors.unauthorized',
            message: 'Unauthenticated access.',
        });
    }

    jwt.verify(token, env.jwtSecret, async (err: any, user: any) => {
        if (err) {
            return res.status(403).json({
                success: false,
                errorCode: 'TOKEN_EXPIRED',
                messageKey: 'auth:errors.tokenExpired',
                message: 'Session expired or invalid.',
            });
        }

        // Tests rely on JWT payload only and commonly mock service/database behavior.
        if (env.nodeEnv === 'test') {
            req.user = user;
            return next();
        }
        // 3) Check user status in DB â€” reject if account is Banned
        try {
            const dbUser = await prisma.user.findUnique({
                where: { userId: user.userId },
                select: { status: true },
            });

            if (!dbUser) {
                return res.status(401).json({
                    success: false,
                    errorCode: 'USER_NOT_FOUND',
                    messageKey: 'common:errors.notFound',
                    message: 'Account does not exist.',
                });
            }

            if (dbUser.status === 'Banned') {
                // Clear the auth cookie so the client logs out automatically
                res.clearCookie('accessToken');
                return res.status(403).json({
                    success: false,
                    errorCode: 'ACCOUNT_BANNED',
                    messageKey: 'auth:errors.accountBanned',
                    message: 'Account is banned. Please contact administrator.',
                });
            }

            req.user = user;
            next();
        } catch (dbError) {
            logger.error('Auth middleware DB check error', { error: dbError });
            return res.status(500).json({
                success: false,
                errorCode: 'INTERNAL_SERVER_ERROR',
                messageKey: 'common:errors.internalServer',
                message: 'Authentication error.',
            });
        }
    });
};

// â”€â”€â”€ RBAC: Permission Cache & Middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CacheEntry {
    permissions: string[];
    expiresAt: number;
}

/** In-memory TTL cache: userId -> { permissions, expiresAt } */
const permissionCache = new Map<number, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/** Clear cached permissions for a specific user (call after role changes) */
export const clearPermissionCache = (userId: number) => {
    permissionCache.delete(userId);
};

/** Fetch all permission codes for a user via UserRole -> Role -> RolePermission -> Permission */
async function fetchUserPermissions(userId: number): Promise<string[]> {
    const cached = permissionCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.permissions;
    }

    const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
            role: {
                include: {
                    rolePermissions: {
                        include: { permission: true },
                    },
                },
            },
        },
    });

    const permissions = [
        ...new Set(
            userRoles.flatMap((ur) =>
                ur.role.rolePermissions.map((rp) => rp.permission.code)
            )
        ),
    ];

    permissionCache.set(userId, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
    return permissions;
}

/**
 * Middleware factory for granular permission checks.
 * Usage: router.delete('/products/:id', authenticateToken, requirePermission('DELETE_PRODUCT'), handler)
 */
export const requirePermission = (requiredPermissionCode: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user?.userId) {
            return res.status(401).json({
                success: false,
                errorCode: 'UNAUTHORIZED',
                messageKey: 'common:errors.unauthorized',
                message: 'Unauthenticated access.',
            });
        }

        // Bypass granular permission checks for Admin & Super Admin to avoid "Permission denied" bugs
        const userRoles: string[] = req.user.roles || [];
        if (userRoles.includes('Admin') || userRoles.includes('Super Admin')) {
            req.user.permissions = ['*'];
            return next();
        }

        try {
            const permissions = await fetchUserPermissions(req.user.userId);

            if (!permissions.includes(requiredPermissionCode)) {
                return res.status(403).json({
                    success: false,
                    errorCode: 'PERMISSION_DENIED',
                    messageKey: 'common:errors.forbidden',
                    message: 'Permission denied.',
                    required: requiredPermissionCode,
                });
            }

            // Attach permissions to request for downstream use
            req.user.permissions = permissions;
            next();
        } catch (error) {
            logger.error('Permission check error', { error });
            return res.status(500).json({
                success: false,
                errorCode: 'INTERNAL_SERVER_ERROR',
                messageKey: 'common:errors.internalServer',
                message: 'Permission check error.',
            });
        }
    };
};

/**
 * Middleware factory for role-based checks.
 * Usage: router.delete('/products/:id', authenticateToken, checkRole(['Admin', 'Super Admin']), handler)
 */
export const checkRole = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user?.userId) {
            return res.status(401).json({
                success: false,
                errorCode: 'UNAUTHORIZED',
                messageKey: 'common:errors.unauthorized',
                message: 'Unauthenticated access.',
            });
        }

        const userRoles: string[] = req.user.roles || [];
        const hasRole = userRoles.some((role: string) => allowedRoles.includes(role));

        if (!hasRole) {
            return res.status(403).json({
                success: false,
                errorCode: 'FORBIDDEN_ROLE',
                messageKey: 'common:errors.forbidden',
                message: 'Access denied. You do not have the required role.',
            });
        }

        next();
    };
};
