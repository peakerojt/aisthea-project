import { z } from 'zod';

const collapseWhitespace = (value: string) => value.trim().replace(/\s+/g, ' ');

const normalizeTextInput = (value: unknown) => {
  if (typeof value !== 'string') return value;
  return collapseWhitespace(value);
};

const normalizeOptionalTextInput = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const normalized = collapseWhitespace(value);
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeEmailInput = (value: unknown) => {
  if (typeof value !== 'string') return value;
  return value.trim().toLowerCase();
};

const normalizePhoneInput = (value: unknown) => {
  if (typeof value !== 'string') return value;

  const compact = value.trim().replace(/[\s\-().]/g, '');
  if (compact.startsWith('+84')) {
    return `0${compact.slice(3)}`;
  }

  if (compact.startsWith('84') && compact.length === 11) {
    return `0${compact.slice(2)}`;
  }

  return compact;
};

const normalizeCouponInput = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : undefined;
};

const requiredText = (label: string, min: number, max: number) =>
  z.preprocess(
    normalizeTextInput,
    z
      .string()
      .min(min, `${label} must be at least ${min} characters`)
      .max(max, `${label} must be at most ${max} characters`),
  );

const optionalText = (label: string, max: number) =>
  z.preprocess(
    normalizeOptionalTextInput,
    z.string().max(max, `${label} must be at most ${max} characters`).optional(),
  );

export const passwordRequirements = {
  minLength: 8,
  maxLength: 72,
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
};

export const emailField = z.preprocess(
  normalizeEmailInput,
  z
    .string()
    .min(1, 'Email is required')
    .max(100, 'Email must be at most 100 characters')
    .email('Invalid email address'),
);

export const optionalEmailField = z.preprocess(
  (value) => {
    const normalized = normalizeEmailInput(value);
    return normalized === '' ? undefined : normalized;
  },
  z
    .string()
    .max(100, 'Email must be at most 100 characters')
    .email('Invalid email address')
    .optional(),
);

export const passwordField = z
  .string()
  .min(passwordRequirements.minLength, `Password must be at least ${passwordRequirements.minLength} characters`)
  .max(passwordRequirements.maxLength, `Password must be at most ${passwordRequirements.maxLength} characters`)
  .regex(passwordRequirements.hasUpperCase, 'Password must contain at least one uppercase letter')
  .regex(passwordRequirements.hasLowerCase, 'Password must contain at least one lowercase letter')
  .regex(passwordRequirements.hasNumber, 'Password must contain at least one number')
  .regex(passwordRequirements.hasSpecialChar, 'Password must contain at least one special character');

export const loginPasswordField = z.string().min(1, 'Password is required');

export const fullNameField = requiredText('Full name', 2, 100);
export const optionalFullNameField = optionalText('Full name', 100);

export const phoneField = z.preprocess(
  normalizePhoneInput,
  z
    .string()
    .regex(/^0\d{9}$/, 'Phone number must be a valid Vietnamese mobile number'),
);

export const optionalPhoneField = z.preprocess(
  (value) => {
    const normalized = normalizePhoneInput(value);
    return normalized === '' ? undefined : normalized;
  },
  z
    .string()
    .regex(/^0\d{9}$/, 'Phone number must be a valid Vietnamese mobile number')
    .optional(),
);

export const addressLineField = requiredText('Address', 6, 255);
export const cityField = requiredText('City', 1, 50);
export const districtField = requiredText('District', 1, 50);
export const wardField = requiredText('Ward', 1, 50);

export const optionalDistrictField = optionalText('District', 50);
export const noteField = optionalText('Note', 500);
export const reviewCommentField = optionalText('Comment', 1000);
export const searchKeywordField = optionalText('Search keyword', 100);

export const couponCodeField = z.preprocess(
  normalizeCouponInput,
  z
    .string()
    .min(1, 'Coupon code is required')
    .max(50, 'Coupon code must be at most 50 characters'),
);

export const optionalCouponCodeField = z.preprocess(
  normalizeCouponInput,
  z
    .string()
    .min(1, 'Coupon code is required')
    .max(50, 'Coupon code must be at most 50 characters')
    .optional(),
);

export const skuField = z.preprocess(
  normalizeTextInput,
  z
    .string()
    .min(1, 'SKU is required')
    .max(50, 'SKU must be at most 50 characters'),
);

export const slugField = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    return value.trim().toLowerCase();
  },
  z
    .string()
    .min(1, 'Slug is required')
    .max(255, 'Slug must be at most 255 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
);

export const attributeNameField = requiredText('Attribute name', 1, 50);
export const attributeValueField = requiredText('Attribute value', 1, 50);
export const productNameField = requiredText('Product name', 1, 255);
export const descriptionField = optionalText('Description', 5000);

export const quantityField = z.number().int('Quantity must be an integer').positive('Quantity must be greater than 0');
export const nonNegativeQuantityField = z.number().int('Quantity must be an integer').min(0, 'Quantity cannot be negative');
export const positiveIntField = z.number().int('Value must be an integer').positive('Value must be greater than 0');
export const nonNegativeNumberField = z.number().min(0, 'Value cannot be negative');
export const priceField = z.number().positive('Price must be positive');
export const ratingField = z.number().int('Rating must be an integer').min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5');

export const couponSubtotalField = z.number().positive('Cart subtotal must be greater than 0');

export const shippingCityCodeField = z
  .string()
  .trim()
  .min(1, 'Shipping city code is required')
  .regex(/^\d+$/, 'Shipping city code must be numeric');
