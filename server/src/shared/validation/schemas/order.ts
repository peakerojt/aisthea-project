import { z } from 'zod';
import {
  addressLineField,
  cityField,
  districtField,
  emailField,
  fullNameField,
  noteField,
  normalizeOptionalTextInput,
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
  items: z.array(orderItemSchema).min(1, 'Phải có ít nhất một sản phẩm'),
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
  items: z.array(orderItemSchema).min(1, 'Phải có ít nhất một sản phẩm'),
  couponCode: optionalCouponCodeField,
  shippingCityCode: shippingCityCodeField,
  shippingMethod: shippingMethodSchema,
}).strict();

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int('Mã đơn hàng phải là số nguyên').positive('Mã đơn hàng phải lớn hơn 0'),
});

export const myOrderIdParamSchema = z.object({
  orderId: z.coerce.number().int('Mã đơn hàng phải là số nguyên').positive('Mã đơn hàng phải lớn hơn 0'),
});

const adminOrderIdsField = z.array(
  z.coerce.number().int('Mã đơn hàng phải là số nguyên').positive('Mã đơn hàng phải lớn hơn 0'),
).min(1, 'Vui lòng chọn ít nhất một đơn hàng')
  .max(100, 'Chỉ có thể thao tác tối đa 100 đơn hàng mỗi lần')
  .superRefine((orderIds, ctx) => {
    const seen = new Set<number>();

    orderIds.forEach((orderId, index) => {
      if (seen.has(orderId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: 'Danh sách đơn hàng chứa mã trùng lặp',
        });
        return;
      }

      seen.add(orderId);
    });
  });

export const cancelOrderBodySchema = z.object({
  reason: z.preprocess(
    normalizeOptionalTextInput,
    z.string().max(120, 'Lý do hủy không được vượt quá 120 ký tự').optional(),
  ),
  note: noteField,
}).strict();

export const updateOrderStatusSchema = z.object({
  status: z.string().trim().min(1, 'Vui lòng nhập trạng thái'),
  note: noteField,
  deliveryProofImages: z
    .array(z.string().url('Mỗi ảnh bằng chứng giao hàng phải là một URL hợp lệ'))
    .max(5)
    .optional(),
  deliveryProofReviewed: z.boolean().optional(),
}).strict();

export const bulkUpdateOrderStatusSchema = z.object({
  orderIds: adminOrderIdsField,
  status: z.string().trim().min(1, 'Vui lòng nhập trạng thái'),
  note: noteField,
}).strict();

export const adminOrderExportSchema = z.object({
  orderIds: adminOrderIdsField,
}).strict();

export type OrderIdParams = z.infer<typeof orderIdParamSchema>;
export type QuoteOrderInput = z.infer<typeof quoteOrderSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CancelOrderBodyInput = z.infer<typeof cancelOrderBodySchema>;
export type BulkUpdateOrderStatusInput = z.infer<typeof bulkUpdateOrderStatusSchema>;
export type AdminOrderExportInput = z.infer<typeof adminOrderExportSchema>;
