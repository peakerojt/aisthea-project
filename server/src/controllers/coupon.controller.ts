import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { validateCoupon, CouponError } from '../services/coupon.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logger } from '../lib/logger';
import { DEFAULT_ADMIN_COUPON_MIN_ORDER_VALUE } from '../shared/validation';
import type {
    CouponIdParams,
    CouponListQueryInput,
    CreateCouponInput,
    UpdateCouponInput,
    ValidateCouponRequestInput,
} from '../shared/validation/schemas/coupon';

// ─── Helper ────────────────────────────────────────────────────────────────────

function handleError(res: Response, err: unknown) {
    if (err instanceof CouponError) {
        return res.status(err.status).json({ error: err.message, code: err.code });
    }
    logger.error('[couponController]', { err });
    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
}

// Shape raw Prisma Coupon row for API response
function shapeCoupon(c: any) {
    const now = new Date();
    const start = new Date(c.startDate);
    const end = new Date(c.endDate);

    let status: string;
    if (!c.isActive) {
        status = 'INACTIVE';
    } else if (now < start) {
        status = 'UPCOMING';
    } else if (now > end) {
        status = 'EXPIRED';
    } else if (c.usedCount >= c.usageLimit) {
        status = 'DEPLETED';
    } else {
        status = 'ACTIVE';
    }

    return {
        couponId: c.couponId,
        code: c.code,
        type: c.type,
        value: Number(c.value),
        maxDiscountAmount: c.maxDiscountAmount !== null ? Number(c.maxDiscountAmount) : null,
        minOrderValue: Number(c.minOrderValue),
        startDate: c.startDate,
        endDate: c.endDate,
        usageLimit: c.usageLimit,
        usedCount: c.usedCount,
        usagePerUser: c.usagePerUser,
        isActive: c.isActive,
        isHidden: Boolean(c.isHidden),
        source: c.source ?? null,
        visibleInPublicList: c.visibleInPublicList !== false,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        status,
    };
}

function resolveCouponPayloadError(payload: {
    type: string;
    value: number;
    startDate: Date;
    endDate: Date;
}) {
    if (payload.type === 'PERCENTAGE' && (payload.value < 1 || payload.value > 100)) {
        return 'Giá trị phần trăm phải từ 1 đến 100.';
    }

    if (payload.endDate <= payload.startDate) {
        return 'Ngày kết thúc phải sau ngày bắt đầu.';
    }

    return null;
}

function resolveCouponStatus(coupon: {
    isActive: boolean;
    startDate: Date | string;
    endDate: Date | string;
    usedCount: number;
    usageLimit: number;
}) {
    const now = new Date();
    const start = new Date(coupon.startDate);
    const end = new Date(coupon.endDate);

    if (!coupon.isActive) return 'INACTIVE' as const;
    if (now < start) return 'UPCOMING' as const;
    if (now > end) return 'EXPIRED' as const;
    if (coupon.usedCount >= coupon.usageLimit) return 'DEPLETED' as const;
    return 'ACTIVE' as const;
}

type CouponStatusFilter = NonNullable<CouponListQueryInput['status']>;
type CouponSortValue = NonNullable<CouponListQueryInput['sort']>;

function buildCouponStatusWhere(status: CouponStatusFilter, now: Date) {
    switch (status) {
        case 'ACTIVE':
            return {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
                usedCount: { lt: prisma.coupon.fields.usageLimit },
            };
        case 'EXPIRED':
            return {
                isActive: true,
                endDate: { lt: now },
            };
        case 'DEPLETED':
            return {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
                usedCount: { gte: prisma.coupon.fields.usageLimit },
            };
        case 'UPCOMING':
            return {
                isActive: true,
                startDate: { gt: now },
            };
        case 'INACTIVE':
            return {
                isActive: false,
            };
        case 'ALL':
        default:
            return {};
    }
}

function buildCouponOrderBy(sort: CouponSortValue) {
    switch (sort) {
        case 'createdAt_asc':
            return { createdAt: 'asc' } as const;
        case 'endDate_asc':
            return [{ endDate: 'asc' }, { createdAt: 'desc' }] as const;
        case 'endDate_desc':
            return [{ endDate: 'desc' }, { createdAt: 'desc' }] as const;
        case 'usedCount_desc':
            return [{ usedCount: 'desc' }, { createdAt: 'desc' }] as const;
        case 'usedCount_asc':
            return [{ usedCount: 'asc' }, { createdAt: 'desc' }] as const;
        case 'createdAt_desc':
        default:
            return { createdAt: 'desc' } as const;
    }
}

// ─── POST /api/coupons/validate ───────────────────────────────────────────────
// Body: { code: string, cartSubtotal: number }
// Returns discountAmount on success, CouponError on failure.

