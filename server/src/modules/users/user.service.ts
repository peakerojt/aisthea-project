import { Prisma } from '../../generated/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { clearPermissionCache } from '../../middlewares/auth.middleware';
import { cloudinaryService } from '../../services/cloudinary.service';
import type { AddressInput, UpdateProfileInput } from '../../utils/schemas/user.validator';

type AdminUserListFilters = {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
};

class UserModuleError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const calculateProfileCompleteness = (user: {
  fullName: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}) => {
  const fields = [user.fullName, user.email, user.phone, user.avatarUrl];
  const filledFields = fields.filter((field) => Boolean(field && field !== ''));
  return Math.round((filledFields.length / fields.length) * 100);
};

export const userModuleService = {
  async getProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        googleId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      ...user,
      completeness: calculateProfileCompleteness(user),
    };
  },

  async updateProfile(userId: number, data: UpdateProfileInput) {
    if (data.fullName && data.fullName.trim().length === 0) {
      throw new Error('Full name cannot be empty');
    }

    if (data.phone && !/^[0-9\s\-\+\(\)]+$/.test(data.phone)) {
      throw new Error('Invalid phone number format');
    }

    return prisma.user.update({
      where: { userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      select: {
        userId: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        status: true,
      },
    });
  },

  async uploadAvatar(userId: number, avatarBase64: string) {
    if (!avatarBase64.startsWith('data:image/')) {
      throw new Error('Invalid image format. Only images are allowed.');
    }

    const payload = avatarBase64.split(',')[1];
    const base64Size = payload ? Buffer.from(payload, 'base64').length : 0;
    const maxSize = 5 * 1024 * 1024;

    if (base64Size > maxSize) {
      throw new Error('Image size exceeds 5MB limit');
    }

    const currentUser = await prisma.user.findUnique({
      where: { userId },
      select: { avatarUrl: true },
    });

    if (currentUser?.avatarUrl && currentUser.avatarUrl.includes('cloudinary.com')) {
      try {
        const publicId = cloudinaryService.extractPublicId(currentUser.avatarUrl);
        if (publicId) {
          await cloudinaryService.deleteImage(publicId);
        }
      } catch (error) {
        logger.warn('[userModuleService] Failed to delete old avatar, continuing with upload', { error });
      }
    }

    const uploadResult = await cloudinaryService.uploadAvatar(avatarBase64, userId);

    return prisma.user.update({
      where: { userId },
      data: {
        avatarUrl: uploadResult.secureUrl,
        updatedAt: new Date(),
      },
      select: {
        userId: true,
        avatarUrl: true,
      },
    });
  },

  async deleteAvatar(userId: number) {
    const currentUser = await prisma.user.findUnique({
      where: { userId },
      select: { avatarUrl: true },
    });

    if (currentUser?.avatarUrl && currentUser.avatarUrl.includes('cloudinary.com')) {
      try {
        const publicId = cloudinaryService.extractPublicId(currentUser.avatarUrl);
        if (publicId) {
          await cloudinaryService.deleteImage(publicId);
        }
      } catch (error) {
        logger.error('[userModuleService] Failed to delete avatar from Cloudinary', { error });
      }
    }

    return prisma.user.update({
      where: { userId },
      data: {
        avatarUrl: null,
        updatedAt: new Date(),
      },
      select: {
        userId: true,
        avatarUrl: true,
      },
    });
  },

  async getAddresses(userId: number) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { addressId: 'desc' }],
    });
  },

  async createAddress(userId: number, data: AddressInput) {
    if (!data.recipientName || !data.phone || !data.addressLine || !data.city) {
      throw new Error('Missing required fields: recipientName, phone, addressLine, city');
    }

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.address.create({
      data: {
        userId,
        recipientName: data.recipientName,
        phone: data.phone,
        addressLine: data.addressLine,
        city: data.city,
        district: data.district || null,
        isDefault: data.isDefault || false,
      },
    });
  },

  async updateAddress(userId: number, addressId: number, data: AddressInput) {
    const existingAddress = await prisma.address.findFirst({
      where: { addressId, userId },
    });

    if (!existingAddress) {
      throw new Error('Address not found or access denied');
    }

    if (data.isDefault === true) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, addressId: { not: addressId } },
        data: { isDefault: false },
      });
    }

    return prisma.address.update({
      where: { addressId },
      data,
    });
  },

  async deleteAddress(userId: number, addressId: number) {
    const existingAddress = await prisma.address.findFirst({
      where: { addressId, userId },
    });

    if (!existingAddress) {
      throw new Error('Address not found or access denied');
    }

    await prisma.address.delete({
      where: { addressId },
    });

    return { message: 'Address deleted successfully' };
  },

  async setDefaultAddress(userId: number, addressId: number) {
    const existingAddress = await prisma.address.findFirst({
      where: { addressId, userId },
    });

    if (!existingAddress) {
      throw new Error('Address not found or access denied');
    }

    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return prisma.address.update({
      where: { addressId },
      data: { isDefault: true },
    });
  },

  async getRecentOrders(userId: number, limit = 5) {
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        orderId: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      },
    });
  },

  async getAllUsers(filters: AdminUserListFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 50));
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {};

    if (filters.search && filters.search.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters.role && filters.role !== 'all') {
      where.userRoles = {
        some: {
          role: { roleName: filters.role },
        },
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
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
      prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => ({
        userId: user.userId,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        status: user.status,
        createdAt: user.createdAt,
        roles: user.userRoles.map((userRole) => ({
          roleId: userRole.roleId,
          roleName: userRole.role.roleName,
        })),
        totalOrders: user._count.orders,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async updateUserStatus(requesterId: number, targetId: number) {
    if (requesterId === targetId) {
      throw new UserModuleError(403, 'CANNOT_BAN_SELF', 'You cannot ban your own account.');
    }

    const targetUser = await prisma.user.findUnique({
      where: { userId: targetId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!targetUser) {
      throw new UserModuleError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    const targetRoles = targetUser.userRoles.map((userRole) => userRole.role.roleName.toLowerCase());
    if (targetRoles.includes('admin')) {
      throw new UserModuleError(403, 'CANNOT_BAN_ADMIN', 'You cannot ban another admin account.');
    }

    const updated = await prisma.user.update({
      where: { userId: targetId },
      data: {
        status: targetUser.status === 'Active' ? 'Banned' : 'Active',
        updatedAt: new Date(),
      },
      select: { userId: true, fullName: true, status: true },
    });

    clearPermissionCache(targetId);
    return updated;
  },

  async updateUserRole(targetId: number, roleId: number) {
    const role = await prisma.role.findUnique({ where: { roleId } });
    if (!role) {
      throw new UserModuleError(404, 'ROLE_NOT_FOUND', 'Role not found.');
    }

    const user = await prisma.user.findUnique({ where: { userId: targetId } });
    if (!user) {
      throw new UserModuleError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: targetId } }),
      prisma.userRole.create({ data: { userId: targetId, roleId } }),
    ]);

    clearPermissionCache(targetId);
    return {
      userId: targetId,
      role: {
        roleId: role.roleId,
        roleName: role.roleName,
      },
    };
  },
};

export { UserModuleError };
