
import { prisma } from '../utils/prisma';
import { cloudinaryService } from './cloudinary.service';

// ─── Types for createProduct ──────────────────────────────────────────────────
export interface CreateVariantPayload {
    sku: string;
    price: number;
    stockQuantity: number;
    isDefault?: boolean;
    attributeValues: { attributeName: string; value: string }[]; // e.g. [{attributeName:'Màu sắc', value:'Đỏ'}]
}

export interface CreateImagePayload {
    imageUrl: string;
    thumbnailUrl?: string;
    isPrimary?: boolean;
}

export interface CreateProductPayload {
    name: string;
    slug: string;
    description?: string;
    basePrice: number;
    categoryId: number;
    brandId?: number;
    status?: string;
    variants: CreateVariantPayload[];
    images: CreateImagePayload[];
}

export const getProducts = async (filters?: {
    categorySlug?: string;
    brandId?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
}) => {
    // Use optimized view instead of complex joins
    // Build WHERE clause dynamically
    const conditions: string[] = ['1=1']; // Always true base condition
    const params: any[] = [];

    if (filters?.categorySlug) {
        conditions.push('categorySlug = @P' + (params.length + 1));
        params.push(filters.categorySlug);
    }

    if (filters?.brandId) {
        conditions.push('brandName IS NOT NULL'); // Could enhance by adding BrandId to view
    }

    if (filters?.search) {
        conditions.push(`(NameNormalized LIKE '%' + dbo.fn_RemoveDiacritics(@P${params.length + 1}) + '%' OR DescriptionNormalized LIKE '%' + dbo.fn_RemoveDiacritics(@P${params.length + 1}) + '%')`);
        params.push(filters.search);
    }

    if (filters?.minPrice) {
        conditions.push('minPrice >= @P' + (params.length + 1));
        params.push(filters.minPrice);
    }

    if (filters?.maxPrice) {
        conditions.push('maxPrice <= @P' + (params.length + 1));
        params.push(filters.maxPrice);
    }

    const whereClause = conditions.join(' AND ');
    const query = `SELECT * FROM vw_ProductCatalog WHERE ${whereClause} ORDER BY createdAt DESC`;

    const products: any[] = await prisma.$queryRawUnsafe(query, ...params);

    // Transform data to match frontend expectations
    return products.map(p => ({
        productId: p.productId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        basePrice: p.basePrice,
        status: p.status,
        createdAt: p.createdAt,
        // Transform view fields to Prisma-like nested structure
        category: p.categoryName ? {
            name: p.categoryName,
            slug: p.categorySlug
        } : null,
        brand: p.brandName ? {
            name: p.brandName
        } : null,
        images: p.primaryImageUrl ? [{
            imageUrl: p.primaryImageUrl,
            thumbnailUrl: p.primaryThumbnailUrl,
            isPrimary: true
        }] : [],
        // Variants info from aggregation
        variants: [{
            price: p.minPrice || p.basePrice,
            stockQuantity: p.totalStock || 0
        }]
    }));
};

export const searchProducts = async (searchTerm: string, maxResults: number = 50) => {
    // Call sp_SearchProducts for intelligent Vietnamese-aware search
    const results: any[] = await prisma.$queryRaw`EXEC sp_SearchProducts @SearchTerm = ${searchTerm}, @MaxResults = ${maxResults}`;

    return results;
};

export const getProductById = async (id: number) => {
    // Call Stored Procedure
    // Note: SQL Server FOR JSON output is usually split across multiple rows if very large, 
    // but for typical product details it fits in one.
    // However, Prisma raw query with SQL Server returns an array of objects. 
    // If we use FOR JSON without array wrapper, we get a single object with a long JSON string.
    // The column name is usually weird, so we should rely on Object.values().

    try {
        const result: any[] = await prisma.$queryRaw`EXEC sp_GetProductDetails @ProductId = ${id}`;

        if (!result || result.length === 0) {
            return null;
        }

        // Concatenate JSON chunks if multiple rows returned (rare but possible with FOR JSON)
        let jsonString = '';
        result.forEach(row => {
            const val = Object.values(row)[0];
            if (val) jsonString += val;
        });

        if (!jsonString) return null;

        const product = JSON.parse(jsonString);
        return product;
    } catch (error) {
        console.error('Error calling sp_GetProductDetails:', error);
        throw error;
    }
};

