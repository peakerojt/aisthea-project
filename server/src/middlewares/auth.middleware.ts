
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { PrismaClient } from '../generated/client';

dotenv.config();

const prisma = new PrismaClient();

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

    if (token == null) return res.status(401).json({ error: 'Unauthorized', message: 'Vui lòng đăng nhập để tiếp tục.' });

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', async (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Forbidden', message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.' });

        // 3) Check user status in DB — reject if account is Banned
        try {
            const dbUser = await prisma.user.findUnique({
                where: { userId: user.userId },
                select: { status: true },
            });

            if (!dbUser) {
                return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại.' });
            }

            if (dbUser.status === 'Banned') {
                // Clear the auth cookie so the client logs out automatically
                res.clearCookie('accessToken');
                return res.status(403).json({
                    success: false,
                    message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
                    code: 'ACCOUNT_BANNED',
                });
            }

            req.user = user;
            next();
        } catch (dbError) {
            console.error('Auth middleware DB check error:', dbError);
            return res.status(500).json({ success: false, message: 'Lỗi xác thực.' });
        }
    });
};

// ─── RBAC: Permission Cache & Middleware ──────────────────────────────────────

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
            return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục.' });
        }

        try {
            const permissions = await fetchUserPermissions(req.user.userId);

            if (!permissions.includes(requiredPermissionCode)) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền thực hiện thao tác này.',
                    code: 'PERMISSION_DENIED',
                    required: requiredPermissionCode,
                });
            }

            // Attach permissions to request for downstream use
            req.user.permissions = permissions;
            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({ success: false, message: 'Lỗi kiểm tra quyền hạn.' });
        }
    };
};
