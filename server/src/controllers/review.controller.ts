import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ERROR_CODES, SUCCESS_MESSAGES } from '../utils/constants/responseKeys';
import { ORDER_STATUS } from '../config/orderStatus.config';
import { logger } from '../lib/logger';

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ errorCode: ERROR_CODES.UNAUTHORIZED });
    }

    const { orderItemId, productId, rating, comment, images } = req.body;

    if (!orderItemId || typeof orderItemId !== 'number') {
      return res.status(400).json({ errorCode: ERROR_CODES.INVALID_BODY, messageKey: 'reviews:errors.invalidOrderItemId' });
    }
    if (!productId || typeof productId !== 'number') {
      return res.status(400).json({ errorCode: ERROR_CODES.INVALID_BODY, messageKey: 'reviews:errors.invalidProductId' });
    }
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ errorCode: ERROR_CODES.RATING_REQUIRED });
    }

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

    if (orderItem.order.userId !== userId) {
      return res.status(403).json({ errorCode: ERROR_CODES.NOT_ORDER_OWNER });
    }

    if (orderItem.order.status !== ORDER_STATUS.DELIVERED) {
      return res.status(400).json({
        errorCode: ERROR_CODES.ITEM_NOT_FROM_DELIVERED_ORDER,
        currentStatus: orderItem.order.status,
      });
    }

    if (orderItem.variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { variantId: orderItem.variantId },
        select: { productId: true },
      });
      if (variant && variant.productId !== productId) {
        return res.status(400).json({ errorCode: ERROR_CODES.INVALID_BODY, messageKey: 'reviews:errors.productMismatch' });
      }
    }

    const existing = await prisma.review.findUnique({
      where: { orderItemId },
    });
    if (existing) {
      return res.status(409).json({ errorCode: ERROR_CODES.REVIEW_ALREADY_EXISTS });
    }

    const imagesJson = Array.isArray(images) && images.length > 0 ? JSON.stringify(images) : '[]';

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
      code: 'REVIEW_CREATED',
      review: {
        ...review,
        images: JSON.parse(review.images ?? '[]'),
      },
    });
  } catch (error: unknown) {
    logger.error('[reviewController] createReview failed', { error });
    return res.status(500).json({ errorCode: 'CREATE_REVIEW_FAILED' });
  }
};

export const getReviewsByProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId: Number(productId) },
        include: {
          user: {
            select: { userId: true, fullName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.review.count({ where: { productId: Number(productId) } }),
    ]);

    const formatted = reviews.map((review) => ({
      reviewId: review.reviewId,
      rating: review.rating,
      comment: review.comment,
      images: JSON.parse(review.images ?? '[]'),
      createdAt: review.createdAt?.toISOString(),
      user: review.user,
    }));

    return res.json({
      reviews: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[reviewController] getReviewsByProduct failed', { error });
    return res.status(500).json({ errorCode: 'FETCH_REVIEWS_FAILED' });
  }
};
