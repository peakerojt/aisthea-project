import { Request, Response } from 'express';
import { userService } from '../services/user.service';

/**
 * Get current user's profile
 */
export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;

        const profile = await userService.getProfile(userId);

        res.status(200).json({
            success: true,
            data: profile,
        });
    } catch (error: any) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get profile',
        });
    }
};

/**
 * Update user profile
 */
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { fullName, phone } = req.body;

        const updatedProfile = await userService.updateProfile(userId, {
            fullName,
            phone,
        });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedProfile,
        });
    } catch (error: any) {
        console.error('Update profile error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update profile',
        });
    }
};

/**
 * Upload avatar
 */
export const uploadAvatar = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { avatar } = req.body;

        if (!avatar) {
            return res.status(400).json({
                success: false,
                message: 'Avatar data is required',
            });
        }

        const updatedUser = await userService.uploadAvatar(userId, avatar);

        res.status(200).json({
            success: true,
            message: 'Avatar uploaded successfully',
            data: updatedUser,
        });
    } catch (error: any) {
        console.error('Upload avatar error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to upload avatar',
        });
    }
};

/**
 * Delete avatar
 */
export const deleteAvatar = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;

        const updatedUser = await userService.deleteAvatar(userId);

        res.status(200).json({
            success: true,
            message: 'Avatar deleted successfully',
            data: updatedUser,
        });
    } catch (error: any) {
        console.error('Delete avatar error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete avatar',
        });
    }
};

/**
 * Get user addresses
 */
export const getAddresses = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;

        const addresses = await userService.getAddresses(userId);

        res.status(200).json({
            success: true,
            data: addresses,
        });
    } catch (error: any) {
        console.error('Get addresses error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get addresses',
        });
    }
};

/**
 * Create new address
 */
export const createAddress = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const addressData = req.body;

        const newAddress = await userService.createAddress(userId, addressData);

        res.status(201).json({
            success: true,
            message: 'Address created successfully',
            data: newAddress,
        });
    } catch (error: any) {
        console.error('Create address error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create address',
        });
    }
};

/**
 * Update address
 */
export const updateAddress = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const addressId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const addressData = req.body;

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
    } catch (error: any) {
        console.error('Update address error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update address',
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
    } catch (error: any) {
        console.error('Delete address error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to delete address',
        });
    }
};

/**
 * Set default address
 */
export const setDefaultAddress = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
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
    } catch (error: any) {
        console.error('Set default address error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to set default address',
        });
    }
};

/**
 * Get recent orders for profile display
 */
export const getRecentOrders = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

        const orders = await userService.getRecentOrders(userId, limit);

        res.status(200).json({
            success: true,
            data: orders,
        });
    } catch (error: any) {
        console.error('Get recent orders error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get recent orders',
        });
    }
};
