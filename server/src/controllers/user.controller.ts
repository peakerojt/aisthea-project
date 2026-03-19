import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient, Prisma } from '../generated/client';
import { userService } from '../services/user.service';
import { logger } from '../lib/logger';
import { AuthRequest } from '../middlewares/auth.middleware';

const adminPrisma = new PrismaClient();


/**
 * Get current user's profile
 */
export const getProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;

        const profile = await userService.getProfile(userId);

        res.status(200).json({
            success: true,
            data: profile,
        });
    } catch (error) {
        logger.error('[userController] getProfile failed', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
        });
    }
};

/**
 * Update user profile
 */
export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const { fullName, phone } = req.body as { fullName?: string; phone?: string };

        const updatedProfile = await userService.updateProfile(userId, {
            fullName,
            phone,
        });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedProfile,
        });
    } catch (error: unknown) {
        logger.error('[userController] updateProfile failed', { error });
        const e = error as { message?: string };
        res.status(400).json({
            success: false,
            message: e.message || 'Failed to update profile',
        });
    }
};

/**
 * Upload avatar
 * Supports two input methods:
 * 1. Multipart file upload (recommended for Postman testing)
 * 2. Base64 JSON data (for frontend)
 */
export const uploadAvatar = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        let avatarBase64: string;

        if ((req as Request & { file?: Express.Multer.File }).file) {
            const file = (req as Request & { file: Express.Multer.File }).file;
            logger.debug('[userController] Avatar upload via file', {
                filename: file.originalname,
                mimetype: file.mimetype,
                sizeKb: (file.size / 1024).toFixed(2),
            });
            const base64 = file.buffer.toString('base64');
            avatarBase64 = `data:${file.mimetype};base64,${base64}`;
        } else if (req.body.avatar) {
            const { avatar } = req.body as { avatar: string };

            if (!avatar.startsWith('data:image/')) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid image format. Please upload a valid image file (JPEG, PNG, GIF, or WebP).',
                });
            }

            const mimeType = avatar.split(';')[0].split(':')[1];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

            if (!allowedTypes.includes(mimeType)) {
                return res.status(400).json({
                    success: false,
                    message: `Unsupported image type: ${mimeType}. Allowed types: JPEG, PNG, GIF, WebP`,
                });
            }

            logger.debug('[userController] Avatar upload via base64', {
                mimetype: mimeType,
                sizeKb: (avatar.length * 0.75 / 1024).toFixed(2),
            });

            avatarBase64 = avatar;
        } else {
            return res.status(400).json({
                success: false,
                message: 'No avatar provided. Please upload a file or send base64 data in the "avatar" field.',
            });
        }

        const updatedUser = await userService.uploadAvatar(userId, avatarBase64);

        res.status(200).json({
            success: true,
            message: 'Avatar uploaded successfully to cloud storage',
            data: updatedUser,
        });
    } catch (error: unknown) {
        logger.error('[userController] uploadAvatar failed', { error });
        const e = error as { message?: string };
        res.status(400).json({
            success: false,
            message: e.message || 'Failed to upload avatar',
        });
    }
};


/**
 * Delete avatar
 */
export const deleteAvatar = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;

        const updatedUser = await userService.deleteAvatar(userId);

        res.status(200).json({
            success: true,
            message: 'Avatar deleted successfully',
            data: updatedUser,
        });
    } catch (error) {
        logger.error('[userController] deleteAvatar failed', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to delete avatar',
        });
    }
};

/**
 * Get user addresses
 */
export const getAddresses = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;

        const addresses = await userService.getAddresses(userId);

        res.status(200).json({
            success: true,
            data: addresses,
        });
    } catch (error) {
        logger.error('[userController] getAddresses failed', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to get addresses',
        });
    }
};

/**
 * Create new address
 */
export const createAddress = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const addressData = req.body as {
            recipientName: string;
            phone: string;
            addressLine: string;
            city: string;
            district: string;
            ward: string;
            isDefault?: boolean;
        };

        const newAddress = await userService.createAddress(userId, addressData);

        res.status(201).json({
            success: true,
            message: 'Address created successfully',
            data: newAddress,
        });
    } catch (error: unknown) {
        logger.error('[userController] createAddress failed', { error });
        const e = error as { message?: string };
        res.status(400).json({
            success: false,
            message: e.message || 'Failed to create address',
        });
    }
};