// ─── Create Product (Prisma Transaction) ─────────────────────────────────────

export const createProduct = async (payload: CreateProductPayload) => {
    const {
        name, slug, description, basePrice, categoryId, brandId, status = 'Active',
        variants, images,
    } = payload;

    return prisma.$transaction(async (tx) => {
        // 1. Create the base product
        const product = await tx.product.create({
            data: {
                name,
                slug,
                description,
                basePrice: basePrice as any,
                categoryId,
                brandId: brandId || null,
                status,
            },
        });

        const productId = product.productId;

        // 2. Build a map of attribute name → id, value → valueId
        // Collect all unique attribute names and values from variants
        const attributeMap = new Map<string, { attributeId: number; values: Map<string, number> }>();

        for (const variant of variants) {
            for (const av of variant.attributeValues) {
                if (!attributeMap.has(av.attributeName)) {
                    // Upsert the attribute by name
                    const attribute = await tx.attribute.upsert({
                        where: { name: av.attributeName },
                        create: { name: av.attributeName },
                        update: {},
                    });
                    attributeMap.set(av.attributeName, { attributeId: attribute.attributeId, values: new Map() });
                }

                const attrEntry = attributeMap.get(av.attributeName)!;
                if (!attrEntry.values.has(av.value)) {
                    // Upsert the attribute value
                    const existingValue = await tx.attributeValue.findFirst({
                        where: { attributeId: attrEntry.attributeId, value: av.value },
                    });
                    let valueId: number;
                    if (existingValue) {
                        valueId = existingValue.valueId;
                    } else {
                        const created = await tx.attributeValue.create({
                            data: { attributeId: attrEntry.attributeId, value: av.value },
                        });
                        valueId = created.valueId;
                    }
                    attrEntry.values.set(av.value, valueId);
                }
            }
        }

        // 3. Create variants and link variant attributes
        const createdVariants = [];
        for (let i = 0; i < variants.length; i++) {
            const v = variants[i];
            const productVariant = await tx.productVariant.create({
                data: {
                    productId,
                    sku: v.sku,
                    price: v.price as any,
                    stockQuantity: v.stockQuantity,
                    isDefault: v.isDefault ?? (i === 0),
                },
            });

            // 4. Create VariantAttribute links
            for (const av of v.attributeValues) {
                const attrEntry = attributeMap.get(av.attributeName)!;
                const valueId = attrEntry.values.get(av.value)!;
                await tx.variantAttribute.create({
                    data: { variantId: productVariant.variantId, valueId },
                });
            }

            createdVariants.push(productVariant);
        }

        // 5. Create product images
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            await tx.productImage.create({
                data: {
                    productId,
                    imageUrl: img.imageUrl,
                    thumbnailUrl: img.thumbnailUrl,
                    isPrimary: img.isPrimary ?? (i === 0),
                },
            });
        }

        return { productId, slug, variantCount: createdVariants.length };
    });
};

// ─── Get Categories ───────────────────────────────────────────────────────────

export const getCategories = async () => {
    return prisma.category.findMany({
        select: { categoryId: true, name: true, slug: true, parentId: true },
        orderBy: { name: 'asc' },
    });
};

// ─── Get Brands ───────────────────────────────────────────────────────────────

export const getBrands = async () => {
    return prisma.brand.findMany({
        select: { brandId: true, name: true },
        orderBy: { name: 'asc' },
    });
};

// ─── Get Full Product For Edit (nested) ───────────────────────────────────────

export const getProductForEdit = async (id: number) => {
    return prisma.product.findUnique({
        where: { productId: id },
        include: {
            category: { select: { categoryId: true, name: true, slug: true } },
            brand: { select: { brandId: true, name: true } },
            images: {
                orderBy: [{ isPrimary: 'desc' }, { imageId: 'asc' }],
            },
            variants: {
                where: { isDeleted: false },
                include: {
                    variantAttributes: {
                        include: {
                            value: {
                                include: { attribute: true },
                            },
                        },
                    },
                },
                orderBy: { variantId: 'asc' },
            },
        },
    });
};

