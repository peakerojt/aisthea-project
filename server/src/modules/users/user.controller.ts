import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../lib/logger';
import type { AuthRequest } from '../../middlewares/auth.middleware';
import type { AddressIdParams, AddressInput, UpdateProfileInput } from '../../utils/schemas/user.validator';
import { userModuleService, UserModuleError } from './user.service';

const UpdateRoleSchema = z.object({
  roleId: z.number().int().positive(),
});

const parseRouteId = (rawId: unknown) => {
  if (typeof rawId === 'number') return rawId;
  if (typeof rawId === 'string') return Number.parseInt(rawId, 10);
  return Number.NaN;
};

const extractAvatarPayload = (req: AuthRequest) => {
  if (req.file) {
    const file = req.file;
    logger.debug('[userModuleController] Avatar upload via file', {
      filename: file.originalname,
      mimetype: file.mimetype,
      sizeKb: (file.size / 1024).toFixed(2),
    });

    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }

  const avatar = req.body?.avatar;
  if (typeof avatar !== 'string') {
    throw new UserModuleError(400, 'INVALID_AVATAR_PAYLOAD');
  }

  if (!avatar.startsWith('data:image/')) {
    throw new UserModuleError(400, 'INVALID_AVATAR_FORMAT');
  }

  const mimeType = avatar.split(';')[0]?.split(':')[1] ?? '';
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(mimeType)) {
    throw new UserModuleError(400, 'UNSUPPORTED_AVATAR_TYPE');
  }

  logger.debug('[userModuleController] Avatar upload via base64', {
    mimetype: mimeType,
    sizeKb: (avatar.length * 0.75 / 1024).toFixed(2),
  });

  return avatar;
};

const getUserId = (req: AuthRequest) => req.user?.userId as number;

const sendUserModuleError = (res: Response, error: unknown, fallbackCode: string, fallbackStatus = 500) => {
  if (error instanceof UserModuleError) {
    return res.status(error.status).json({ success: false, code: error.code });
  }

  return res.status(fallbackStatus).json({ success: false, code: fallbackCode });
};

