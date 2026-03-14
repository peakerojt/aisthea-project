import { api } from '@/common/utils/api';
import { CouponListResponse, Coupon, CreateCouponPayload, ValidateCouponResult } from '@/common/services/coupon.service';

export const couponApi = {
    fetch: (params?: Record<string, string>) => api.get<CouponListResponse>('/api/coupons', { params }),
    create: (payload: CreateCouponPayload) => api.post<Coupon>('/api/coupons', payload),
    update: (id: number, payload: Partial<CreateCouponPayload>) => api.put<Coupon>(`/api/coupons/${id}`, payload),
    remove: (id: number) => api.delete<{ success: boolean; message: string }>(`/api/coupons/${id}`),
    validate: (data: { code: string; cartSubtotal: number }) => api.post<ValidateCouponResult>('/api/coupons/validate', data)
};