// ─── Update Product Payload Types ─────────────────────────────────────────────

export interface UpdateVariantPayload {
    variantId?: number;   // if exists → update, else → create
    sku: string;
    price: number;
    stockQuantity: number;
    isDefault?: boolean;
    attributeValues: { attributeName: string; value: string }[];
}

export interface UpdateProductPayload {
    name: string;
    slug: string;
    description?: string;
    basePrice: number;
    categoryId: number;
    brandId?: number;
    status?: string;
    // Image management
    deletedImageIds: number[];
    newImages: CreateImagePayload[];
    primaryImageId?: number;   // existing image to mark as primary
    // Variant management
    variants: UpdateVariantPayload[];
    // IDs of variants still present in the form (others → soft-delete)
    keptVariantIds: number[];
}

// ─── Update Product (Prisma Transaction) ──────────────────────────────────────

export const updateProduct = async (productId: number, payload: UpdateProductPayload) => {
    const {
        name, slug, description, basePrice, categoryId, brandId, status,
        deletedImageIds, newImages, primaryImageId,
        variants, keptVariantIds,
    } = payload;

    return prisma.$transaction(async (tx) => {
        // 1. Update basic product fields
        await tx.product.update({
            where: { productId },
            data: {
                name,
                slug,
                description,
                basePrice: basePrice as any,
                categoryId,
                brandId: brandId || null,
                status: status || 'Active',
            },
        });

        // 2. Delete removed images
        if (deletedImageIds.length > 0) {
            await tx.productImage.deleteMany({
                where: { imageId: { in: deletedImageIds }, productId },
            });
        }

        // 3. Clear all isPrimary flags, then set the chosen one
        if (primaryImageId !== undefined) {
            await tx.productImage.updateMany({
                where: { productId },
                data: { isPrimary: false },
            });
            await tx.productImage.updateMany({
                where: { productId, imageId: primaryImageId },
                data: { isPrimary: true },
            });
        }

        // 4. Create new images
        for (let i = 0; i < newImages.length; i++) {
            const img = newImages[i];
            await tx.productImage.create({
                data: {
                    productId,
                    imageUrl: img.imageUrl,
                    thumbnailUrl: img.thumbnailUrl,
                    isPrimary: img.isPrimary ?? false,
                },
            });
        }

        // 5. Soft-delete variants no longer in submission (preserve order history)
        if (keptVariantIds.length > 0) {
            await tx.productVariant.updateMany({
                where: {
                    productId,
                    variantId: { notIn: keptVariantIds },
                    isDeleted: false,
                },
                data: { isDeleted: true, deletedAt: new Date() },
            });
        } else {
            // All variants removed → soft-delete all
            await tx.productVariant.updateMany({
                where: { productId, isDeleted: false },
                data: { isDeleted: true, deletedAt: new Date() },
            });
        }

        // 6. Build attribute map (same as createProduct)
        const attributeMap = new Map<string, { attributeId: number; values: Map<string, number> }>();

        for (const variant of variants) {
            for (const av of variant.attributeValues) {
                if (!attributeMap.has(av.attributeName)) {
                    const attribute = await tx.attribute.upsert({
                        where: { name: av.attributeName },
                        create: { name: av.attributeName },
                        update: {},
                    });
                    attributeMap.set(av.attributeName, { attributeId: attribute.attributeId, values: new Map() });
                }
                const attrEntry = attributeMap.get(av.attributeName)!;
                if (!attrEntry.values.has(av.value)) {
                    const existingValue = await tx.attributeValue.findFirst({
                        where: { attributeId: attrEntry.attributeId, value: av.value },
                    });
                    const valueId = existingValue
                        ? existingValue.valueId
                        : (await tx.attributeValue.create({ data: { attributeId: attrEntry.attributeId, value: av.value } })).valueId;
                    attrEntry.values.set(av.value, valueId);
                }
            }
        }

        // 7. Upsert variants
        const savedVariantIds: number[] = [];
        for (let i = 0; i < variants.length; i++) {
            const v = variants[i];
            let variantId: number;

            if (v.variantId) {
                // Update existing variant
                await tx.productVariant.update({
                    where: { variantId: v.variantId },
                    data: {
                        sku: v.sku,
                        price: v.price as any,
                        stockQuantity: v.stockQuantity,
                        isDefault: v.isDefault ?? (i === 0),
                        isDeleted: false,   // re-activate if it was soft-deleted
                        deletedAt: null,
                    },
                });
                // Remove old variantAttributes so we can re-link correctly
                await tx.variantAttribute.deleteMany({ where: { variantId: v.variantId } });
                variantId = v.variantId;
            } else {
                // Create new variant
                const created = await tx.productVariant.create({
                    data: {
                        productId,
                        sku: v.sku,
                        price: v.price as any,
                        stockQuantity: v.stockQuantity,
                        isDefault: v.isDefault ?? (i === 0),
                    },
                });
                variantId = created.variantId;
            }

            // Re-create variantAttribute links
            for (const av of v.attributeValues) {
                const attrEntry = attributeMap.get(av.attributeName)!;
                const valueId = attrEntry.values.get(av.value)!;
                await tx.variantAttribute.create({ data: { variantId, valueId } });
            }

            savedVariantIds.push(variantId);
        }

        return { productId, variantCount: savedVariantIds.length };
    });
};

