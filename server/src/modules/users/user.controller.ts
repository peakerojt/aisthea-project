import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../lib/logger';
import type { AuthRequest } from '../../middlewares/auth.middleware';
import type { AddressInput, UpdateProfileInput } from '../../utils/schemas/user.validator';
import { userModuleService, UserModuleError } from './user.service';

const UpdateRoleSchema = z.object({
  roleId: z.number().int().positive(),
});

const parseRouteId = (rawId: string) => Number.parseInt(rawId, 10);

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
    throw new Error('No avatar provided. Please upload a file or send base64 data in the "avatar" field.');
  }

  if (!avatar.startsWith('data:image/')) {
    throw new Error('Invalid image format. Please upload a valid image file (JPEG, PNG, GIF, or WebP).');
  }

  const mimeType = avatar.split(';')[0]?.split(':')[1] ?? '';
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}. Allowed types: JPEG, PNG, GIF, WebP`);
  }

  logger.debug('[userModuleController] Avatar upload via base64', {
    mimetype: mimeType,
    sizeKb: (avatar.length * 0.75 / 1024).toFixed(2),
  });

  return avatar;
};

const getUserId = (req: AuthRequest) => req.user?.userId as number;

export const userController = {
  getProfile: async (req: AuthRequest, res: Response) => {
    try {
      const profile = await userModuleService.getProfile(getUserId(req));
      res.status(200).json({ success: true, data: profile });
    } catch (error) {
      logger.error('[userModuleController] getProfile failed', { error });
      res.status(500).json({ success: false, message: 'Failed to get profile' });
    }
  },

  updateProfile: async (req: AuthRequest, res: Response) => {
    try {
      const updatedProfile = await userModuleService.updateProfile(getUserId(req), req.body as UpdateProfileInput);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile,
      });
    } catch (error: unknown) {
      logger.error('[userModuleController] updateProfile failed', { error });
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      res.status(400).json({ success: false, message });
    }
  },

  uploadAvatar: async (req: AuthRequest, res: Response) => {
    try {
      const updatedUser = await userModuleService.uploadAvatar(getUserId(req), extractAvatarPayload(req));
      res.status(200).json({
        success: true,
        message: 'Avatar uploaded successfully to cloud storage',
        data: updatedUser,
      });
    } catch (error: unknown) {
      logger.error('[userModuleController] uploadAvatar failed', { error });
      const message = error instanceof Error ? error.message : 'Failed to upload avatar';
      res.status(400).json({ success: false, message });
    }
  },

  deleteAvatar: async (req: AuthRequest, res: Response) => {
    try {
      const updatedUser = await userModuleService.deleteAvatar(getUserId(req));
      res.status(200).json({
        success: true,
        message: 'Avatar deleted successfully',
        data: updatedUser,
      });
    } catch (error) {
      logger.error('[userModuleController] deleteAvatar failed', { error });
      res.status(500).json({ success: false, message: 'Failed to delete avatar' });
    }
  },

  getAddresses: async (req: AuthRequest, res: Response) => {
    try {
      const addresses = await userModuleService.getAddresses(getUserId(req));
      res.status(200).json({ success: true, data: addresses });
    } catch (error) {
      logger.error('[userModuleController] getAddresses failed', { error });
      res.status(500).json({ success: false, message: 'Failed to get addresses' });
    }
  },

  createAddress: async (req: AuthRequest, res: Response) => {
    try {
      const address = await userModuleService.createAddress(getUserId(req), req.body as AddressInput);
      res.status(201).json({
        success: true,
        message: 'Address created successfully',
        data: address,
      });
    } catch (error: unknown) {
      logger.error('[userModuleController] createAddress failed', { error });
      const message = error instanceof Error ? error.message : 'Failed to create address';
      res.status(400).json({ success: false, message });
    }
  },

  updateAddress: async (req: AuthRequest, res: Response) => {
    try {
      const addressId = parseRouteId(req.params.id as string);
      if (Number.isNaN(addressId)) {
        return res.status(400).json({ success: false, message: 'Invalid address ID' });
      }

      const updatedAddress = await userModuleService.updateAddress(
        getUserId(req),
        addressId,
        req.body as AddressInput,
      );

      res.status(200).json({
        success: true,
        message: 'Address updated successfully',
        data: updatedAddress,
      });
    } catch (error: unknown) {
      logger.error('[userModuleController] updateAddress failed', { error });
      const message = error instanceof Error ? error.message : 'Failed to update address';
      res.status(400).json({ success: false, message });
    }
  },

  deleteAddress: async (req: AuthRequest, res: Response) => {
    try {
      const addressId = parseRouteId(req.params.id as string);
      if (Number.isNaN(addressId)) {
        return res.status(400).json({ success: false, message: 'Invalid address ID' });
      }

      const result = await userModuleService.deleteAddress(getUserId(req), addressId);
      res.status(200).json({ success: true, ...result });
    } catch (error: unknown) {
      logger.error('[userModuleController] deleteAddress failed', { error });
      const message = error instanceof Error ? error.message : 'Failed to delete address';
      res.status(400).json({ success: false, message });
    }
  },

  setDefaultAddress: async (req: AuthRequest, res: Response) => {
    try {
      const addressId = parseRouteId(req.params.id as string);
      if (Number.isNaN(addressId)) {
        return res.status(400).json({ success: false, message: 'Invalid address ID' });
      }

      const updatedAddress = await userModuleService.setDefaultAddress(getUserId(req), addressId);
      res.status(200).json({
        success: true,
        message: 'Default address set successfully',
        data: updatedAddress,
      });
    } catch (error: unknown) {
      logger.error('[userModuleController] setDefaultAddress failed', { error });
      const message = error instanceof Error ? error.message : 'Failed to set default address';
      res.status(400).json({ success: false, message });
    }
  },

  getRecentOrders: async (req: AuthRequest, res: Response) => {
    try {
      const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 5;
      const orders = await userModuleService.getRecentOrders(getUserId(req), limit);
      res.status(200).json({ success: true, data: orders });
    } catch (error) {
      logger.error('[userModuleController] getRecentOrders failed', { error });
      res.status(500).json({ success: false, message: 'Failed to get recent orders' });
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
      res.status(500).json({ success: false, code: 'FETCH_USERS_FAILED', message: 'Failed to fetch users.' });
    }
  },

  updateUserStatus: async (req: AuthRequest, res: Response) => {
    try {
      const targetId = parseRouteId(req.params.id as string);
      if (Number.isNaN(targetId)) {
        return res.status(400).json({ success: false, code: 'INVALID_USER_ID', message: 'Invalid user ID.' });
      }

      const updated = await userModuleService.updateUserStatus(getUserId(req), targetId);
      res.status(200).json({
        success: true,
        code: 'STATUS_UPDATED',
        message: 'User status updated successfully.',
        data: updated,
      });
    } catch (error) {
      logger.error('[userModuleController] updateUserStatus failed', { error });
      if (error instanceof UserModuleError) {
        return res.status(error.status).json({ success: false, code: error.code, message: error.message });
      }
      res.status(500).json({ success: false, code: 'UPDATE_STATUS_FAILED', message: 'Failed to update user status.' });
    }
  },

  updateUserRole: async (req: Request, res: Response) => {
    try {
      const targetId = parseRouteId(req.params.id as string);
      if (Number.isNaN(targetId)) {
        return res.status(400).json({ success: false, code: 'INVALID_USER_ID', message: 'Invalid user ID.' });
      }

      const parsed = UpdateRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_BODY',
          message: parsed.error.issues[0]?.message || 'Invalid request body.',
        });
      }

      const result = await userModuleService.updateUserRole(targetId, parsed.data.roleId);
      res.status(200).json({
        success: true,
        code: 'ROLE_UPDATED',
        message: 'User role updated successfully.',
        data: result,
      });
    } catch (error) {
      logger.error('[userModuleController] updateUserRole failed', { error });
      if (error instanceof UserModuleError) {
        return res.status(error.status).json({ success: false, code: error.code, message: error.message });
      }
      res.status(500).json({ success: false, code: 'UPDATE_ROLE_FAILED', message: 'Failed to update user role.' });
    }
  },
};
