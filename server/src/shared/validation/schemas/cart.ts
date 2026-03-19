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
  items: z.array(cartLineSchema).max(100, 'Too many cart items in one request'),
}).strict();

export const cartItemIdParamSchema = z.object({
  cartItemId: z.coerce.number().int('cartItemId must be an integer').positive('cartItemId must be greater than 0'),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type MergeCartInput = z.infer<typeof mergeCartSchema>;
