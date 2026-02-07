import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

interface UpdateProfileData {
    fullName?: string;
    phone?: string;
}

interface AddressData {
    recipientName: string;
    phone: string;
    addressLine: string;
    city: string;
    district?: string;
    isDefault?: boolean;
}

export class UserService {
    /**
     * Get user profile with computed fields
     */
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

        // Calculate profile completeness
        const completeness = this.calculateProfileCompleteness(user);

        return {
            ...user,
            completeness,
        };
    }

    /**
     * Calculate profile completeness percentage
     */
    private calculateProfileCompleteness(user: any): number {
        const fields = ['fullName', 'email', 'phone', 'avatarUrl'];
        const filledFields = fields.filter(field => user[field] && user[field] !== '');
        return Math.round((filledFields.length / fields.length) * 100);
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: number, data: UpdateProfileData) {
        // Validate data
        if (data.fullName && data.fullName.trim().length === 0) {
            throw new Error('Full name cannot be empty');
        }

        if (data.phone && !/^[0-9\s\-\+\(\)]+$/.test(data.phone)) {
            throw new Error('Invalid phone number format');
        }

        const updatedUser = await prisma.user.update({
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

        return updatedUser;
    }

    /**
     * Upload avatar (base64)
     */
    async uploadAvatar(userId: number, avatarBase64: string) {
        // Validate base64 string
        if (!avatarBase64.startsWith('data:image/')) {
            throw new Error('Invalid image format. Only images are allowed.');
        }

        // Check file size (max 2MB)
        const base64Size = Buffer.from(avatarBase64.split(',')[1], 'base64').length;
        const maxSize = 2 * 1024 * 1024; // 2MB

        if (base64Size > maxSize) {
            throw new Error('Image size exceeds 2MB limit');
        }

        const updatedUser = await prisma.user.update({
            where: { userId },
            data: {
                avatarUrl: avatarBase64,
                updatedAt: new Date(),
            },
            select: {
                userId: true,
                avatarUrl: true,
            },
        });

        return updatedUser;
    }

    /**
     * Delete avatar
     */
    async deleteAvatar(userId: number) {
        const updatedUser = await prisma.user.update({
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

        return updatedUser;
    }

    /**
     * Get user addresses
     */
    async getAddresses(userId: number) {
        const addresses = await prisma.address.findMany({
            where: { userId },
            orderBy: [
                { isDefault: 'desc' },
                { addressId: 'desc' },
            ],
        });

        return addresses;
    }

    /**
     * Create new address
     */
    async createAddress(userId: number, data: AddressData) {
        // Validate required fields
        if (!data.recipientName || !data.phone || !data.addressLine || !data.city) {
            throw new Error('Missing required fields: recipientName, phone, addressLine, city');
        }

        // If setting as default, unset other defaults first
        if (data.isDefault) {
            await prisma.address.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            });
        }

        const address = await prisma.address.create({
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

        return address;
    }

    /**
     * Update address
     */
    async updateAddress(userId: number, addressId: number, data: Partial<AddressData>) {
        // Verify address belongs to user
        const existingAddress = await prisma.address.findFirst({
            where: { addressId, userId },
        });

        if (!existingAddress) {
            throw new Error('Address not found or access denied');
        }

        // If setting as default, unset other defaults first
        if (data.isDefault === true) {
            await prisma.address.updateMany({
                where: { userId, isDefault: true, addressId: { not: addressId } },
                data: { isDefault: false },
            });
        }

        const updatedAddress = await prisma.address.update({
            where: { addressId },
            data,
        });

        return updatedAddress;
    }

    /**
     * Delete address
     */
    async deleteAddress(userId: number, addressId: number) {
        // Verify address belongs to user
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
    }

    /**
     * Set address as default
     */
    async setDefaultAddress(userId: number, addressId: number) {
        // Verify address belongs to user
        const existingAddress = await prisma.address.findFirst({
            where: { addressId, userId },
        });

        if (!existingAddress) {
            throw new Error('Address not found or access denied');
        }

        // Unset all defaults for this user
        await prisma.address.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
        });

        // Set this address as default
        const updatedAddress = await prisma.address.update({
            where: { addressId },
            data: { isDefault: true },
        });

        return updatedAddress;
    }

    /**
     * Get recent orders for profile display
     */
    async getRecentOrders(userId: number, limit: number = 5) {
        const orders = await prisma.order.findMany({
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

        return orders;
    }
}

export const userService = new UserService();
