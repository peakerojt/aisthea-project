
import { prisma } from '../utils/prisma';
import { Prisma } from '@prisma/client';

export const getProducts = async (filters?: {
    categorySlug?: string;
    brandId?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
}) => {
    // Use Prisma.ProductFindManyArgs['where'] or just simple object to avoid type issues if generated types are not found
    const where: any = {
        isDeleted: false,
        status: 'Active',
    };

    if (filters?.categorySlug) {
        where.category = {
            slug: filters.categorySlug,
        };
    }

    if (filters?.brandId) {
        where.brandId = filters.brandId;
    }

    if (filters?.search) {
        where.OR = [
            { name: { contains: filters.search } }, // Should use mode: 'insensitive' if supported, but SQL Server default might be CI
            { description: { contains: filters.search } },
        ];
    }

    if (filters?.minPrice || filters?.maxPrice) {
        where.basePrice = {};
        if (filters.minPrice) where.basePrice.gte = filters.minPrice;
        if (filters.maxPrice) where.basePrice.lte = filters.maxPrice;
    }

    const products = await prisma.product.findMany({
        where,
        include: {
            category: true,
            brand: true,
            images: {
                where: { isPrimary: true },
                take: 1
            },
            variants: {
                where: { isDeleted: false },
                select: {
                    price: true,
                    stockQuantity: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return products;
};

export const getProductById = async (id: number) => {
    const product = await prisma.product.findUnique({
        where: {
            productId: id,
            isDeleted: false
        },
        include: {
            category: true,
            brand: true,
            images: true,
            variants: {
                where: { isDeleted: false },
                include: {
                    variantAttributes: {
                        include: {
                            value: {
                                include: {
                                    attribute: true
                                }
                            }
                        }
                    },
                    images: true
                }
            },
            reviews: {
                include: {
                    user: {
                        select: {
                            fullName: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
    });

    return product;
};
