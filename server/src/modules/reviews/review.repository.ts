import { prisma } from '../../lib/prisma';

export const reviewRepository = {
    async findOrderItem(orderItemId: number) {
        return prisma.orderItem.findUnique({
            where: { orderItemId },
            include: { order: { select: { userId: true, status: true } } },
        });
    },

    async findProductVariant(variantId: number) {
        return prisma.productVariant.findUnique({
            where: { variantId },
            select: { productId: true },
        });
    },

    async findByOrderItemId(orderItemId: number) {
        return prisma.review.findUnique({ where: { orderItemId } });
    },

    async create(data: {
        productId: number;
        userId: number;
        orderItemId: number;
        rating: number;
        comment?: string | null;
        images: string;
    }) {
        return prisma.review.create({
            data,
            select: { reviewId: true, productId: true, orderItemId: true, rating: true, comment: true, images: true, createdAt: true },
        });
    },

    async findByProduct(productId: number, opts: { take?: number; skip?: number } = {}) {
        const take = Math.min(opts.take ?? 50, 200);
        const skip = opts.skip ?? 0;
        return prisma.review.findMany({
            where: { productId },
            include: { user: { select: { userId: true, fullName: true, avatarUrl: true } } },
            orderBy: { createdAt: 'desc' },
            take,
            skip,
        });
    },
};
