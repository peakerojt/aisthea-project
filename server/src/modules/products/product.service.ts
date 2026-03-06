import { productRepository, ProductFilter } from './product.repository';
import { cloudinaryService } from '../../services/cloudinary.service';
import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../lib/logger';
import type { Prisma } from '../../generated/client';
import { prisma } from '../../lib/prisma';
import type { CreateProductDto, UpdateProductDto } from './product.validator';

// ─── Shared attribute-resolution helper ──────────────────────────────────────
/**
 * Build a lookup map of attributeName → { attributeId, values: valueName → valueId }.
 * Upserts attributes and attribute values as needed.
 * Extracted to eliminate the copy-paste between createProduct and updateProduct.
 */
async function resolveAttributes(
    variants: Array<{ attributeValues: { attributeName: string; value: string }[] }>,
    tx: Prisma.TransactionClient,
) {
    const map = new Map<string, { attributeId: number; values: Map<string, number> }>();

    for (const variant of variants) {
        for (const av of variant.attributeValues) {
            if (!map.has(av.attributeName)) {
                const attribute = await productRepository.resolveAttribute(av.attributeName, tx);
                map.set(av.attributeName, { attributeId: attribute.attributeId, values: new Map() });
            }
            const entry = map.get(av.attributeName)!;
            if (!entry.values.has(av.value)) {
                const attrValue = await productRepository.resolveAttributeValue(
                    entry.attributeId,
                    av.value,
                    tx,
                );
                entry.values.set(av.value, attrValue.valueId);
            }
        }
    }
    return map;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const productService = {
    // ── List products (safe, paginated) ──────────────────────────────────────
    async getProducts(filters: ProductFilter) {
        return productRepository.findMany(filters);
    },

    // ── Single product ────────────────────────────────────────────────────────
    async getProductById(id: number) {
        const product = await productRepository.findById(id);
        if (!product) {
            throw new AppError(404, 'PRODUCT_NOT_FOUND', 'products:errors.notFound');
        }
        return product;
    },

    // ── Full data for edit form ────────────────────────────────────────────────
    async getProductForEdit(id: number) {
        const product = await productRepository.findByIdForEdit(id);
        if (!product) {
            throw new AppError(404, 'PRODUCT_NOT_FOUND', 'products:errors.notFound');
        }
        return product;
    },

    // ── Create ────────────────────────────────────────────────────────────────
    async createProduct(payload: CreateProductDto) {
        return prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    name: payload.name,
                    slug: payload.slug,
                    description: payload.description,
                    basePrice: payload.basePrice as any,
                    categoryId: payload.categoryId,
                    brandId: payload.brandId ?? null,
                    status: payload.status ?? 'Active',
                },
            });

            const attrMap = await resolveAttributes(payload.variants, tx);

            for (let i = 0; i < payload.variants.length; i++) {
                const v = payload.variants[i];
                const created = await tx.productVariant.create({
                    data: {
                        productId: product.productId,
                        sku: v.sku,
                        price: v.price as any,
                        stockQuantity: v.stockQuantity,
                        isDefault: v.isDefault ?? i === 0,
                    },
                });

                for (const av of v.attributeValues) {
                    const entry = attrMap.get(av.attributeName)!;
                    const valueId = entry.values.get(av.value)!;
                    await tx.variantAttribute.create({
                        data: { variantId: created.variantId, valueId },
                    });
                }
            }

            for (let i = 0; i < (payload.images ?? []).length; i++) {
                const img = payload.images[i];
                await tx.productImage.create({
                    data: {
                        productId: product.productId,
                        imageUrl: img.imageUrl,
                        thumbnailUrl: img.thumbnailUrl,
                        isPrimary: img.isPrimary ?? i === 0,
                    },
                });
            }

            return { productId: product.productId, slug: product.slug };
        });
    },

    // ── Update ────────────────────────────────────────────────────────────────
    async updateProduct(productId: number, payload: UpdateProductDto) {
        return prisma.$transaction(async (tx) => {
            // 1. Update base product fields
            await tx.product.update({
                where: { productId },
                data: {
                    name: payload.name,
                    slug: payload.slug,
                    description: payload.description,
                    basePrice: payload.basePrice as any,
                    categoryId: payload.categoryId,
                    brandId: payload.brandId ?? null,
                    status: payload.status ?? 'Active',
                },
            });

            // 2. Delete removed images
            if (payload.deletedImageIds.length > 0) {
                await tx.productImage.deleteMany({
                    where: { imageId: { in: payload.deletedImageIds }, productId },
                });
            }

            // 3. Set primary image
            if (payload.primaryImageId !== undefined) {
                await tx.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
                await tx.productImage.updateMany({
                    where: { productId, imageId: payload.primaryImageId },
                    data: { isPrimary: true },
                });
            }

            // 4. Add new images
            for (const img of payload.newImages) {
                await tx.productImage.create({
                    data: {
                        productId,
                        imageUrl: img.imageUrl,
                        thumbnailUrl: img.thumbnailUrl,
                        isPrimary: img.isPrimary ?? false,
                    },
                });
            }

            // 5. Soft-delete variants not in keptVariantIds
            const softDeleteWhere =
                payload.keptVariantIds.length > 0
                    ? { productId, variantId: { notIn: payload.keptVariantIds }, isDeleted: false }
                    : { productId, isDeleted: false };
            await tx.productVariant.updateMany({ where: softDeleteWhere, data: { isDeleted: true, deletedAt: new Date() } });

            // 6. Upsert variants
            const attrMap = await resolveAttributes(payload.variants, tx);
            for (let i = 0; i < payload.variants.length; i++) {
                const v = payload.variants[i];
                let variantId: number;

                if (v.variantId) {
                    await tx.productVariant.update({
                        where: { variantId: v.variantId },
                        data: { sku: v.sku, price: v.price as any, stockQuantity: v.stockQuantity, isDefault: v.isDefault ?? i === 0, isDeleted: false, deletedAt: null },
                    });
                    await tx.variantAttribute.deleteMany({ where: { variantId: v.variantId } });
                    variantId = v.variantId;
                } else {
                    const created = await tx.productVariant.create({
                        data: { productId, sku: v.sku, price: v.price as any, stockQuantity: v.stockQuantity, isDefault: v.isDefault ?? i === 0 },
                    });
                    variantId = created.variantId;
                }

                for (const av of v.attributeValues) {
                    const entry = attrMap.get(av.attributeName)!;
                    const valueId = entry.values.get(av.value)!;
                    await tx.variantAttribute.create({ data: { variantId, valueId } });
                }
            }

            return { productId };
        });
    },

    // ── Smart Delete ──────────────────────────────────────────────────────────
    async deleteProduct(id: number) {
        const product = await prisma.product.findFirst({
            where: { productId: id, isDeleted: false },
            include: {
                images: { select: { imageId: true, imageUrl: true } },
                variants: { where: { isDeleted: false }, select: { variantId: true } },
            },
        });

        if (!product) {
            throw new AppError(404, 'PRODUCT_NOT_FOUND', 'products:errors.notFound');
        }

        const variantIds = product.variants.map((v) => v.variantId);
        const orderCount = await productRepository.countOrderItemsByVariantIds(variantIds);

        if (orderCount > 0) {
            await productRepository.softDelete(id);
            return { mode: 'archived' as const, message: 'Product archived — has existing orders.' };
        }

        const imageUrls = product.images.map((img) => img.imageUrl);
        await productRepository.hardDelete(id, variantIds);

        // Best-effort Cloudinary cleanup (do not block response)
        setImmediate(async () => {
            for (const url of imageUrls) {
                const publicId = cloudinaryService.extractPublicId(url);
                if (publicId) {
                    try {
                        await cloudinaryService.deleteImage(publicId);
                    } catch (err) {
                        logger.warn('[productService] Cloudinary cleanup failed', { publicId, err });
                    }
                }
            }
        });

        return { mode: 'deleted' as const, message: `Product deleted with ${imageUrls.length} image(s).` };
    },
};
