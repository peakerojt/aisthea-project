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
 * Supports two input methods:
 * 1. Multipart file upload (recommended for Postman testing)
 * 2. Base64 JSON data (for frontend)
 */
export const uploadAvatar = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        let avatarBase64: string;

        // Check if file was uploaded (multipart/form-data)
        if ((req as any).file) {
            const file = (req as any).file as Express.Multer.File;
            console.log('▶ Avatar upload via file:', {
                filename: file.originalname,
                mimetype: file.mimetype,
                size: `${(file.size / 1024).toFixed(2)} KB`,
            });

            // Convert file buffer to base64
            const base64 = file.buffer.toString('base64');
            avatarBase64 = `data:${file.mimetype};base64,${base64}`;
        }
        // Otherwise, check for base64 JSON data
        else if (req.body.avatar) {
            const { avatar } = req.body;

            // Validate base64 format
            if (!avatar.startsWith('data:image/')) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid image format. Please upload a valid image file (JPEG, PNG, GIF, or WebP).',
                });
            }

            // Extract MIME type for validation
            const mimeType = avatar.split(';')[0].split(':')[1];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

            if (!allowedTypes.includes(mimeType)) {
                return res.status(400).json({
                    success: false,
                    message: `Unsupported image type: ${mimeType}. Allowed types: JPEG, PNG, GIF, WebP`,
                });
            }

            console.log('▶ Avatar upload via base64 JSON:', {
                mimetype: mimeType,
                size: `${(avatar.length * 0.75 / 1024).toFixed(2)} KB`,
            });

            avatarBase64 = avatar;
        }
        // No valid input provided
        else {
            return res.status(400).json({
                success: false,
                message: 'No avatar provided. Please upload a file or send base64 data in the "avatar" field.',
            });
        }

        // Upload to Cloudinary
        const updatedUser = await userService.uploadAvatar(userId, avatarBase64);

        res.status(200).json({
            success: true,
            message: 'Avatar uploaded successfully to cloud storage',
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
