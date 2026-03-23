import { z } from 'zod';
import {
  attributeNameField,
  attributeValueField,
  descriptionField,
  nonNegativeQuantityField,
  positiveIntField,
  priceField,
  productNameField,
  searchKeywordField,
  skuField,
  slugField,
} from '../fields';

export const productStatusSchema = z.enum(['Active', 'Inactive', 'Draft', 'Archived']);

const variantAttributeSchema = z.object({
  attributeName: attributeNameField,
  value: attributeValueField,
}).strict();

const variantSchema = z.object({
  sku: skuField,
  price: priceField,
  stockQuantity: nonNegativeQuantityField,
  isDefault: z.boolean().optional(),
  attributeValues: z.array(variantAttributeSchema).min(1, 'Mỗi biến thể phải có ít nhất một thuộc tính'),
}).strict();

const imageSchema = z.object({
  imageUrl: z.string().trim().url('URL hình ảnh không hợp lệ'),
  thumbnailUrl: z.string().trim().url('URL ảnh thu nhỏ không hợp lệ').optional(),
  isPrimary: z.boolean().optional(),
}).strict();

const updateVariantSchema = z.object({
  variantId: positiveIntField.optional(),
  sku: skuField,
  price: priceField,
  stockQuantity: nonNegativeQuantityField,
  isDefault: z.boolean().optional(),
  attributeValues: z.array(variantAttributeSchema).min(1, 'Mỗi biến thể phải có ít nhất một thuộc tính'),
}).strict();

export const createProductSchema = z.object({
  name: productNameField,
  slug: slugField,
  description: descriptionField,
  basePrice: priceField,
  categoryId: positiveIntField,
  brandId: positiveIntField.optional(),
  status: productStatusSchema.optional().default('Active'),
  variants: z.array(variantSchema).min(1, 'Phải có ít nhất một biến thể'),
  images: z.array(imageSchema).optional().default([]),
}).strict();

export const updateProductSchema = z.object({
  name: productNameField,
  slug: slugField,
  description: descriptionField,
  basePrice: priceField,
  categoryId: positiveIntField,
  brandId: positiveIntField.optional(),
  status: productStatusSchema.optional(),
  deletedImageIds: z.array(positiveIntField).optional().default([]),
  newImages: z.array(imageSchema).optional().default([]),
  primaryImageId: positiveIntField.optional(),
  variants: z.array(updateVariantSchema).optional().default([]),
  keptVariantIds: z.array(positiveIntField).optional().default([]),
}).strict();

export const productQuerySchema = z.object({
  category: z.string().trim().optional(),
  brand: z.coerce.number().int().positive().optional(),
  search: searchKeywordField,
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  status: z.enum(['Active', 'Inactive', 'Draft', 'Archived', 'LowStock', 'InactiveGroup']).optional(),
  sort: z.enum(['createdAt_desc', 'createdAt_asc', 'name_asc', 'name_desc', 'price_asc', 'price_desc']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const updateProductStatusSchema = z.object({
  status: productStatusSchema,
}).strict();

export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type ProductQueryDto = z.infer<typeof productQuerySchema>;
export type UpdateProductStatusInput = z.infer<typeof updateProductStatusSchema>;
