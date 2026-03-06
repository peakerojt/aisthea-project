import { prisma } from '../../lib/prisma';
import type { Prisma } from '../../generated/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProductFilter {
    categorySlug?: string;
    brandId?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    status?: string;
    page?: number;
    limit?: number;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const productRepository = {
    // ── List / Search ──────────────────────────────────────────────────────────
    async findMany(filters: ProductFilter = {}) {
        const { categorySlug, brandId, search, minPrice, maxPrice, status = 'Active', page = 1, limit = 20 } = filters;
        const skip = (page - 1) * limit;

        const where: Prisma.ProductWhereInput = {
            isDeleted: false,
            status,
            ...(categorySlug && { category: { slug: categorySlug } }),
            ...(brandId && { brandId }),
            ...(search && {
                OR: [
                    { name: { contains: search } },
                    { description: { contains: search } },
                ],
            }),
            ...(minPrice !== undefined || maxPrice !== undefined
                ? {
                    variants: {
                        some: {
                            isDeleted: false,
                            ...(minPrice !== undefined && { price: { gte: minPrice as any } }),
                            ...(maxPrice !== undefined && { price: { lte: maxPrice as any } }),
                        },
                    },
                }
                : {}),
        };

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    category: { select: { categoryId: true, name: true, slug: true } },
                    brand: { select: { brandId: true, name: true } },
                    images: {
                        where: { isPrimary: true },
                        take: 1,
                    },
                    variants: {
                        where: { isDeleted: false },
                        select: { price: true, stockQuantity: true },
                    },
                },
            }),
            prisma.product.count({ where }),
        ]);

        return { products, total, page, limit };
    },

    // ── Single product (public detail view) ────────────────────────────────────
    async findById(id: number) {
        return prisma.product.findFirst({
            where: { productId: id, isDeleted: false },
            include: {
                category: { select: { categoryId: true, name: true, slug: true } },
                brand: { select: { brandId: true, name: true } },
                images: { orderBy: [{ isPrimary: 'desc' }, { imageId: 'asc' }] },
                variants: {
                    where: { isDeleted: false },
                    include: {
                        variantAttributes: {
                            include: { value: { include: { attribute: true } } },
                        },
                    },
                    orderBy: { variantId: 'asc' },
                },
            },
        });
    },

    // ── Full product for edit form ──────────────────────────────────────────────
    async findByIdForEdit(id: number) {
        return prisma.product.findUnique({
            where: { productId: id },
            include: {
                category: { select: { categoryId: true, name: true, slug: true } },
                brand: { select: { brandId: true, name: true } },
                images: { orderBy: [{ isPrimary: 'desc' }, { imageId: 'asc' }] },
                variants: {
                    where: { isDeleted: false },
                    include: {
                        variantAttributes: {
                            include: { value: { include: { attribute: true } } },
                        },
                    },
                    orderBy: { variantId: 'asc' },
                },
            },
        });
    },

    // ── Check order references ──────────────────────────────────────────────────
    async countOrderItemsByVariantIds(variantIds: number[]) {
        if (variantIds.length === 0) return 0;
        return prisma.orderItem.count({ where: { variantId: { in: variantIds } } });
    },

    // ── Soft delete (archive) ──────────────────────────────────────────────────
    async softDelete(id: number) {
        return prisma.product.update({
            where: { productId: id },
            data: { isDeleted: true, status: 'Archived', deletedAt: new Date() },
        });
    },

    // ── Hard delete (transactional) ────────────────────────────────────────────
    async hardDelete(id: number, variantIds: number[]) {
        return prisma.$transaction(async (tx) => {
            if (variantIds.length > 0) {
                await tx.cartItem.deleteMany({ where: { variantId: { in: variantIds } } });
            }
            await tx.product.delete({ where: { productId: id } });
        });
    },

    // ── Attribute helpers ──────────────────────────────────────────────────────
    async resolveAttribute(name: string, tx: Prisma.TransactionClient) {
        return tx.attribute.upsert({
            where: { name },
            create: { name },
            update: {},
        });
    },

    async resolveAttributeValue(attributeId: number, value: string, tx: Prisma.TransactionClient) {
        const existing = await tx.attributeValue.findFirst({ where: { attributeId, value } });
        if (existing) return existing;
        return tx.attributeValue.create({ data: { attributeId, value } });
    },
};