export const updateAddress = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const addressId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const addressData = req.body as {
            recipientName: string;
            phone: string;
            addressLine: string;
            city: string;
            district: string;
            ward: string;
            isDefault?: boolean;
        };

        if (isNaN(addressId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid address ID',
            });
        }

        const updatedAddress = await userService.updateAddress(userId, addressId, addressData);

        res.status(200).json({
            success: true,
            message: 'Address updated successfully',
            data: updatedAddress,
        });
    } catch (error: unknown) {
        logger.error('[userController] updateAddress failed', { error });
        const e = error as { message?: string };
        res.status(400).json({
            success: false,
            message: e.message || 'Failed to update address',
        });
    }
};

/**
 * Delete address
 */
export const deleteAddress = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const addressId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

        if (isNaN(addressId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid address ID',
            });
        }

        const result = await userService.deleteAddress(userId, addressId);

        res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error: unknown) {
        logger.error('[userController] deleteAddress failed', { error });
        const e = error as { message?: string };
        res.status(400).json({
            success: false,
            message: e.message || 'Failed to delete address',
        });
    }
};

/**
 * Set default address
 */
export const setDefaultAddress = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const addressId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

        if (isNaN(addressId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid address ID',
            });
        }

        const updatedAddress = await userService.setDefaultAddress(userId, addressId);

        res.status(200).json({
            success: true,
            message: 'Default address set successfully',
            data: updatedAddress,
        });
    } catch (error: unknown) {
        logger.error('[userController] setDefaultAddress failed', { error });
        const e = error as { message?: string };
        res.status(400).json({
            success: false,
            message: e.message || 'Failed to set default address',
        });
    }
};

/**
 * Get recent orders for profile display
 */
export const getRecentOrders = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

        const orders = await userService.getRecentOrders(userId, limit);

        res.status(200).json({
            success: true,
            data: orders,
        });
    } catch (error) {
        logger.error('[userController] getRecentOrders failed', { error });
        res.status(500).json({
            success: false,
            message: 'Failed to get recent orders',
        });
    }
};

// ────────────────────────────────────────────────────────────────────────────
// ADMIN — User Management
// ────────────────────────────────────────────────────────────────────────────

/**
 * [ADMIN] Get all users with search, role, and status filters
 * GET /api/users?search=&role=&status=
 */
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const { search, role, status, page: pageQ, limit: limitQ } = req.query as Record<string, string>;

        const page = Math.max(1, parseInt(pageQ ?? '1', 10) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(limitQ ?? '50', 10) || 50));
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {};

        // Search by name, email, or phone
        if (search && search.trim()) {
            const s = search.trim();
            where.OR = [
                { fullName: { contains: s } },
                { email: { contains: s } },
                { phone: { contains: s } },
            ];
        }

        // Filter by status
        if (status && status !== 'all') {
            where.status = status;
        }

        // Filter by role name
        if (role && role !== 'all') {
            where.userRoles = {
                some: {
                    role: { roleName: role },
                },
            };
        }

        const [users, total] = await Promise.all([
            adminPrisma.user.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    userId: true,
                    email: true,
                    fullName: true,
                    phone: true,
                    avatarUrl: true,
                    status: true,
                    createdAt: true,
                    userRoles: {
                        include: {
                            role: true,
                        },
                    },
                    _count: {
                        select: { orders: true },
                    },
                },
            }),
            adminPrisma.user.count({ where }),
        ]);

        // Map to a cleaner shape
        const result = users.map((u) => ({
            userId: u.userId,
            email: u.email,
            fullName: u.fullName,
            phone: u.phone,
            avatarUrl: u.avatarUrl,
            status: u.status,
            createdAt: u.createdAt,
            roles: u.userRoles.map((ur) => ({
                roleId: ur.roleId,
                roleName: ur.role.roleName,
            })),
            totalOrders: u._count.orders,
        }));

        res.status(200).json({
            success: true,
            data: result,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        logger.error('[userController] getAllUsers failed', { error });
        res.status(500).json({ success: false, code: 'FETCH_USERS_FAILED', message: 'Failed to fetch users.' });
    }
};

