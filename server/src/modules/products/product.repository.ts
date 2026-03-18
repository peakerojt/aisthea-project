import { prisma } from '../../lib/prisma';
import type { Prisma } from '../../generated/client';

export interface ProductFilter {
  categorySlug?: string;
  brandId?: number;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

const buildOrderBy = (sort: string): Prisma.ProductOrderByWithRelationInput => {
  const [field, directionToken] = sort.split('_');
  const direction: Prisma.SortOrder = directionToken === 'asc' ? 'asc' : 'desc';

  if (field === 'price') return { basePrice: direction };
  if (field === 'name') return { name: direction };
  if (field === 'createdAt') return { createdAt: direction };

  return { createdAt: 'desc' };
};

const resolveDisplayPrice = (product: {
  basePrice: Prisma.Decimal | number;
  variants: Array<{ price: Prisma.Decimal | number; isDefault: boolean | null }>;
}) => {
  const defaultVariant = product.variants.find((variant) => Boolean(variant.isDefault)) ?? product.variants[0];
  return Number(defaultVariant?.price ?? product.basePrice ?? 0);
};

const buildWhere = (filters: ProductFilter): Prisma.ProductWhereInput => {
  const { categorySlug, brandId, search, minPrice, maxPrice, status } = filters;
  const isLowStock = status === 'LowStock';
  const resolvedStatus = isLowStock ? 'Active' : status;
  const variantFilter: Prisma.ProductVariantWhereInput | undefined =
    isLowStock || minPrice !== undefined || maxPrice !== undefined
      ? {
          isDeleted: false,
          ...(minPrice !== undefined ? { price: { gte: minPrice } } : {}),
          ...(maxPrice !== undefined ? { price: { lte: maxPrice } } : {}),
          ...(isLowStock ? { stockQuantity: { gt: 0, lt: 10 } } : {}),
        }
      : undefined;

  return {
    isDeleted: false,
    ...(resolvedStatus ? { status: resolvedStatus } : {}),
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(brandId ? { brandId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
            {
              variants: {
                some: {
                  isDeleted: false,
                  sku: { contains: search },
                },
              },
            },
          ],
        }
      : {}),
    ...(variantFilter
      ? {
          variants: {
            some: variantFilter,
          },
        }
      : {}),
  };
};

export const productRepository = {
  async findMany(filters: ProductFilter = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = buildWhere(filters);
    const orderBy = buildOrderBy(filters.sort ?? 'createdAt_desc');
    const isPriceSort = filters.sort === 'price_asc' || filters.sort === 'price_desc';

    const include = {
      category: { select: { categoryId: true, name: true, slug: true } },
      brand: { select: { brandId: true, name: true } },
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      variants: {
        where: { isDeleted: false },
        select: { sku: true, price: true, stockQuantity: true, isDefault: true },
        orderBy: [{ isDefault: 'desc' as const }, { variantId: 'asc' as const }],
      },
    };

    if (isPriceSort) {
      const products = await prisma.product.findMany({
        where,
        include,
      });

      const sortedProducts = products.sort((left, right) => {
        const leftPrice = resolveDisplayPrice(left);
        const rightPrice = resolveDisplayPrice(right);

        if (leftPrice === rightPrice) {
          return right.productId - left.productId;
        }

        return filters.sort === 'price_asc' ? leftPrice - rightPrice : rightPrice - leftPrice;
      });

      const pagedProducts = sortedProducts.slice(skip, skip + limit);

      return {
        data: pagedProducts,
        meta: {
          total: sortedProducts.length,
          page,
          limit,
          totalPages: Math.ceil(sortedProducts.length / limit),
        },
      };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

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

  async findActiveWithDeleteRelations(id: number) {
    return prisma.product.findFirst({
      where: { productId: id, isDeleted: false },
      include: {
        images: { select: { imageId: true, imageUrl: true } },
        variants: { where: { isDeleted: false }, select: { variantId: true } },
      },
    });
  },

  async countOrderItemsByVariantIds(variantIds: number[]) {
    if (variantIds.length === 0) return 0;
    return prisma.orderItem.count({ where: { variantId: { in: variantIds } } });
  },

  async softDelete(id: number) {
    return prisma.product.update({
      where: { productId: id },
      data: { isDeleted: true, status: 'Archived', deletedAt: new Date() },
    });
  },

  async hardDelete(id: number, variantIds: number[]) {
    return prisma.$transaction(async (tx) => {
      if (variantIds.length > 0) {
        await tx.cartItem.deleteMany({ where: { variantId: { in: variantIds } } });
      }
      await tx.product.delete({ where: { productId: id } });
    });
  },

  async resolveAttribute(name: string, tx: Prisma.TransactionClient) {
    return tx.attribute.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  },

  async findAttributeValues(
    attributeId: number,
    values: string[],
    tx: Prisma.TransactionClient,
  ) {
    if (values.length === 0) return [];

    return tx.attributeValue.findMany({
      where: {
        attributeId,
        value: { in: values },
      },
      select: { valueId: true, value: true },
    });
  },

  async createAttributeValues(
    attributeId: number,
    values: string[],
    tx: Prisma.TransactionClient,
  ) {
    if (values.length === 0) return;

    await tx.attributeValue.createMany({
      data: values.map((value) => ({ attributeId, value })),
    });
  },
};
