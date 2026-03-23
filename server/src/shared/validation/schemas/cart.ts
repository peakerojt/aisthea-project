import { z } from 'zod';
import {
  positiveIntField,
  quantityField,
  nonNegativeQuantityField,
} from '../fields';

export const cartLineSchema = z.object({
  variantId: positiveIntField,
  quantity: quantityField,
}).strict();

export const addToCartSchema = cartLineSchema;

export const updateCartItemSchema = z.object({
  cartItemId: positiveIntField,
  quantity: nonNegativeQuantityField,
}).strict();

export const mergeCartSchema = z.object({
  items: z.array(cartLineSchema).max(100, 'Có quá nhiều sản phẩm trong một yêu cầu'),
}).strict();

export const cartItemIdParamSchema = z.object({
  cartItemId: z.coerce.number().int('Mã mục giỏ hàng phải là số nguyên').positive('Mã mục giỏ hàng phải lớn hơn 0'),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type MergeCartInput = z.infer<typeof mergeCartSchema>;