// ─── Smart Delete ──────────────────────────────────────────────────────────────

export interface SmartDeleteResult {
    mode: 'archived' | 'deleted';
    message: string;
}

/**
 * Smart Delete:
 * - Case A: product has order history → soft-delete (archive, preserves data)
 * - Case B: no orders → hard-delete from DB + Cloudinary image cleanup
 */
export const smartDeleteProduct = async (id: number): Promise<SmartDeleteResult> => {
    // 1. Verify product exists
    const product = await prisma.product.findFirst({
        where: { productId: id, isDeleted: false },
        include: {
            images: { select: { imageId: true, imageUrl: true } },
            variants: {
                where: { isDeleted: false },
                select: { variantId: true },
            },
        },
    });

    if (!product) {
        throw new Error('Không tìm thấy sản phẩm hoặc sản phẩm đã bị xóa');
    }

    const variantIds = product.variants.map(v => v.variantId);

    // 2. Check if any variant is referenced in OrderItems
    const orderCount = variantIds.length > 0
        ? await prisma.orderItem.count({
            where: { variantId: { in: variantIds } },
        })
        : 0;

    // ── Case A: Has orders → Soft delete (archive) ──────────────────────────
    if (orderCount > 0) {
        await prisma.product.update({
            where: { productId: id },
            data: {
                isDeleted: true,
                status: 'Archived',
                deletedAt: new Date(),
            },
        });

        return {
            mode: 'archived',
            message: 'Sản phẩm đã có đơn hàng. Đã chuyển sang trạng thái "Ngừng kinh doanh" để bảo toàn lịch sử.',
        };
    }

    // ── Case B: No orders → Hard delete ──────────────────────────────────────

    // 2a. Collect Cloudinary public IDs before deleting DB records
    const imageUrls = product.images.map(img => img.imageUrl);
    const publicIds = imageUrls
        .map(url => cloudinaryService.extractPublicId(url))
        .filter((id): id is string => id !== null);

    // 2b. Hard delete in transaction (cascade handles images & variantAttributes)
    await prisma.$transaction(async (tx) => {
        // Remove from carts first (no cascade from product → cart)
        if (variantIds.length > 0) {
            await tx.cartItem.deleteMany({ where: { variantId: { in: variantIds } } });
        }

        // Delete product — cascades: ProductImage, ProductVariant, VariantAttribute, Review
        await tx.product.delete({ where: { productId: id } });
    });

    // 2c. Cleanup Cloudinary (best-effort — do NOT block response on failure)
    if (publicIds.length > 0) {
        setImmediate(async () => {
            for (const publicId of publicIds) {
                try {
                    await cloudinaryService.deleteImage(publicId);
                } catch (err) {
                    console.warn(`[Smart Delete] Failed to delete Cloudinary image: ${publicId}`, err);
                }
            }
        });
    }

    return {
        mode: 'deleted',
        message: `Đã xóa hoàn toàn sản phẩm và ${publicIds.length} hình ảnh liên quan.`,
    };
};

