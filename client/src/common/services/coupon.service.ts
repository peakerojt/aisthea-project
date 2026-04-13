// Removed api import for coupon.service.ts
// ─── Types ────────────────────────────────────────────────────────────────────

export type CouponType = 'FIXED_AMOUNT' | 'PERCENTAGE';
export type CouponStatus = 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'UPCOMING' | 'INACTIVE';
export type CouponSortValue =
    | 'createdAt_desc'
    | 'createdAt_asc'
    | 'endDate_asc'
    | 'endDate_desc'
    | 'usedCount_desc'
    | 'usedCount_asc';

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
    isHidden?: boolean;
    source?: string | null;
    visibleInPublicList?: boolean;
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
    summary?: {
        total: number;
        active: number;
        expired: number;
        depleted: number;
        upcoming: number;
        inactive: number;
    };
}

export interface ValidateCouponResult {
    coupon: Pick<Coupon, 'couponId' | 'code' | 'type' | 'value' | 'maxDiscountAmount' | 'minOrderValue' | 'source'>;
    discountAmount: number;
    message: string;
}

export interface CreateCouponPayload {
    code: string;
    type: CouponType;
    value: number;
    maxDiscountAmount?: number | null;
    minOrderValue?: number;
    startDate: string | Date;
    endDate: string | Date;
    usageLimit: number;
    usagePerUser?: number;
    isActive?: boolean;
}

import { couponApi } from '@/common/api/coupon.api';
import {
    createCouponClientSchema,
    updateCouponClientSchema,
    validateCouponClientSchema,
} from '@/common/validation/schemas';

// ─── API Calls ────────────────────────────────────────────────────────────────

export const fetchCoupons = async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: CouponStatus | 'ALL';
    sort?: CouponSortValue;
    isActive?: boolean;
    includeHidden?: boolean;
}): Promise<CouponListResponse> => {
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.pageSize) query.pageSize = String(params.pageSize);
    if (params?.search) query.search = params.search;
    if (params?.status && params.status !== 'ALL') query.status = params.status;
    if (params?.sort) query.sort = params.sort;
    if (params?.isActive !== undefined) query.isActive = String(params.isActive);
    if (params?.includeHidden !== undefined) query.includeHidden = String(params.includeHidden);
    return couponApi.fetch(query);
};

export const createCoupon = async (payload: CreateCouponPayload): Promise<Coupon> => {
    return couponApi.create(createCouponClientSchema.parse(payload));
};

export const updateCoupon = async (couponId: number, payload: Partial<CreateCouponPayload>): Promise<Coupon> => {
    return couponApi.update(couponId, updateCouponClientSchema.parse(payload));
};

export const deleteCoupon = async (couponId: number): Promise<{ success: boolean; message: string }> => {
    return couponApi.remove(couponId);
};

export const validateCoupon = async (code: string, cartSubtotal: number): Promise<ValidateCouponResult> => {
    const payload = validateCouponClientSchema.parse({ code, cartSubtotal });
    return couponApi.validate(payload);
};
