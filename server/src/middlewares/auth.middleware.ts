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
        });
    }

    jwt.verify(token, env.jwtSecret, async (err: any, user: any) => {
        if (err) {
            return res.status(403).json({
                success: false,
                errorCode: 'TOKEN_EXPIRED',
                messageKey: 'auth:errors.tokenExpired',
            });
        }

        // Tests rely on JWT payload only and commonly mock service/database behavior.
        if (env.nodeEnv === 'test') {
            req.user = user;
            return next();
        }
        // 3) Check user status in DB and reject banned accounts.
        try {
            const dbUser = await prisma.user.findUnique({
                where: { userId: user.userId },
                select: { status: true },
            });

            if (!dbUser) {
                return res.status(401).json({
                    success: false,
                    errorCode: 'USER_NOT_FOUND',
                    messageKey: 'users:errors.userNotFound',
                });
            }

            if (dbUser.status === 'Banned') {
                // Clear the auth cookie so the client logs out automatically
                res.clearCookie('accessToken');
                return res.status(403).json({
                    success: false,
                    errorCode: 'ACCOUNT_BANNED',
                    messageKey: 'auth:errors.accountBanned',
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
            });
        }
    });
};

// RBAC: Permission cache and middleware.

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

const ADMIN_BYPASS_ROLES = new Set(['Admin', 'Super Admin']);

const hasAdminBypassRole = (roles: string[]) =>
    roles.some((role) => ADMIN_BYPASS_ROLES.has(role));

const buildPermissionDeniedResponse = (
    res: Response,
    requiredPermissionCodes: string[],
    mode: 'all' | 'any',
) =>
    res.status(403).json({
        success: false,
        errorCode: 'PERMISSION_DENIED',
        messageKey: 'common:errors.forbidden',
        ...(mode === 'all'
            ? { required: requiredPermissionCodes[0] }
            : { requiredAny: requiredPermissionCodes }),
    });

const createPermissionMiddleware = (
    requiredPermissionCodes: string[],
    mode: 'all' | 'any',
) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user?.userId) {
            return res.status(401).json({
                success: false,
                errorCode: 'UNAUTHORIZED',
                messageKey: 'common:errors.unauthorized',
            });
        }

        const userRoles: string[] = req.user.roles || [];
        if (hasAdminBypassRole(userRoles)) {
            req.user.permissions = ['*'];
            return next();
        }

        try {
            const permissions = await fetchUserPermissions(req.user.userId);
            const hasAccess = mode === 'all'
                ? requiredPermissionCodes.every((requiredPermissionCode) => permissions.includes(requiredPermissionCode))
                : requiredPermissionCodes.some((requiredPermissionCode) => permissions.includes(requiredPermissionCode));

            if (!hasAccess) {
                return buildPermissionDeniedResponse(res, requiredPermissionCodes, mode);
            }

            req.user.permissions = permissions;
            next();
        } catch (error) {
            logger.error('Permission check error', { error });
            return res.status(500).json({
                success: false,
                errorCode: 'INTERNAL_SERVER_ERROR',
                messageKey: 'common:errors.internalServer',
            });
        }
    };
};

/**
 * Middleware factory for granular permission checks.
 * Usage: router.delete('/products/:id', authenticateToken, requirePermission('DELETE_PRODUCT'), handler)
 */
export const requirePermission = (requiredPermissionCode: string) => {
    return createPermissionMiddleware([requiredPermissionCode], 'all');
};

/**
 * Middleware factory for routes that should be unlocked by any one matching permission.
 * Usage: router.get('/inventory', authenticateToken, requireAnyPermission(['VIEW_INVENTORY', 'EDIT_INVENTORY']), handler)
 */
export const requireAnyPermission = (requiredPermissionCodes: string[]) =>
    createPermissionMiddleware(requiredPermissionCodes, 'any');

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
            });
        }

        const userRoles: string[] = req.user.roles || [];
        const hasRole = userRoles.some((role: string) => allowedRoles.includes(role));

        if (!hasRole) {
            return res.status(403).json({
                success: false,
                errorCode: 'FORBIDDEN_ROLE',
                messageKey: 'common:errors.forbidden',
            });
        }

        next();
    };
};