// ─── Upsert Variants (Smart Sync) ─────────────────────────────────────────────

export interface UpsertVariantItem {
    /** Present for existing DB variants; absent for new ones */
    variantId?: number;
    sku: string;
    price: number;
    stockQuantity: number;
    /** Attribute pairs: [{ attributeName: 'Màu sắc', value: 'Đỏ' }, ...] */
    attributeValues: { attributeName: string; value: string }[];
}

export interface UpsertVariantsResult {
    updated: number;
    created: number;
    softDeleted: number;
    hardDeleted: number;
}

/**
 * Smart sync variant list for a product:
 * - Variants with matching variantId  → UPDATE price / stock
 * - Variants without variantId        → CREATE + link VariantAttributes
 * - Variants in DB but not in input   → soft-delete if has order history, otherwise hard-delete
 * - First variant in input            → automatically set as isDefault
 */
export const upsertVariants = async (
    productId: number,
    incoming: UpsertVariantItem[],
): Promise<UpsertVariantsResult> => {
    const result: UpsertVariantsResult = { updated: 0, created: 0, softDeleted: 0, hardDeleted: 0 };

    return prisma.$transaction(async (tx) => {
        // ── 1. Fetch current DB state ──────────────────────────────────────
        const existing = await tx.productVariant.findMany({
            where: { productId, isDeleted: false },
            select: { variantId: true },
        });
        const existingIds = new Set(existing.map(v => v.variantId));
        const incomingIds = new Set(incoming.filter(v => v.variantId).map(v => v.variantId!));

        // ── 2. Delete variants removed by user ────────────────────────────
        const toRemove = [...existingIds].filter(id => !incomingIds.has(id));
        for (const variantId of toRemove) {
            const orderCount = await tx.orderItem.count({ where: { variantId } });
            if (orderCount > 0) {
                // Soft-delete — preserve order history
                await tx.productVariant.update({
                    where: { variantId },
                    data: { isDeleted: true, deletedAt: new Date() },
                });
                result.softDeleted++;
            } else {
                // Hard-delete (no orders reference this variant)
                await tx.cartItem.deleteMany({ where: { variantId } });
                await tx.productVariant.delete({ where: { variantId } });
                result.hardDeleted++;
            }
        }

        // ── 3. Upsert incoming variants ───────────────────────────────────
        for (let i = 0; i < incoming.length; i++) {
            const v = incoming[i];
            const isDefault = i === 0; // first variant is always the default

            if (v.variantId && existingIds.has(v.variantId)) {
                // UPDATE existing
                await tx.productVariant.update({
                    where: { variantId: v.variantId },
                    data: {
                        sku: v.sku,
                        price: v.price,
                        stockQuantity: v.stockQuantity,
                        isDefault,
                    },
                });
                result.updated++;
            } else {
                // CREATE new — resolve / create attribute values first
                const variantId = await (async () => {
                    const created = await tx.productVariant.create({
                        data: {
                            productId,
                            sku: v.sku,
                            price: v.price,
                            stockQuantity: v.stockQuantity,
                            isDefault,
                        },
                    });
                    return created.variantId;
                })();

                // Link VariantAttributes
                for (const av of v.attributeValues) {
                    // Find or create Attribute
                    let attribute = await tx.attribute.findFirst({
                        where: { name: av.attributeName },
                    });
                    if (!attribute) {
                        attribute = await tx.attribute.create({
                            data: { name: av.attributeName },
                        });
                    }

                    // Find or create AttributeValue
                    let attrValue = await tx.attributeValue.findFirst({
                        where: { attributeId: attribute.attributeId, value: av.value },
                    });
                    if (!attrValue) {
                        attrValue = await tx.attributeValue.create({
                            data: { attributeId: attribute.attributeId, value: av.value },
                        });
                    }

                    // Link to variant
                    await tx.variantAttribute.upsert({
                        where: {
                            variantId_valueId: {
                                variantId,
                                valueId: attrValue.valueId,
                            },
                        },
                        create: { variantId, valueId: attrValue.valueId },
                        update: {},
                    });
                }

                result.created++;
            }
        }

        return result;
    });
};

