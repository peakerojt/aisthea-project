import { api } from '../utils/api';

export interface UserProfile {
    userId: number;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl: string | null;
    googleId: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    completeness: number;
}

export interface Address {
    addressId: number;
    userId: number;
    recipientName: string;
    phone: string;
    addressLine: string;
    city: string;
    district: string | null;
    isDefault: boolean;
}

export interface UpdateProfileData {
    fullName?: string;
    phone?: string;
}

export interface CreateAddressData {
    recipientName: string;
    phone: string;
    addressLine: string;
    city: string;
    district?: string;
    isDefault?: boolean;
}

export interface RecentOrder {
    orderId: number;
    orderNumber: string;
    totalAmount: number;
    status: string;
    createdAt: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

class UserService {
    /**
     * Get current user's profile
     */
    async getProfile(): Promise<UserProfile> {
        const response = await api.get<ApiResponse<UserProfile>>('/api/users/profile');
        return response.data;
    }

    /**
     * Update user profile
     */
    async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
        const response = await api.put<ApiResponse<UserProfile>>('/api/users/profile', data);
        return response.data;
    }

    /**
     * Upload avatar (base64)
     */
    async uploadAvatar(avatarBase64: string): Promise<{ userId: number; avatarUrl: string }> {
        const response = await api.post<ApiResponse<{ userId: number; avatarUrl: string }>>('/api/users/avatar', { avatar: avatarBase64 });
        return response.data;
    }

    /**
     * Delete avatar
     */
    async deleteAvatar(): Promise<{ userId: number; avatarUrl: null }> {
        const response = await api.delete<ApiResponse<{ userId: number; avatarUrl: null }>>('/api/users/avatar');
        return response.data;
    }

    /**
     * Get user addresses
     */
    async getAddresses(): Promise<Address[]> {
        const response = await api.get<ApiResponse<Address[]>>('/api/users/addresses');
        return response.data;
    }

    /**
     * Create new address
     */
    async createAddress(data: CreateAddressData): Promise<Address> {
        const response = await api.post<ApiResponse<Address>>('/api/users/addresses', data);
        return response.data;
    }

    /**
     * Update address
     */
    async updateAddress(addressId: number, data: Partial<CreateAddressData>): Promise<Address> {
        const response = await api.put<ApiResponse<Address>>(`/api/users/addresses/${addressId}`, data);
        return response.data;
    }

    /**
     * Delete address
     */
    async deleteAddress(addressId: number): Promise<void> {
        await api.delete(`/api/users/addresses/${addressId}`);
    }

    /**
     * Set address as default
     */
    async setDefaultAddress(addressId: number): Promise<Address> {
        const response = await api.put<ApiResponse<Address>>(`/api/users/addresses/${addressId}/default`);
        return response.data;
    }

    /**
     * Get recent orders
     */
    async getRecentOrders(limit: number = 5): Promise<RecentOrder[]> {
        const response = await api.get<ApiResponse<RecentOrder[]>>(`/api/users/recent-orders`, { params: { limit: limit.toString() } });
        return response.data;
    }
}

export const userService = new UserService();
