export const CHECKOUT_STANDARD_FREESHIP_THRESHOLD = 500_000;

export const COUPON_MIN_ORDER_PRESET_VALUES = [
  300_000,
  500_000,
  800_000,
  1_200_000,
  1_800_000,
] as const;

export type CouponMinOrderPresetValue = (typeof COUPON_MIN_ORDER_PRESET_VALUES)[number];

export const DEFAULT_ADMIN_COUPON_MIN_ORDER_VALUE = COUPON_MIN_ORDER_PRESET_VALUES[0];
export const REFUND_BENEFIT_RULE_VERSION = 'refund-benefit-v2';
export const DEFAULT_REFUND_BENEFIT_FREESHIP_COUPON_VALUE = 30_000;

export type RefundBenefitRuleConfig = {
  benefitType: 'FREESHIP' | 'PERCENTAGE';
  couponType: 'FIXED_AMOUNT' | 'PERCENTAGE';
  couponValue: number;
  maxDiscountAmount: number | null;
  minOrderValue: CouponMinOrderPresetValue;
  summary: string;
};

export const REFUND_BENEFIT_RULES = [
  {
    maxRefundExclusive: 300_000,
    config: {
      benefitType: 'FREESHIP',
      couponType: 'FIXED_AMOUNT',
      couponValue: DEFAULT_REFUND_BENEFIT_FREESHIP_COUPON_VALUE,
      maxDiscountAmount: null,
      minOrderValue: 300_000,
      summary: 'Miễn phí vận chuyển cho đơn từ 300.000đ',
    },
  },
  {
    maxRefundExclusive: 800_000,
    config: {
      benefitType: 'PERCENTAGE',
      couponType: 'PERCENTAGE',
      couponValue: 10,
      maxDiscountAmount: 50_000,
      minOrderValue: 500_000,
      summary: 'Giảm 10%, tối đa 50.000đ cho đơn từ 500.000đ',
    },
  },
  {
    maxRefundExclusive: 1_500_000,
    config: {
      benefitType: 'PERCENTAGE',
      couponType: 'PERCENTAGE',
      couponValue: 12,
      maxDiscountAmount: 80_000,
      minOrderValue: 800_000,
      summary: 'Giảm 12%, tối đa 80.000đ cho đơn từ 800.000đ',
    },
  },
  {
    maxRefundExclusive: null,
    config: {
      benefitType: 'PERCENTAGE',
      couponType: 'PERCENTAGE',
      couponValue: 15,
      maxDiscountAmount: 120_000,
      minOrderValue: 1_200_000,
      summary: 'Giảm 15%, tối đa 120.000đ cho đơn từ 1.200.000đ',
    },
  },
] as const;

export const isCouponMinOrderPresetValue = (value: number): value is CouponMinOrderPresetValue =>
  COUPON_MIN_ORDER_PRESET_VALUES.includes(value as CouponMinOrderPresetValue);

export const resolveCouponMinOrderPresetBackfill = (value: number, preserveZero = false): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return preserveZero ? 0 : DEFAULT_ADMIN_COUPON_MIN_ORDER_VALUE;
  }

  if (value <= 399_999) return 300_000;
  if (value <= 649_999) return 500_000;
  if (value <= 999_999) return 800_000;
  if (value <= 1_499_999) return 1_200_000;
  return 1_800_000;
};

export const resolveRefundBenefitConfigByRefundAmount = (refundAmount: number): RefundBenefitRuleConfig => {
  const normalizedRefundAmount = Number.isFinite(refundAmount) ? refundAmount : 0;

  for (const rule of REFUND_BENEFIT_RULES) {
    if (rule.maxRefundExclusive === null || normalizedRefundAmount < rule.maxRefundExclusive) {
      return rule.config;
    }
  }

  return REFUND_BENEFIT_RULES[REFUND_BENEFIT_RULES.length - 1].config;
};

export const resolveRefundBenefitMinOrderByCouponDescriptor = (input: {
  benefitType?: string | null;
  couponType?: string | null;
  value?: number | null;
  maxDiscountAmount?: number | null;
  minOrderValue?: number | null;
}) => {
  const benefitType = input.benefitType?.toUpperCase?.() ?? null;
  const couponType = input.couponType?.toUpperCase?.() ?? null;
  const value = Number(input.value ?? 0);
  const maxDiscountAmount = input.maxDiscountAmount == null ? null : Number(input.maxDiscountAmount);

  if (benefitType === 'FREESHIP' || (couponType === 'FIXED_AMOUNT' && maxDiscountAmount === null)) {
    return 300_000;
  }

  if (couponType === 'PERCENTAGE' && value === 10 && maxDiscountAmount === 50_000) {
    return 500_000;
  }

  if (couponType === 'PERCENTAGE' && value === 12 && maxDiscountAmount === 80_000) {
    return 800_000;
  }

  if (couponType === 'PERCENTAGE' && value === 15 && maxDiscountAmount === 120_000) {
    return 1_200_000;
  }

  return resolveCouponMinOrderPresetBackfill(Number(input.minOrderValue ?? 0));
};
