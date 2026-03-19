import { z } from 'zod';
import {
  addressLineField,
  cityField,
  districtField,
  emailField,
  fullNameField,
  noteField,
  optionalCouponCodeField,
  phoneField,
  positiveIntField,
  quantityField,
  shippingCityCodeField,
  wardField,
} from '../fields';

export const shippingMethodSchema = z.enum(['STANDARD', 'EXPRESS']);
export const paymentMethodSchema = z.enum(['COD', 'VNPAY']);

export const orderItemSchema = z.object({
  variantId: positiveIntField,
  quantity: quantityField,
}).strict();

export const quoteOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  couponCode: optionalCouponCodeField,
  shippingCityCode: shippingCityCodeField.optional(),
  shippingMethod: shippingMethodSchema.optional(),
}).strict();

export const createOrderSchema = z.object({
  paymentMethod: paymentMethodSchema,
  customerName: fullNameField,
  customerEmail: emailField,
  customerPhone: phoneField,
  shippingCity: cityField,
  shippingDistrict: districtField,
  shippingWard: wardField,
  shippingAddressDetail: addressLineField,
  note: noteField,
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  couponCode: optionalCouponCodeField,
  shippingCityCode: shippingCityCodeField,
  shippingMethod: shippingMethodSchema,
}).strict();

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int('Order id must be an integer').positive('Order id must be greater than 0'),
});

export const myOrderIdParamSchema = z.object({
  orderId: z.coerce.number().int('Order id must be an integer').positive('Order id must be greater than 0'),
});

export const updateOrderStatusSchema = z.object({
  status: z.string().trim().min(1, 'Status is required'),
  note: noteField,
  deliveryProofImages: z.array(z.string().url('Each delivery proof image must be a valid URL')).max(5).optional(),
  deliveryProofReviewed: z.boolean().optional(),
}).strict();

export type OrderIdParams = z.infer<typeof orderIdParamSchema>;
export type QuoteOrderInput = z.infer<typeof quoteOrderSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