export const validateCouponHandler = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Yêu cầu đăng nhập.' });
        }

        const { code, cartSubtotal } = req.body as ValidateCouponRequestInput;

        const result = await validateCoupon(code, userId, cartSubtotal);
        return res.json({
            ...result,
            message: `Áp dụng thành công! Bạn được giảm ${result.discountAmount.toLocaleString('vi-VN')}₫`,
        });
    } catch (err) {
        return handleError(res, err);
    }
};

// ─── GET /api/coupons ─────────────────────────────────────────────────────────
// Admin only. Returns paginated coupon list.
// Query: ?page=1&pageSize=20&search=&status=&isActive=

export const listCoupons = async (req: Request, res: Response) => {
    try {
        const {
            page,
            pageSize,
            search,
            sort,
            status,
            includeHidden,
            isActive,
        } = req.query as unknown as CouponListQueryInput;
        const skip = (page - 1) * pageSize;
        const now = new Date();
        const normalizedStatus: CouponStatusFilter = status ?? 'ALL';

        const baseWhere: any = {
            ...(includeHidden ? {} : { isHidden: false }),
        };

        if (search) {
            baseWhere.code = { contains: search };
        }

        const where: any = {
            ...baseWhere,
        };

        if (normalizedStatus !== 'ALL') {
            Object.assign(where, buildCouponStatusWhere(normalizedStatus, now));
        } else if (typeof isActive === 'boolean') {
            where.isActive = isActive;
        }

        const [total, coupons, summaryTotal, summaryActive, summaryExpired, summaryDepleted, summaryUpcoming, summaryInactive] = await Promise.all([
            (prisma.coupon as any).count({ where }),
            (prisma.coupon as any).findMany({
                where,
                orderBy: buildCouponOrderBy(sort ?? 'createdAt_desc'),
                skip,
                take: pageSize,
            }),
            (prisma.coupon as any).count({ where: baseWhere }),
            (prisma.coupon as any).count({
                where: {
                    ...baseWhere,
                    ...buildCouponStatusWhere('ACTIVE', now),
                },
            }),
            (prisma.coupon as any).count({
                where: {
                    ...baseWhere,
                    ...buildCouponStatusWhere('EXPIRED', now),
                },
            }),
            (prisma.coupon as any).count({
                where: {
                    ...baseWhere,
                    ...buildCouponStatusWhere('DEPLETED', now),
                },
            }),
            (prisma.coupon as any).count({
                where: {
                    ...baseWhere,
                    ...buildCouponStatusWhere('UPCOMING', now),
                },
            }),
            (prisma.coupon as any).count({
                where: {
                    ...baseWhere,
                    ...buildCouponStatusWhere('INACTIVE', now),
                },
            }),
        ]);

        return res.json({
            coupons: coupons.map(shapeCoupon),
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
            summary: {
                total: summaryTotal,
                active: summaryActive,
                expired: summaryExpired,
                depleted: summaryDepleted,
                upcoming: summaryUpcoming,
                inactive: summaryInactive,
            },
        });
    } catch (err) {
        return handleError(res, err);
    }
};

// ─── GET /api/coupons/available ───────────────────────────────────────────────
// Get available coupons for checkout (User only)
// Active, within date range, usage limit not exceeded. Ordered by highest value, then soonest expiry.

export const getAvailableCoupons = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Yêu cầu đăng nhập.' });
        }

        const now = new Date();

        const coupons = await (prisma.coupon as any).findMany({
            where: {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now },
                OR: [
                    {
                        isHidden: false,
                        visibleInPublicList: true,
                    },
                    {
                        source: 'REFUND_BENEFIT',
                        refundBenefits: {
                            some: {
                                userId,
                                status: 'ACTIVE',
                                validFrom: { lte: now },
                                validUntil: { gte: now },
                            },
                        },
                    },
                ],
            },
            // Hard cap: coupon lists are small by design; 100 is a safe upper bound.
            // In-memory filter below further narrows this to only usable coupons.
            take: 100,
            orderBy: { endDate: 'asc' },
        });

        // Filter out coupons where usedCount >= usageLimit
        let availableCoupons = coupons.filter((c: any) => c.usedCount < c.usageLimit);

        // Sort: highest value first, then earliest expiry
        availableCoupons.sort((a: any, b: any) => {
            // Priority 1: Value (Descending)
            // Even if percentage vs fixed, roughly sorting by value number helps.
            // Ideally, you'd calculate actual discount based on cart, but we don't have cartSubtotal here.
            if (b.value !== a.value) {
                return Number(b.value) - Number(a.value);
            }
            // Priority 2: Expiration Date (Ascending - earliest expiry first)
            return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        });

        return res.json({
            coupons: availableCoupons.map(shapeCoupon)
        });
    } catch (err) {
        return handleError(res, err);
    }
}

