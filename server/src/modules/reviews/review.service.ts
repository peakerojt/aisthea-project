import { reviewRepository } from './review.repository';
import { AppError } from '../../middlewares/error.middleware';
import { ORDER_STATUS } from '../../config/orderStatus.config';
import { ERROR_CODES, SUCCESS_MESSAGES } from '../../utils/constants/responseKeys';

export const reviewService = {
    async createReview(userId: number, data: {
        orderItemId: number;
        productId: number;
        rating: number;
        comment?: string;
        images?: string[];
    }) {
        // Ownership + delivered status check
        const orderItem = await reviewRepository.findOrderItem(data.orderItemId);
        if (!orderItem?.order) throw new AppError(404, ERROR_CODES.ORDER_ITEM_NOT_FOUND, 'reviews:errors.orderItemNotFound');
        if (orderItem.order.userId !== userId) throw new AppError(403, ERROR_CODES.NOT_ORDER_OWNER, 'reviews:errors.notOrderOwner');
        if (orderItem.order.status !== ORDER_STATUS.DELIVERED) {
            throw new AppError(400, ERROR_CODES.ITEM_NOT_FROM_DELIVERED_ORDER, 'reviews:errors.itemNotDelivered');
        }

        // Verify productId matches variant
        if (orderItem.variantId) {
            const variant = await reviewRepository.findProductVariant(orderItem.variantId);
            if (variant && variant.productId !== data.productId) {
                throw new AppError(400, ERROR_CODES.INVALID_BODY, 'reviews:errors.productMismatch');
            }
        }

        // Duplicate check
        const existing = await reviewRepository.findByOrderItemId(data.orderItemId);
        if (existing) throw new AppError(409, ERROR_CODES.REVIEW_ALREADY_EXISTS, 'reviews:errors.alreadyExists');

        const imagesJson = Array.isArray(data.images) && data.images.length > 0
            ? JSON.stringify(data.images) : '[]';

        const review = await reviewRepository.create({
            productId: data.productId,
            userId,
            orderItemId: data.orderItemId,
            rating: data.rating,
            comment: data.comment ?? null,
            images: imagesJson,
        });

        return { ...review, images: JSON.parse(review.images ?? '[]') };
    },

    async getByProduct(productId: number) {
        const reviews = await reviewRepository.findByProduct(productId);
        return reviews.map((r) => ({
            reviewId: r.reviewId,
            rating: r.rating,
            comment: r.comment,
            images: JSON.parse(r.images ?? '[]'),
            createdAt: r.createdAt?.toISOString(),
            user: r.user,
        }));
    },
};
