import { z } from 'zod';

// ─── Create Product ───────────────────────────────────────────────────────────

const variantSchema = z.object({
    sku: z.string().min(1, 'SKU is required'),
    price: z.number().positive('Price must be positive'),
    stockQuantity: z.number().int().min(0, 'Stock cannot be negative'),
    isDefault: z.boolean().optional(),
    attributeValues: z
        .array(
            z.object({
                attributeName: z.string().min(1),
                value: z.string().min(1),
            }),
        )
        .min(1, 'Each variant must have at least one attribute'),
});

const imageSchema = z.object({
    imageUrl: z.string().url('Invalid image URL'),
    thumbnailUrl: z.string().url().optional(),
    isPrimary: z.boolean().optional(),
});

export const createProductSchema = z.object({
    name: z.string().min(1, 'Product name is required').max(255),
    slug: z
        .string()
        .min(1, 'Slug is required')
        .max(255)
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    description: z.string().optional(),
    basePrice: z.number().positive('Base price must be positive'),
    categoryId: z.number().int().positive('Category ID is required'),
    brandId: z.number().int().positive().optional(),
    status: z.enum(['Active', 'Inactive', 'Draft', 'Archived']).optional().default('Active'),
    variants: z.array(variantSchema).min(1, 'At least one variant is required'),
    images: z.array(imageSchema).optional().default([]),
});

// ─── Update Product ───────────────────────────────────────────────────────────

const updateVariantSchema = z.object({
    variantId: z.number().int().positive().optional(),
    sku: z.string().min(1),
    price: z.number().positive(),
    stockQuantity: z.number().int().min(0),
    isDefault: z.boolean().optional(),
    attributeValues: z
        .array(z.object({ attributeName: z.string().min(1), value: z.string().min(1) }))
        .min(1),
});

export const updateProductSchema = z.object({
    name: z.string().min(1).max(255),
    slug: z
        .string()
        .min(1)
        .max(255)
        .regex(/^[a-z0-9-]+$/),
    description: z.string().optional(),
    basePrice: z.number().positive(),
    categoryId: z.number().int().positive(),
    brandId: z.number().int().positive().optional(),
    status: z.enum(['Active', 'Inactive', 'Draft', 'Archived']).optional(),
    deletedImageIds: z.array(z.number().int().positive()).optional().default([]),
    newImages: z.array(imageSchema).optional().default([]),
    primaryImageId: z.number().int().positive().optional(),
    variants: z.array(updateVariantSchema).optional().default([]),
    keptVariantIds: z.array(z.number().int().positive()).optional().default([]),
});

// ─── Query / List ─────────────────────────────────────────────────────────────

export const productQuerySchema = z.object({
    category: z.string().optional(),
    brand: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    minPrice: z.coerce.number().positive().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    status: z.enum(['Active', 'Inactive', 'Draft', 'Archived', 'LowStock']).optional(),
    sort: z.enum(['createdAt_desc', 'createdAt_asc', 'name_asc', 'name_desc', 'price_asc', 'price_desc']).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type ProductQueryDto = z.infer<typeof productQuerySchema>;