// ─── POST /api/coupons ────────────────────────────────────────────────────────
// Admin only. Create a new coupon.

export const createCoupon = async (req: Request, res: Response) => {
    try {
        const payload = req.body as CreateCouponInput;
        const payloadError = resolveCouponPayloadError(payload);
        if (payloadError) {
            return res.status(400).json({ error: payloadError, code: 'VALIDATION_ERROR' });
        }

        const coupon = await (prisma.coupon as any).create({
            data: {
                code: payload.code,
                type: payload.type,
                value: payload.value,
                maxDiscountAmount: payload.maxDiscountAmount ?? null,
                minOrderValue: payload.minOrderValue ?? DEFAULT_ADMIN_COUPON_MIN_ORDER_VALUE,
                startDate: payload.startDate,
                endDate: payload.endDate,
                usageLimit: payload.usageLimit,
                usagePerUser: payload.usagePerUser ?? 1,
                isActive: payload.isActive ?? true,
            },
        });

        return res.status(201).json(shapeCoupon(coupon));
    } catch (err: any) {
        if (err?.code === 'P2002') {
            return res.status(409).json({
                error: 'Mã giảm giá này đã tồn tại. Vui lòng chọn mã khác.',
                code: 'COUPON_CODE_EXISTS',
            });
        }
        return handleError(res, err);
    }
};

// ─── PUT /api/coupons/:id ─────────────────────────────────────────────────────
// Admin only. Update an existing coupon.

export const updateCoupon = async (req: Request, res: Response) => {
    try {
        const { id: couponId } = req.params as unknown as CouponIdParams;
        const payload = req.body as UpdateCouponInput;

        const existing = await (prisma.coupon as any).findUnique({ where: { couponId } });
        if (!existing) {
            return res.status(404).json({ error: 'Không tìm thấy mã giảm giá.', code: 'NOT_FOUND' });
        }

        const existingStatus = resolveCouponStatus(existing);
        if (existingStatus === 'INACTIVE' || existingStatus === 'EXPIRED') {
            return res.status(409).json({
                error: existingStatus === 'INACTIVE'
                    ? 'Mã giảm giá vô hiệu không thể chỉnh sửa.'
                    : 'Mã giảm giá đã hết hạn không thể chỉnh sửa.',
                code: 'COUPON_EDIT_LOCKED',
            });
        }

        const payloadError = resolveCouponPayloadError({
            type: payload.type ?? existing.type,
            value: payload.value ?? Number(existing.value),
            startDate: payload.startDate ?? new Date(existing.startDate),
            endDate: payload.endDate ?? new Date(existing.endDate),
        });
        if (payloadError) {
            return res.status(400).json({ error: payloadError, code: 'VALIDATION_ERROR' });
        }

        const updated = await (prisma.coupon as any).update({
            where: { couponId },
            data: {
                ...(payload.code !== undefined && { code: payload.code }),
                ...(payload.type !== undefined && { type: payload.type }),
                ...(payload.value !== undefined && { value: payload.value }),
                ...(payload.maxDiscountAmount !== undefined && {
                    maxDiscountAmount: payload.maxDiscountAmount ?? null,
                }),
                ...(payload.minOrderValue !== undefined && { minOrderValue: payload.minOrderValue }),
                ...(payload.startDate !== undefined && { startDate: payload.startDate }),
                ...(payload.endDate !== undefined && { endDate: payload.endDate }),
                ...(payload.usageLimit !== undefined && { usageLimit: payload.usageLimit }),
                ...(payload.usagePerUser !== undefined && { usagePerUser: payload.usagePerUser }),
                ...(payload.isActive !== undefined && { isActive: payload.isActive }),
            },
        });

        return res.json(shapeCoupon(updated));
    } catch (err: any) {
        if (err?.code === 'P2002') {
            return res.status(409).json({ error: 'Mã giảm giá này đã tồn tại.', code: 'COUPON_CODE_EXISTS' });
        }
        return handleError(res, err);
    }
};

// ─── DELETE /api/coupons/:id ──────────────────────────────────────────────────
// Admin only. Deactivate (soft-delete) a coupon.

export const deleteCoupon = async (req: Request, res: Response) => {
    try {
        const { id: couponId } = req.params as unknown as CouponIdParams;

        const existing = await (prisma.coupon as any).findUnique({ where: { couponId } });
        if (!existing) {
            return res.status(404).json({ error: 'Không tìm thấy mã giảm giá.', code: 'NOT_FOUND' });
        }

        // Soft-delete: just deactivate the coupon (preserve order history)
        const updated = await (prisma.coupon as any).update({
            where: { couponId },
            data: { isActive: false },
        });

        return res.json({ success: true, message: 'Đã vô hiệu hóa mã giảm giá.', coupon: shapeCoupon(updated) });
    } catch (err) {
        return handleError(res, err);
    }
};
