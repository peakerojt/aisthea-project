import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { validateCoupon, CouponError } from '../services/coupon.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logger } from '../lib/logger';

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
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        status,
    };
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

        const { code, cartSubtotal } = req.body as { code: string; cartSubtotal: number };

        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'Mã giảm giá không được để trống.' });
        }
        if (typeof cartSubtotal !== 'number' || cartSubtotal <= 0) {
            return res.status(400).json({ error: 'Giá trị giỏ hàng không hợp lệ.' });
        }

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
// Query: ?page=1&pageSize=20&search=&isActive=

export const listCoupons = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '20'), 10) || 20));
        const skip = (page - 1) * pageSize;
        const search = String(req.query.search ?? '').trim();
        const isActiveParam = req.query.isActive;

        const where: any = {};

        if (search) {
            where.code = { contains: search };
        }

        if (isActiveParam === 'true') where.isActive = true;
        else if (isActiveParam === 'false') where.isActive = false;

        const [total, coupons] = await Promise.all([
            (prisma.coupon as any).count({ where }),
            (prisma.coupon as any).findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
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
        const {
            code,
            type,
            value,
            maxDiscountAmount,
            minOrderValue,
            startDate,
            endDate,
            usageLimit,
            usagePerUser,
            isActive,
        } = req.body;

        // Basic validation
        if (!code || !type || value === undefined || !startDate || !endDate || !usageLimit) {
            return res.status(400).json({ error: 'Thiếu thông tin bắt buộc.' });
        }
        if (!['FIXED_AMOUNT', 'PERCENTAGE'].includes(type)) {
            return res.status(400).json({ error: 'Loại mã giảm giá không hợp lệ.' });
        }
        if (type === 'PERCENTAGE' && (Number(value) < 1 || Number(value) > 100)) {
            return res.status(400).json({ error: 'Giá trị phần trăm phải từ 1 đến 100.' });
        }
        if (new Date(endDate) <= new Date(startDate)) {
            return res.status(400).json({ error: 'Ngày kết thúc phải sau ngày bắt đầu.' });
        }

        const coupon = await (prisma.coupon as any).create({
            data: {
                code: String(code).toUpperCase().trim(),
                type,
                value: Number(value),
                maxDiscountAmount: maxDiscountAmount != null ? Number(maxDiscountAmount) : null,
                minOrderValue: Number(minOrderValue ?? 0),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                usageLimit: Number(usageLimit),
                usagePerUser: Number(usagePerUser ?? 1),
                isActive: isActive !== false,
            },
        });

        return res.status(201).json(shapeCoupon(coupon));
    } catch (err: any) {
        if (err?.code === 'P2002') {
            return res.status(409).json({ error: 'Mã giảm giá này đã tồn tại. Vui lòng chọn mã khác.' });
        }
        return handleError(res, err);
    }
};

// ─── PUT /api/coupons/:id ─────────────────────────────────────────────────────
// Admin only. Update an existing coupon.

export const updateCoupon = async (req: Request, res: Response) => {
    try {
        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const couponId = parseInt(idParam ?? '', 10);
        if (isNaN(couponId)) {
            return res.status(400).json({ error: 'couponId không hợp lệ.' });
        }

        const existing = await (prisma.coupon as any).findUnique({ where: { couponId } });
        if (!existing) {
            return res.status(404).json({ error: 'Không tìm thấy mã giảm giá.' });
        }

        const {
            code,
            type,
            value,
            maxDiscountAmount,
            minOrderValue,
            startDate,
            endDate,
            usageLimit,
            usagePerUser,
            isActive,
        } = req.body;

        // Validate type if provided
        if (type && !['FIXED_AMOUNT', 'PERCENTAGE'].includes(type)) {
            return res.status(400).json({ error: 'Loại mã giảm giá không hợp lệ.' });
        }

        const updated = await (prisma.coupon as any).update({
            where: { couponId },
            data: {
                ...(code !== undefined && { code: String(code).toUpperCase().trim() }),
                ...(type !== undefined && { type }),
                ...(value !== undefined && { value: Number(value) }),
                ...(maxDiscountAmount !== undefined && {
                    maxDiscountAmount: maxDiscountAmount != null ? Number(maxDiscountAmount) : null,
                }),
                ...(minOrderValue !== undefined && { minOrderValue: Number(minOrderValue) }),
                ...(startDate !== undefined && { startDate: new Date(startDate) }),
                ...(endDate !== undefined && { endDate: new Date(endDate) }),
                ...(usageLimit !== undefined && { usageLimit: Number(usageLimit) }),
                ...(usagePerUser !== undefined && { usagePerUser: Number(usagePerUser) }),
                ...(isActive !== undefined && { isActive: Boolean(isActive) }),
            },
        });

        return res.json(shapeCoupon(updated));
    } catch (err: any) {
        if (err?.code === 'P2002') {
            return res.status(409).json({ error: 'Mã giảm giá này đã tồn tại.' });
        }
        return handleError(res, err);
    }
};

// ─── DELETE /api/coupons/:id ──────────────────────────────────────────────────
// Admin only. Deactivate (soft-delete) a coupon.

export const deleteCoupon = async (req: Request, res: Response) => {
    try {
        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const couponId = parseInt(idParam ?? '', 10);
        if (isNaN(couponId)) {
            return res.status(400).json({ error: 'couponId không hợp lệ.' });
        }

        const existing = await (prisma.coupon as any).findUnique({ where: { couponId } });
        if (!existing) {
            return res.status(404).json({ error: 'Không tìm thấy mã giảm giá.' });
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
