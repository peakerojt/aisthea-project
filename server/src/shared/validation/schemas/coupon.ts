import { z } from 'zod';
import {
  couponCodeField,
  couponSubtotalField,
  positiveIntField,
} from '../fields';
import {
  COUPON_MIN_ORDER_PRESET_VALUES,
  DEFAULT_ADMIN_COUPON_MIN_ORDER_VALUE,
  isCouponMinOrderPresetValue,
} from '../coupon-rules';

export const validateCouponRequestSchema = z.object({
  code: couponCodeField,
  cartSubtotal: couponSubtotalField,
}).strict();

export const couponTypeSchema = z.enum(['FIXED_AMOUNT', 'PERCENTAGE']);
export const couponStatusFilterSchema = z.enum(['ALL', 'ACTIVE', 'EXPIRED', 'DEPLETED', 'UPCOMING', 'INACTIVE']);
export const couponSortSchema = z.enum([
  'createdAt_desc',
  'createdAt_asc',
  'endDate_asc',
  'endDate_desc',
  'usedCount_desc',
  'usedCount_asc',
]);

const couponDateField = z.coerce.date();
const couponAmountField = z.coerce.number().positive('Giá trị mã giảm giá phải lớn hơn 0');
const optionalMaxDiscountField = z.preprocess(
  (value) => {
    if (value === '' || value === undefined) return undefined;
    if (value === null) return null;
    return Number(value);
  },
  z.number().positive('Giá trị giảm tối đa phải lớn hơn 0').nullable().optional(),
);

const couponMinOrderPresetField = z.preprocess(
  (value) => {
    if (value === '' || value === undefined || value === null) return undefined;
    return Number(value);
  },
  z.number().int('Mức điều kiện đơn tối thiểu không hợp lệ').refine(
    (value) => isCouponMinOrderPresetValue(value),
    `Điều kiện đơn tối thiểu chỉ chấp nhận các mức: ${COUPON_MIN_ORDER_PRESET_VALUES.join(', ')}`,
  ).optional(),
);

const createCouponBaseSchema = z.object({
  code: couponCodeField,
  type: couponTypeSchema,
  value: couponAmountField,
  maxDiscountAmount: optionalMaxDiscountField,
  minOrderValue: couponMinOrderPresetField.default(DEFAULT_ADMIN_COUPON_MIN_ORDER_VALUE),
  startDate: couponDateField,
  endDate: couponDateField,
  usageLimit: positiveIntField,
  usagePerUser: positiveIntField.optional(),
  isActive: z.boolean().optional(),
}).strict();

const getCouponDateFloor = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const validateCouponWindow = (
  payload: { type?: 'FIXED_AMOUNT' | 'PERCENTAGE'; value?: number; startDate?: Date; endDate?: Date },
  ctx: z.RefinementCtx,
) => {
  const dateFloor = getCouponDateFloor();

  if (payload.type === 'PERCENTAGE' && payload.value !== undefined && (payload.value < 1 || payload.value > 100)) {
    ctx.addIssue({
      code: 'custom',
      path: ['value'],
      message: 'Giá trị mã giảm giá theo phần trăm phải nằm trong khoảng từ 1 đến 100',
    });
  }

  if (payload.startDate && payload.startDate < dateFloor) {
    ctx.addIssue({
      code: 'custom',
      path: ['startDate'],
      message: 'Ngày bắt đầu không được ở quá khứ',
    });
  }

  if (payload.endDate && payload.endDate < dateFloor) {
    ctx.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'Ngày kết thúc không được ở quá khứ',
    });
  }

  if (payload.startDate && payload.endDate && payload.endDate <= payload.startDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'Ngày kết thúc phải sau ngày bắt đầu',
    });
  }
};

export const createCouponSchema = createCouponBaseSchema.superRefine(validateCouponWindow);

export const updateCouponSchema = createCouponBaseSchema
  .partial()
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'Phải cung cấp ít nhất một trường để cập nhật mã giảm giá',
  })
  .superRefine(validateCouponWindow);

export const couponIdParamSchema = z.object({
  id: z.coerce.number().int('Mã giảm giá phải là số nguyên').positive('Mã giảm giá phải lớn hơn 0'),
});

export const couponListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().trim().max(50, 'Từ khóa tìm kiếm không được vượt quá 50 ký tự').optional(),
  sort: couponSortSchema.optional().default('createdAt_desc'),
  status: z.preprocess(
    (value) => {
      if (value === undefined || value === '') return undefined;
      return value;
    },
    couponStatusFilterSchema.optional(),
  ),
  includeHidden: z.preprocess(
    (value) => {
      if (value === undefined || value === '') return undefined;
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    },
    z.boolean().optional(),
  ),
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
