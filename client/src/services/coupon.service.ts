import { api } from '../utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CouponType = 'FIXED_AMOUNT' | 'PERCENTAGE';
export type CouponStatus = 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'UPCOMING' | 'INACTIVE';

export interface Coupon {
    couponId: number;
    code: string;
    type: CouponType;
    value: number;
    maxDiscountAmount: number | null;
    minOrderValue: number;
    startDate: string;
    endDate: string;
    usageLimit: number;
    usedCount: number;
    usagePerUser: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    status: CouponStatus;
}

export interface CouponListResponse {
    coupons: Coupon[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

export interface ValidateCouponResult {
    coupon: Pick<Coupon, 'couponId' | 'code' | 'type' | 'value' | 'maxDiscountAmount' | 'minOrderValue'>;
    discountAmount: number;
    message: string;
}

export interface CreateCouponPayload {
    code: string;
    type: CouponType;
    value: number;
    maxDiscountAmount?: number | null;
    minOrderValue?: number;
    startDate: string;
    endDate: string;
    usageLimit: number;
    usagePerUser?: number;
    isActive?: boolean;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export const fetchCoupons = async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
}): Promise<CouponListResponse> => {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.pageSize) query.pageSize = String(params.pageSize);
    if (params?.search) query.search = params.search;
    if (params?.isActive !== undefined) query.isActive = String(params.isActive);
    return api.get<CouponListResponse>('/api/coupons', { params: query });
};

export const createCoupon = async (payload: CreateCouponPayload): Promise<Coupon> => {
    return api.post<Coupon>('/api/coupons', payload);
};

export const updateCoupon = async (couponId: number, payload: Partial<CreateCouponPayload>): Promise<Coupon> => {
    return api.put<Coupon>(`/api/coupons/${couponId}`, payload);
};

export const deleteCoupon = async (couponId: number): Promise<{ success: boolean; message: string }> => {
    return api.delete<{ success: boolean; message: string }>(`/api/coupons/${couponId}`);
};

export const validateCoupon = async (code: string, cartSubtotal: number): Promise<ValidateCouponResult> => {
    return api.post<ValidateCouponResult>('/api/coupons/validate', { code, cartSubtotal });
};
