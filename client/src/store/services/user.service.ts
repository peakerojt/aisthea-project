import { api } from '@/common/utils/api';
import type { BankQrAnalysis } from '@/common/utils/bankQrAnalysis';
import {
    addressIdClientParamSchema,
    bankAccountClientSchema,
    bankAccountIdClientParamSchema,
    profileAddressClientSchema,
    profileUpdateClientSchema,
    uploadImageClientSchema,
    type BankAccountClientInput,
    type ProfileAddressClientInput,
} from '@/common/validation/schemas';

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
    ward: string | null;
    isDefault: boolean;
}

export interface UpdateProfileData {
    fullName?: string;
    phone?: string;
}

export interface RecentOrder {
    orderId: number;
    orderNumber: string;
    totalAmount: number;
    status: string;
    createdAt: string;
}

export interface BankAccount {
    bankAccountId: number;
    bankName: string;
    bankCode: string | null;
    accountNumberMasked: string;
    accountHolder: string;
    qrImageUrl: string | null;
    inputMethod: 'MANUAL' | 'QR_IMAGE' | string;
    isDefault: boolean;
    isActive: boolean;
    updatedAt: string;
    createdAt: string;
}

export interface RefundBenefitItem {
    refundBenefitId: number;
    returnRequestId: number;
    orderId: number;
    benefitType: 'FREESHIP' | 'PERCENTAGE' | string;
    percentValue: number | null;
    maxDiscountAmount: number | null;
    minOrderValue: number;
    status: string;
    validFrom: string;
    validUntil: string;
    issuedAt: string | null;
    usedAt: string | null;
    summary: string;
    source: string;
    refundCompletedAt: string | null;
}

export interface UploadImageResult {
    fileUrl: string;
    fileName: string | null;
}

export interface BankQrUploadResult extends UploadImageResult {
    qrAnalysis: BankQrAnalysis;
    qrValidationToken: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

class UserService {
    async getProfile(): Promise<UserProfile> {
        const response = await api.get<ApiResponse<UserProfile>>('/api/users/profile');
        return response.data;
    }

    async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
        const payload = profileUpdateClientSchema.parse(data);
        const response = await api.put<ApiResponse<UserProfile>>('/api/users/profile', payload);
        return response.data;
    }

    async uploadAvatar(avatarBase64: string): Promise<{ userId: number; avatarUrl: string }> {
        const response = await api.post<ApiResponse<{ userId: number; avatarUrl: string }>>('/api/users/avatar', { avatar: avatarBase64 });
        return response.data;
    }

    async deleteAvatar(): Promise<{ userId: number; avatarUrl: null }> {
        const response = await api.delete<ApiResponse<{ userId: number; avatarUrl: null }>>('/api/users/avatar');
        return response.data;
    }

    async getAddresses(): Promise<Address[]> {
        const response = await api.get<ApiResponse<Address[]>>('/api/users/addresses');
        return response.data;
    }

    async createAddress(data: ProfileAddressClientInput): Promise<Address> {
        const payload = profileAddressClientSchema.parse(data);
        const response = await api.post<ApiResponse<Address>>('/api/users/addresses', payload);
        return response.data;
    }

    async updateAddress(addressId: number, data: ProfileAddressClientInput): Promise<Address> {
        const { id } = addressIdClientParamSchema.parse({ id: addressId });
        const payload = profileAddressClientSchema.parse(data);
        const response = await api.put<ApiResponse<Address>>(`/api/users/addresses/${id}`, payload);
        return response.data;
    }

    async deleteAddress(addressId: number): Promise<void> {
        const { id } = addressIdClientParamSchema.parse({ id: addressId });
        await api.delete(`/api/users/addresses/${id}`);
    }

    async setDefaultAddress(addressId: number): Promise<Address> {
        const { id } = addressIdClientParamSchema.parse({ id: addressId });
        const response = await api.put<ApiResponse<Address>>(`/api/users/addresses/${id}/default`);
        return response.data;
    }

    async getRecentOrders(limit: number = 5): Promise<RecentOrder[]> {
        const response = await api.get<ApiResponse<RecentOrder[]>>(`/api/users/recent-orders`, { params: { limit: limit.toString() } });
        return response.data;
    }

    async getBankAccounts(): Promise<BankAccount[]> {
        const response = await api.get<ApiResponse<BankAccount[]>>('/api/users/bank-accounts');
        return response.data;
    }

    async createBankAccount(data: BankAccountClientInput): Promise<BankAccount> {
        const payload = bankAccountClientSchema.parse(data);
        const response = await api.post<ApiResponse<BankAccount>>('/api/users/bank-accounts', payload);
        return response.data;
    }

    async updateBankAccount(bankAccountId: number, data: BankAccountClientInput): Promise<BankAccount> {
        const { id } = bankAccountIdClientParamSchema.parse({ id: bankAccountId });
        const payload = bankAccountClientSchema.parse(data);
        const response = await api.put<ApiResponse<BankAccount>>(`/api/users/bank-accounts/${id}`, payload);
        return response.data;
    }

    async deleteBankAccount(bankAccountId: number): Promise<void> {
        const { id } = bankAccountIdClientParamSchema.parse({ id: bankAccountId });
        await api.delete(`/api/users/bank-accounts/${id}`);
    }

    async setDefaultBankAccount(bankAccountId: number): Promise<BankAccount> {
        const { id } = bankAccountIdClientParamSchema.parse({ id: bankAccountId });
        const response = await api.patch<ApiResponse<BankAccount>>(`/api/users/bank-accounts/${id}/default`);
        return response.data;
    }

    async uploadBankQrImage(imageData: string, fileName?: string, qrContent?: string): Promise<BankQrUploadResult> {
        const payload = uploadImageClientSchema.parse({ imageData, fileName, qrContent });
        const response = await api.post<ApiResponse<BankQrUploadResult>>('/api/users/bank-accounts/upload-qr-image', payload);
        return response.data;
    }

    async getRefundBenefits(): Promise<RefundBenefitItem[]> {
        const response = await api.get<ApiResponse<RefundBenefitItem[]>>('/api/users/refund-benefits');
        return response.data;
    }
}

export const userService = new UserService();
