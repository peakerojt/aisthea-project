import { Prisma } from '../../generated/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { clearPermissionCache } from '../../middlewares/auth.middleware';
import { cloudinaryService } from '../../services/cloudinary.service';
import type {
  AddressInput,
  BankAccountInput,
  UpdateProfileInput,
  UploadImagePayloadInput,
} from '../../utils/schemas/user.validator';
import {
  analyzeBankQrContent,
  compareBankAccountWithQrAnalysis,
  createBankQrValidationToken,
  verifyBankQrValidationToken,
} from './bank-qr-validation';

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

  constructor(status: number, code: string, message = code) {
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

const maskAccountNumber = (accountNumber: string) => {
  const normalized = accountNumber.replace(/\s+/g, '');
  if (normalized.length <= 4) return normalized;
  return `****${normalized.slice(-4)}`;
};

const mapBankAccountRecord = (bankAccount: {
  bankAccountId: number;
  bankName: string;
  bankCode: string | null;
  accountNumber: string;
  accountHolder: string;
  qrImageUrl: string | null;
  inputMethod: string;
  isDefault: boolean;
  isActive: boolean;
  updatedAt: Date;
  createdAt: Date;
}) => ({
  bankAccountId: bankAccount.bankAccountId,
  bankName: bankAccount.bankName,
  bankCode: bankAccount.bankCode,
  accountNumberMasked: maskAccountNumber(bankAccount.accountNumber),
  accountHolder: bankAccount.accountHolder,
  qrImageUrl: bankAccount.qrImageUrl,
  inputMethod: bankAccount.inputMethod,
  isDefault: bankAccount.isDefault,
  isActive: bankAccount.isActive,
  updatedAt: bankAccount.updatedAt,
  createdAt: bankAccount.createdAt,
});

const validateBankQrForBankAccount = ({
  userId,
  data,
  existingQrImageUrl,
}: {
  userId: number;
  data: BankAccountInput;
  existingQrImageUrl?: string | null;
}) => {
  const qrImageUrl = data.qrImageUrl?.trim() || null;
  const qrValidationToken = data.qrValidationToken?.trim() || null;

  if (!qrImageUrl) {
    if (qrValidationToken) {
      throw new UserModuleError(400, 'BANK_QR_ANALYSIS_INVALID');
    }

    return null;
  }

  if (!qrValidationToken) {
    if (existingQrImageUrl && existingQrImageUrl === qrImageUrl) {
      return null;
    }

    throw new UserModuleError(400, 'BANK_QR_ANALYSIS_INVALID');
  }

  let analysis;
  try {
    analysis = verifyBankQrValidationToken(qrValidationToken, userId, qrImageUrl);
  } catch {
    throw new UserModuleError(400, 'BANK_QR_ANALYSIS_INVALID');
  }

  const comparison = compareBankAccountWithQrAnalysis(
    {
      bankCode: data.bankCode,
      accountNumber: data.accountNumber,
      accountHolder: data.accountHolder,
    },
    analysis,
  );

  if (analysis.destinationType !== 'BANK') {
    throw new UserModuleError(400, 'BANK_QR_TYPE_MISMATCH');
  }

  if (comparison.issues.includes('SOFT_BANK_MISMATCH')) {
    throw new UserModuleError(400, 'BANK_QR_BANK_CODE_MISMATCH');
  }

  if (comparison.issues.includes('ACCOUNT_MISMATCH')) {
    throw new UserModuleError(400, 'BANK_QR_ACCOUNT_MISMATCH');
  }

  if (comparison.issues.includes('NAME_MISMATCH')) {
    throw new UserModuleError(400, 'BANK_QR_NAME_MISMATCH');
  }

  return analysis;
};

const formatRefundBenefitSummary = (benefit: {
  benefitType: string;
  percentValue: Prisma.Decimal | null;
  maxDiscountAmount: Prisma.Decimal | null;
}) => {
  if (benefit.benefitType === 'FREESHIP') {
    return 'Available voucher mien phi van chuyen';
  }

  const percentValue = benefit.percentValue ? Number(benefit.percentValue) : 0;
  const maxDiscountAmount = benefit.maxDiscountAmount ? Number(benefit.maxDiscountAmount) : 0;
  return `Available voucher ${percentValue}%, max ${maxDiscountAmount.toLocaleString('vi-VN')} VND`;
};

const resolveRefundBenefitStatus = (
  benefit: {
    status: string;
    validUntil: Date;
    usedAt: Date | null;
  },
) => {
  if (benefit.status === 'USED' || benefit.usedAt) return 'USED';
  if (benefit.status === 'CANCELLED') return 'CANCELLED';
  if (benefit.validUntil.getTime() < Date.now()) return 'EXPIRED';
  return benefit.status;
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
      throw new UserModuleError(404, 'USER_NOT_FOUND');
    }

    return {
      ...user,
      completeness: calculateProfileCompleteness(user),
    };
  },

  async updateProfile(userId: number, data: UpdateProfileInput) {
    if (data.fullName && data.fullName.trim().length === 0) {
      throw new UserModuleError(400, 'INVALID_BODY');
    }

    if (data.phone && !/^[0-9\s\-+()]+$/.test(data.phone)) {
      throw new UserModuleError(400, 'INVALID_BODY');
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
      throw new UserModuleError(400, 'INVALID_AVATAR_FORMAT');
    }

    const payload = avatarBase64.split(',')[1];
    const base64Size = payload ? Buffer.from(payload, 'base64').length : 0;
    const maxSize = 5 * 1024 * 1024;

    if (base64Size > maxSize) {
      throw new UserModuleError(400, 'INVALID_BODY');
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
    if (!data.recipientName || !data.phone || !data.addressLine || !data.city || !data.district || !data.ward) {
      throw new UserModuleError(400, 'ADDRESS_REQUIRED_FIELDS');
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
        district: data.district,
        ward: data.ward,
        isDefault: data.isDefault || false,
      },
    });
  },

  async updateAddress(userId: number, addressId: number, data: AddressInput) {
    const existingAddress = await prisma.address.findFirst({
      where: { addressId, userId },
    });

    if (!existingAddress) {
      throw new UserModuleError(404, 'ADDRESS_NOT_FOUND');
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
      throw new UserModuleError(404, 'ADDRESS_NOT_FOUND');
    }

    await prisma.address.delete({
      where: { addressId },
    });

    return { code: 'ADDRESS_DELETED' };
  },

  async setDefaultAddress(userId: number, addressId: number) {
    const existingAddress = await prisma.address.findFirst({
      where: { addressId, userId },
    });

    if (!existingAddress) {
      throw new UserModuleError(404, 'ADDRESS_NOT_FOUND');
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

  async listBankAccounts(userId: number) {
    const bankAccounts = await prisma.customerBankAccount.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });

    return bankAccounts.map(mapBankAccountRecord);
  },

  async createBankAccount(userId: number, data: BankAccountInput) {
    validateBankQrForBankAccount({
      userId,
      data,
    });

    return prisma.$transaction(async (tx) => {
      const activeCount = await tx.customerBankAccount.count({
        where: { userId, isActive: true },
      });
      const shouldSetDefault = activeCount === 0;

      if (shouldSetDefault) {
        await tx.customerBankAccount.updateMany({
          where: { userId, isDefault: true, isActive: true },
          data: { isDefault: false },
        });
      }

      const created = await tx.customerBankAccount.create({
        data: {
          userId,
          bankName: data.bankName,
          bankCode: data.bankCode?.trim() || null,
          accountNumber: data.accountNumber.trim(),
          accountHolder: data.accountHolder.trim(),
          qrImageUrl: data.qrImageUrl?.trim() || null,
          inputMethod: data.inputMethod,
          isDefault: shouldSetDefault,
          isActive: true,
        },
      });

      await tx.returnRequest.updateMany({
        where: {
          userId,
          status: 'ACCEPTED_FOR_REFUND',
        },
        data: {
          bankInfoSubmittedAt: new Date(),
        },
      });

      return mapBankAccountRecord(created);
    });
  },

  async updateBankAccount(userId: number, bankAccountId: number, data: BankAccountInput) {
    const existing = await prisma.customerBankAccount.findFirst({
      where: {
        bankAccountId,
        userId,
        isActive: true,
      },
    });

    if (!existing) {
      throw new UserModuleError(404, 'BANK_ACCOUNT_NOT_FOUND');
    }

    validateBankQrForBankAccount({
      userId,
      data,
      existingQrImageUrl: existing.qrImageUrl,
    });

    return prisma.$transaction(async (tx) => {
      if (existing.isDefault) {
        await tx.customerBankAccount.updateMany({
          where: { userId, isActive: true },
          data: {
            isDefault: false,
          },
        });
      }

      const updated = await tx.customerBankAccount.update({
        where: { bankAccountId },
        data: {
          bankName: data.bankName,
          bankCode: data.bankCode?.trim() || null,
          accountNumber: data.accountNumber.trim(),
          accountHolder: data.accountHolder.trim(),
          qrImageUrl: data.qrImageUrl?.trim() || null,
          inputMethod: data.inputMethod,
          isDefault: existing.isDefault,
          updatedAt: new Date(),
        },
      });

      await tx.returnRequest.updateMany({
        where: {
          userId,
          status: 'ACCEPTED_FOR_REFUND',
        },
        data: {
          bankInfoSubmittedAt: new Date(),
        },
      });

      return mapBankAccountRecord(updated);
    });
  },

  async deleteBankAccount(userId: number, bankAccountId: number) {
    const existing = await prisma.customerBankAccount.findFirst({
      where: {
        bankAccountId,
        userId,
        isActive: true,
      },
    });

    if (!existing) {
      throw new UserModuleError(404, 'BANK_ACCOUNT_NOT_FOUND');
    }

    await prisma.$transaction(async (tx) => {
      await tx.customerBankAccount.update({
        where: { bankAccountId },
        data: {
          isActive: false,
          isDefault: false,
          updatedAt: new Date(),
        },
      });

      if (existing.isDefault) {
        const fallbackAccount = await tx.customerBankAccount.findFirst({
          where: {
            userId,
            isActive: true,
          },
          orderBy: [{ updatedAt: 'desc' }, { bankAccountId: 'desc' }],
        });

        if (fallbackAccount) {
          await tx.customerBankAccount.update({
            where: { bankAccountId: fallbackAccount.bankAccountId },
            data: { isDefault: true, updatedAt: new Date() },
          });
        }
      }
    });

    return { code: 'BANK_ACCOUNT_DELETED' };
  },

  async setDefaultBankAccount(userId: number, bankAccountId: number) {
    const existing = await prisma.customerBankAccount.findFirst({
      where: {
        bankAccountId,
        userId,
        isActive: true,
      },
    });

    if (!existing) {
      throw new UserModuleError(404, 'BANK_ACCOUNT_NOT_FOUND');
    }

    return prisma.$transaction(async (tx) => {
      await tx.customerBankAccount.updateMany({
        where: { userId, isActive: true, isDefault: true },
        data: { isDefault: false },
      });

      const updated = await tx.customerBankAccount.update({
        where: { bankAccountId },
        data: {
          isDefault: true,
          updatedAt: new Date(),
        },
      });

      await tx.returnRequest.updateMany({
        where: {
          userId,
          status: 'ACCEPTED_FOR_REFUND',
        },
        data: {
          bankInfoSubmittedAt: new Date(),
        },
      });

      return mapBankAccountRecord(updated);
    });
  },

  async uploadBankQrImage(userId: number, payload: UploadImagePayloadInput) {
    if (!payload.imageData.startsWith('data:image/')) {
      throw new UserModuleError(400, 'INVALID_BANK_QR_FORMAT');
    }

    const mimeType = payload.imageData.split(';')[0]?.split(':')[1] ?? '';
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimeType)) {
      throw new UserModuleError(400, 'UNSUPPORTED_BANK_QR_TYPE');
    }

    const qrContent = payload.qrContent?.trim();
    if (!qrContent) {
      throw new UserModuleError(400, 'BANK_QR_ANALYSIS_INVALID');
    }

    const qrAnalysis = analyzeBankQrContent(qrContent);

    const uploadResult = await cloudinaryService.uploadBankQrImage(payload.imageData, userId);
    const qrValidationToken = createBankQrValidationToken(userId, uploadResult.secureUrl, qrAnalysis);

    return {
      fileUrl: uploadResult.secureUrl,
      fileName: payload.fileName ?? null,
      qrAnalysis,
      qrValidationToken,
    };
  },

  async listRefundBenefits(userId: number) {
    const benefits = await prisma.refundBenefit.findMany({
      where: {
        userId,
        source: 'REFUND',
      },
      orderBy: [{ validFrom: 'desc' }],
      include: {
        returnRequest: {
          select: {
            returnRequestId: true,
            orderId: true,
            refundCompletedAt: true,
          },
        },
      },
    });

    return benefits.map((benefit) => ({
      refundBenefitId: benefit.refundBenefitId,
      returnRequestId: benefit.returnRequestId,
      orderId: benefit.orderId,
      benefitType: benefit.benefitType,
      percentValue: benefit.percentValue ? Number(benefit.percentValue) : null,
      maxDiscountAmount: benefit.maxDiscountAmount ? Number(benefit.maxDiscountAmount) : null,
      minOrderValue: Number(benefit.minOrderValue),
      status: resolveRefundBenefitStatus(benefit),
      validFrom: benefit.validFrom,
      validUntil: benefit.validUntil,
      issuedAt: benefit.issuedAt,
      usedAt: benefit.usedAt,
      summary: formatRefundBenefitSummary(benefit),
      source: benefit.source,
      refundCompletedAt: benefit.returnRequest.refundCompletedAt ?? null,
    }));
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
      throw new UserModuleError(403, 'CANNOT_BAN_SELF');
    }

    const targetUser = await prisma.user.findUnique({
      where: { userId: targetId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!targetUser) {
      throw new UserModuleError(404, 'USER_NOT_FOUND');
    }

    const targetRoles = targetUser.userRoles.map((userRole) => userRole.role.roleName.toLowerCase());
    if (targetRoles.includes('admin')) {
      throw new UserModuleError(403, 'CANNOT_BAN_ADMIN');
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
      throw new UserModuleError(404, 'ROLE_NOT_FOUND');
    }

    const user = await prisma.user.findUnique({ where: { userId: targetId } });
    if (!user) {
      throw new UserModuleError(404, 'USER_NOT_FOUND');
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
