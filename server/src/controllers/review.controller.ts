import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ERROR_CODES, SUCCESS_MESSAGES } from '../utils/constants/responseKeys';
import { ORDER_STATUS } from '../config/orderStatus.config';

// ─────────────────────────────────────────────────────────────────────────────
// CREATE REVIEW (Secure)
// POST /api/reviews
// Validates:
//   1. User is authenticated
//   2. orderItemId belongs to a DELIVERED order owned by req.user
//   3. No duplicate review already exists for this orderItemId
// ─────────────────────────────────────────────────────────────────────────────
export const createReview = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ errorCode: ERROR_CODES.UNAUTHORIZED });
        }

        const { orderItemId, productId, rating, comment, images } = req.body;

        // ── Validate required fields ──
        if (!orderItemId || typeof orderItemId !== 'number') {
            return res.status(400).json({ errorCode: ERROR_CODES.INVALID_BODY, message: 'orderItemId is required and must be a number.' });
        }
        if (!productId || typeof productId !== 'number') {
            return res.status(400).json({ errorCode: ERROR_CODES.INVALID_BODY, message: 'productId is required and must be a number.' });
        }
        if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
            return res.status(400).json({ errorCode: ERROR_CODES.RATING_REQUIRED, message: 'Rating must be an integer between 1 and 5.' });
        }

        // ── Validation 1: orderItemId must belong to a DELIVERED order owned by this user ──
        const orderItem = await prisma.orderItem.findUnique({
            where: { orderItemId },
            include: {
                order: {
                    select: { userId: true, status: true },
                },
            },
        });

        if (!orderItem || !orderItem.order) {
            return res.status(404).json({ errorCode: ERROR_CODES.ORDER_ITEM_NOT_FOUND });
        }

        // Ownership check
        if (orderItem.order.userId !== userId) {
            return res.status(403).json({ errorCode: ERROR_CODES.NOT_ORDER_OWNER });
        }

        // Delivered check
        if (orderItem.order.status !== ORDER_STATUS.DELIVERED) {
            return res.status(400).json({
                errorCode: ERROR_CODES.ITEM_NOT_FROM_DELIVERED_ORDER,
                currentStatus: orderItem.order.status,
            });
        }

        // Validate productId matches the item (extra safety)
        if (orderItem.variantId) {
            const variant = await prisma.productVariant.findUnique({
                where: { variantId: orderItem.variantId },
                select: { productId: true },
            });
            if (variant && variant.productId !== productId) {
                return res.status(400).json({ errorCode: ERROR_CODES.INVALID_BODY, message: 'productId does not match the purchased item.' });
            }
        }

        // ── Validation 2: Duplicate review check ──
        const existing = await prisma.review.findUnique({
            where: { orderItemId },
        });
        if (existing) {
            return res.status(409).json({ errorCode: ERROR_CODES.REVIEW_ALREADY_EXISTS });
        }

        // ── Create the review ──
        const imagesJson = Array.isArray(images) && images.length > 0
            ? JSON.stringify(images)
            : '[]';

        const review = await prisma.review.create({
            data: {
                productId,
                userId,
                orderItemId,
                rating,
                comment: comment ?? null,
                images: imagesJson,
            },
            select: {
                reviewId: true,
                productId: true,
                orderItemId: true,
                rating: true,
                comment: true,
                images: true,
                createdAt: true,
            },
        });

        return res.status(201).json({
            success: true,
            messageKey: SUCCESS_MESSAGES.REVIEW_CREATED,
            review: {
                ...review,
                images: JSON.parse(review.images ?? '[]'),
            },
        });
    } catch (error: any) {
        console.error('[createReview] Error:', error);
        return res.status(500).json({ error: 'Failed to create review', details: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET REVIEWS BY PRODUCT
// GET /api/reviews/product/:productId
// ─────────────────────────────────────────────────────────────────────────────
export const getReviewsByProduct = async (req: AuthRequest, res: Response) => {
    try {
        const { productId } = req.params;

        const reviews = await prisma.review.findMany({
            where: {
                productId: Number(productId),
            },
            include: {
                user: {
                    select: { userId: true, fullName: true, avatarUrl: true },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const formatted = reviews.map((r) => ({
            reviewId: r.reviewId,
            rating: r.rating,
            comment: r.comment,
            images: JSON.parse(r.images ?? '[]'),
            createdAt: r.createdAt?.toISOString(),
            user: r.user,
        }));

        return res.json({ reviews: formatted, total: formatted.length });
    } catch (error: any) {
        console.error('[getReviewsByProduct] Error:', error);
        return res.status(500).json({ error: 'Failed to fetch reviews' });
    }
};