export const userController = {
  getProfile: async (req: AuthRequest, res: Response) => {
    try {
      const profile = await userModuleService.getProfile(getUserId(req));
      res.status(200).json({ success: true, data: profile });
    } catch (error) {
      logger.error('[userModuleController] getProfile failed', { error });
      sendUserModuleError(res, error, 'FETCH_PROFILE_FAILED');
    }
  },

  updateProfile: async (req: AuthRequest, res: Response) => {
    try {
      const updatedProfile = await userModuleService.updateProfile(getUserId(req), req.body as UpdateProfileInput);
      res.status(200).json({
        success: true,
        code: 'PROFILE_UPDATED',
        data: updatedProfile,
      });
    } catch (error) {
      logger.error('[userModuleController] updateProfile failed', { error });
      sendUserModuleError(res, error, 'UPDATE_PROFILE_FAILED', 400);
    }
  },

  uploadAvatar: async (req: AuthRequest, res: Response) => {
    try {
      const updatedUser = await userModuleService.uploadAvatar(getUserId(req), extractAvatarPayload(req));
      res.status(200).json({
        success: true,
        code: 'AVATAR_UPLOADED',
        data: updatedUser,
      });
    } catch (error) {
      logger.error('[userModuleController] uploadAvatar failed', { error });
      sendUserModuleError(res, error, 'UPLOAD_AVATAR_FAILED', 400);
    }
  },

  deleteAvatar: async (req: AuthRequest, res: Response) => {
    try {
      const updatedUser = await userModuleService.deleteAvatar(getUserId(req));
      res.status(200).json({
        success: true,
        code: 'AVATAR_DELETED',
        data: updatedUser,
      });
    } catch (error) {
      logger.error('[userModuleController] deleteAvatar failed', { error });
      sendUserModuleError(res, error, 'UPLOAD_AVATAR_FAILED');
    }
  },

  getAddresses: async (req: AuthRequest, res: Response) => {
    try {
      const addresses = await userModuleService.getAddresses(getUserId(req));
      res.status(200).json({ success: true, data: addresses });
    } catch (error) {
      logger.error('[userModuleController] getAddresses failed', { error });
      sendUserModuleError(res, error, 'FETCH_ADDRESSES_FAILED');
    }
  },

  createAddress: async (req: AuthRequest, res: Response) => {
    try {
      const address = await userModuleService.createAddress(getUserId(req), req.body as AddressInput);
      res.status(201).json({
        success: true,
        code: 'ADDRESS_CREATED',
        data: address,
      });
    } catch (error) {
      logger.error('[userModuleController] createAddress failed', { error });
      sendUserModuleError(res, error, 'CREATE_ADDRESS_FAILED', 400);
    }
  },

  updateAddress: async (req: AuthRequest, res: Response) => {
    try {
      const { id: addressId } = req.params as unknown as AddressIdParams;
      const updatedAddress = await userModuleService.updateAddress(
        getUserId(req),
        addressId,
        req.body as AddressInput,
      );

      res.status(200).json({
        success: true,
        code: 'ADDRESS_UPDATED',
        data: updatedAddress,
      });
    } catch (error) {
      logger.error('[userModuleController] updateAddress failed', { error });
      sendUserModuleError(res, error, 'UPDATE_ADDRESS_FAILED', 400);
    }
  },

  deleteAddress: async (req: AuthRequest, res: Response) => {
    try {
      const { id: addressId } = req.params as unknown as AddressIdParams;
      const result = await userModuleService.deleteAddress(getUserId(req), addressId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      logger.error('[userModuleController] deleteAddress failed', { error });
      sendUserModuleError(res, error, 'DELETE_ADDRESS_FAILED', 400);
    }
  },

  setDefaultAddress: async (req: AuthRequest, res: Response) => {
    try {
      const { id: addressId } = req.params as unknown as AddressIdParams;
      const updatedAddress = await userModuleService.setDefaultAddress(getUserId(req), addressId);
      res.status(200).json({
        success: true,
        code: 'DEFAULT_ADDRESS_SET',
        data: updatedAddress,
      });
    } catch (error) {
      logger.error('[userModuleController] setDefaultAddress failed', { error });
      sendUserModuleError(res, error, 'SET_DEFAULT_ADDRESS_FAILED', 400);
    }
  },

  getRecentOrders: async (req: AuthRequest, res: Response) => {
    try {
      const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 5;
      const orders = await userModuleService.getRecentOrders(getUserId(req), limit);
      res.status(200).json({ success: true, data: orders });
    } catch (error) {
      logger.error('[userModuleController] getRecentOrders failed', { error });
      sendUserModuleError(res, error, 'FETCH_RECENT_ORDERS_FAILED');
    }
  },

  getAllUsers: async (req: Request, res: Response) => {
    try {
      const { search, role, status, page, limit } = req.query as Record<string, string>;
      const result = await userModuleService.getAllUsers({
        search,
        role,
        status,
        page: page ? Number.parseInt(page, 10) : undefined,
        limit: limit ? Number.parseInt(limit, 10) : undefined,
      });
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      logger.error('[userModuleController] getAllUsers failed', { error });
      sendUserModuleError(res, error, 'FETCH_USERS_FAILED');
    }
  },

  updateUserStatus: async (req: AuthRequest, res: Response) => {
    try {
      const targetId = parseRouteId(req.params.id as string);
      if (Number.isNaN(targetId)) {
        return res.status(400).json({ success: false, code: 'INVALID_USER_ID' });
      }

      const updated = await userModuleService.updateUserStatus(getUserId(req), targetId);
      res.status(200).json({
        success: true,
        code: 'STATUS_UPDATED',
        data: updated,
      });
    } catch (error) {
      logger.error('[userModuleController] updateUserStatus failed', { error });
      sendUserModuleError(res, error, 'UPDATE_STATUS_FAILED');
    }
  },

  updateUserRole: async (req: Request, res: Response) => {
    try {
      const targetId = parseRouteId(req.params.id as string);
      if (Number.isNaN(targetId)) {
        return res.status(400).json({ success: false, code: 'INVALID_USER_ID' });
      }

      const parsed = UpdateRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_BODY',
        });
      }

      const result = await userModuleService.updateUserRole(targetId, parsed.data.roleId);
      res.status(200).json({
        success: true,
        code: 'ROLE_UPDATED',
        data: result,
      });
    } catch (error) {
      logger.error('[userModuleController] updateUserRole failed', { error });
      sendUserModuleError(res, error, 'UPDATE_ROLE_FAILED');
    }
  },
};