/**
 * [ADMIN] Toggle user status between Active and Banned
 * PATCH /api/users/:id/status
 * Security: Cannot ban yourself or ban another Admin (if not Super Admin)
 */
export const updateUserStatus = async (req: Request, res: Response) => {
    try {
        const requesterId = (req as any).user.userId as number;
        const targetId = parseInt(String(req.params.id));

        if (isNaN(targetId)) {
            return res.status(400).json({ success: false, code: 'INVALID_USER_ID', message: 'Invalid user ID.' });
        }

        // Guard: Cannot ban yourself
        if (requesterId === targetId) {
            return res.status(403).json({
                success: false,
                code: 'CANNOT_BAN_SELF',
                message: 'You cannot ban your own account.',
            });
        }

        // Fetch target user
        const targetUser = await adminPrisma.user.findUnique({
            where: { userId: targetId },
            include: { userRoles: { include: { role: true } } },
        });

        if (!targetUser) {
            return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', message: 'User not found.' });
        }

        // Guard: Cannot ban another Admin (Super Admin protection)
        const targetRoles = targetUser.userRoles.map((ur) => ur.role.roleName.toLowerCase());
        if (targetRoles.includes('admin')) {
            return res.status(403).json({
                success: false,
                code: 'CANNOT_BAN_ADMIN',
                message: 'You cannot ban another admin account.',
            });
        }

        // Toggle status
        const newStatus = targetUser.status === 'Active' ? 'Banned' : 'Active';

        const updated = await adminPrisma.user.update({
            where: { userId: targetId },
            data: { status: newStatus, updatedAt: new Date() },
            select: { userId: true, fullName: true, status: true },
        });

        res.status(200).json({
            success: true,
            code: 'STATUS_UPDATED',
            message: 'User status updated successfully.',
            data: updated,
        });
    } catch (error) {
        logger.error('[userController] updateUserStatus failed', { error });
        res.status(500).json({ success: false, code: 'UPDATE_STATUS_FAILED', message: 'Failed to update user status.' });
    }
};

// Zod schema for role update
const UpdateRoleSchema = z.object({
    roleId: z.number().int().positive(),
});

/**
 * [ADMIN] Update user's role
 * PATCH /api/users/:id/role
 * Body: { roleId: number }
 */
export const updateUserRole = async (req: Request, res: Response) => {
    try {
        const targetId = parseInt(String(req.params.id));

        if (isNaN(targetId)) {
            return res.status(400).json({ success: false, code: 'INVALID_USER_ID', message: 'Invalid user ID.' });
        }

        // Validate request body
        const parsed = UpdateRoleSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_BODY',
                message: parsed.error.issues[0]?.message || 'Invalid request body.',
            });
        }

        const { roleId } = parsed.data;

        // Verify role exists
        const role = await adminPrisma.role.findUnique({ where: { roleId } });
        if (!role) {
            return res.status(404).json({ success: false, code: 'ROLE_NOT_FOUND', message: 'Role not found.' });
        }

        // Verify user exists
        const user = await adminPrisma.user.findUnique({ where: { userId: targetId } });
        if (!user) {
            return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', message: 'User not found.' });
        }

        // Replace all roles: delete existing, insert new
        await adminPrisma.$transaction([
            adminPrisma.userRole.deleteMany({ where: { userId: targetId } }),
            adminPrisma.userRole.create({ data: { userId: targetId, roleId } }),
        ]);

        res.status(200).json({
            success: true,
            code: 'ROLE_UPDATED',
            message: 'User role updated successfully.',
            data: { userId: targetId, role: { roleId: role.roleId, roleName: role.roleName } },
        });
    } catch (error) {
        logger.error('[userController] updateUserRole failed', { error });
        res.status(500).json({ success: false, code: 'UPDATE_ROLE_FAILED', message: 'Failed to update user role.' });
    }
};
