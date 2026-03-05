/**
 * coupon.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The Coupon Validation Engine for AISTHEA.
 *
 * validateCoupon()  — runs all business-rule checks and returns the exact
 *                     calculated discountAmount. Never trusts client values.
 *
 * calculateDiscount() — pure helper, exposed for testing.
 *
 * CouponType values: "FIXED_AMOUNT" | "PERCENTAGE" (enforced here as strings
 * because SQL Server Prisma connector doesn't support native enums).
 */

import { Prisma } from '../generated/client';
import { prisma } from '../utils/prisma';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CouponType = 'FIXED_AMOUNT' | 'PERCENTAGE';

export interface ValidateCouponResult {
    coupon: {
        couponId: number;
        code: string;
        type: string;
        value: number;
        maxDiscountAmount: number | null;
        minOrderValue: number;
    };
    discountAmount: number;
}

// ─── Error class ───────────────────────────────────────────────────────────────

export class CouponError extends Error {
    public readonly code: string;
    public readonly status: number;

    constructor(code: string, message: string, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

// ─── Pure discount calculator ──────────────────────────────────────────────────

export function calculateDiscount(
    type: string,
    value: number,
    maxDiscountAmount: number | null,
    cartSubtotal: number,
): number {
    if (type === 'FIXED_AMOUNT') {
        // Never exceed the cart subtotal
        return Math.min(value, cartSubtotal);
    }

    // PERCENTAGE
    let discount = (cartSubtotal * value) / 100;
    if (maxDiscountAmount !== null && maxDiscountAmount > 0) {
        discount = Math.min(discount, maxDiscountAmount);
    }
    return Math.floor(discount); // Floor to whole VND
}

// ─── validateCoupon ───────────────────────────────────────────────────────────
/**
 * Validates a coupon code against all business rules.
 *
 * Checks (in order):
 *  1. Coupon exists and isActive === true
 *  2. Current date is within [startDate, endDate]
 *  3. usedCount < usageLimit
 *  4. cartSubtotal >= minOrderValue
 *  5. User hasn't exceeded usagePerUser (counted via Orders with this couponId)
 *
 * Returns the exact calculated discountAmount to use in the order.
 * Throws CouponError with Vietnamese messages on any rule violation.
 *
 * @param code         — coupon code (case-insensitive)
 * @param userId       — the authenticated user's ID
 * @param cartSubtotal — sum of all items before discount (in VND)
 * @param tx           — optional Prisma transaction client for atomic validation
 */
export async function validateCoupon(
    code: string,
    userId: number,
    cartSubtotal: number,
    tx?: Prisma.TransactionClient,
): Promise<ValidateCouponResult> {
    const db = (tx ?? prisma) as any;

    // ── 1. Coupon exists and is active ─────────────────────────────────────────
    const coupon = await db.coupon.findFirst({
        where: { code: code.toUpperCase().trim() },
        select: {
            couponId: true,
            code: true,
            type: true,
            value: true,
            maxDiscountAmount: true,
            minOrderValue: true,
            startDate: true,
            endDate: true,
            usageLimit: true,
            usedCount: true,
            usagePerUser: true,
            isActive: true,
        },
    });

    if (!coupon || !coupon.isActive) {
        throw new CouponError('COUPON_NOT_FOUND', 'Coupon is invalid or disabled.', 404);
    }

    const now = new Date();

    // ── 2. Date validity ───────────────────────────────────────────────────────
    if (now < new Date(coupon.startDate)) {
        throw new CouponError(
            'COUPON_NOT_STARTED',
            `Coupon not yet active. Valid from ${new Date(coupon.startDate).toISOString().split('T')[0]}.`,
            400,
        );
    }

    if (now > new Date(coupon.endDate)) {
        throw new CouponError('COUPON_EXPIRED', 'Coupon has expired.', 400);
    }

    // ── 3. Global usage limit ──────────────────────────────────────────────────
    if (coupon.usedCount >= coupon.usageLimit) {
        throw new CouponError('COUPON_DEPLETED', 'Coupon usage usage limit reached.', 400);
    }

    // ── 4. Minimum order value ─────────────────────────────────────────────────
    const minOrderValue = Number(coupon.minOrderValue);
    if (cartSubtotal < minOrderValue) {
        const formatted = minOrderValue.toLocaleString('vi-VN');
        throw new CouponError(
            'ORDER_TOO_SMALL',
            `Minimum order value of ${minOrderValue} is required to apply this coupon.`,
            400,
        );
    }

    // ── 5. Per-user usage limit ────────────────────────────────────────────────
    const userUsageCount = await db.order.count({
        where: {
            userId,
            couponId: coupon.couponId,
            // Only count non-cancelled orders (cancelled orders are forgiven)
            status: { notIn: ['Cancelled', 'Returned'] },
        },
    });

    if (userUsageCount >= coupon.usagePerUser) {
        throw new CouponError(
            'COUPON_ALREADY_USED',
            `Coupon already used by you (max ${coupon.usagePerUser} times).`,
            400,
        );
    }

    // ── Calculate discount ─────────────────────────────────────────────────────
    const value = Number(coupon.value);
    const maxDiscount = coupon.maxDiscountAmount !== null ? Number(coupon.maxDiscountAmount) : null;
    const discountAmount = calculateDiscount(coupon.type, value, maxDiscount, cartSubtotal);

    return {
        coupon: {
            couponId: coupon.couponId,
            code: coupon.code,
            type: coupon.type,
            value,
            maxDiscountAmount: maxDiscount,
            minOrderValue,
        },
        discountAmount,
    };
}
