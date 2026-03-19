import { z } from 'zod';
import {
  couponCodeField,
  couponSubtotalField,
  positiveIntField,
} from '../fields';

export const validateCouponRequestSchema = z.object({
  code: couponCodeField,
  cartSubtotal: couponSubtotalField,
}).strict();

export const couponTypeSchema = z.enum(['FIXED_AMOUNT', 'PERCENTAGE']);

const couponDateField = z.coerce.date();
const couponAmountField = z.coerce.number().positive('Coupon value must be greater than 0');
const optionalMaxDiscountField = z.preprocess(
  (value) => {
    if (value === '' || value === undefined) return undefined;
    if (value === null) return null;
    return Number(value);
  },
  z.number().positive('Max discount amount must be greater than 0').nullable().optional(),
);

const createCouponBaseSchema = z.object({
  code: couponCodeField,
  type: couponTypeSchema,
  value: couponAmountField,
  maxDiscountAmount: optionalMaxDiscountField,
  minOrderValue: z.coerce.number().min(0, 'Minimum order value cannot be negative').optional(),
  startDate: couponDateField,
  endDate: couponDateField,
  usageLimit: positiveIntField,
  usagePerUser: positiveIntField.optional(),
  isActive: z.boolean().optional(),
}).strict();

const validateCouponWindow = (
  payload: { type?: 'FIXED_AMOUNT' | 'PERCENTAGE'; value?: number; startDate?: Date; endDate?: Date },
  ctx: z.RefinementCtx,
) => {
  if (payload.type === 'PERCENTAGE' && payload.value !== undefined && (payload.value < 1 || payload.value > 100)) {
    ctx.addIssue({
      code: 'custom',
      path: ['value'],
      message: 'Percentage coupon value must be between 1 and 100',
    });
  }

  if (payload.startDate && payload.endDate && payload.endDate <= payload.startDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'End date must be after start date',
    });
  }
};

export const createCouponSchema = createCouponBaseSchema.superRefine(validateCouponWindow);

export const updateCouponSchema = createCouponBaseSchema
  .partial()
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'At least one coupon field must be provided',
  })
  .superRefine(validateCouponWindow);

export const couponIdParamSchema = z.object({
  id: z.coerce.number().int('Coupon id must be an integer').positive('Coupon id must be greater than 0'),
});

export const couponListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().max(50, 'Search must be at most 50 characters').optional(),
  isActive: z.preprocess(
    (value) => {
      if (value === undefined || value === '') return undefined;
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    },
    z.boolean().optional(),
  ),
}).strip();

export type ValidateCouponRequestInput = z.infer<typeof validateCouponRequestSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type CouponIdParams = z.infer<typeof couponIdParamSchema>;
export type CouponListQueryInput = z.infer<typeof couponListQuerySchema>;
