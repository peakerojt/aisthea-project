import { z } from 'zod';
import pagesVI from '../../i18n/locales/vi/pages.json';
import {
  addressIdParamSchema,
  addressSchema,
  addToCartSchema,
  createCouponSchema,
  createOrderSchema,
  createReviewSchema,
  forgotPasswordSchema,
  mergeCartSchema,
  passwordField,
  passwordRequirements,
  paymentMethodSchema,
  priceField,
  productNameField,
  quantityField,
  quoteOrderSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  searchKeywordField,
  skuField,
  updateProfileSchema,
  updateCouponSchema,
  updateProductStatusSchema,
  verifyEmailSchema,
  validateCouponRequestSchema,
  updateCartItemSchema,
  descriptionField,
  positiveIntField,
  phoneField,
} from '@validation';

const translate = (key: string, defaultValue = '') => {
  const normalizedKey = key.startsWith('pages:') ? key.slice('pages:'.length) : key;
  const resolved = normalizedKey
    .split('.')
    .reduce<unknown>((current, segment) => (
      current && typeof current === 'object' && segment in current
        ? (current as Record<string, unknown>)[segment]
        : undefined
    ), pagesVI);

  return typeof resolved === 'string' ? resolved : defaultValue;
};

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

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

const loginEmailField = z.preprocess(
  normalizeEmailInput,
  z
    .string()
    .min(1, translate('pages:login.validation.emailInvalid'))
    .max(100, translate('pages:login.validation.emailInvalid'))
    .email(translate('pages:login.validation.emailInvalid')),
);

const loginPasswordField = z
  .string()
  .min(1, translate('pages:login.validation.passwordRequired'));

const signupFullNameField = z.preprocess(
  normalizeTextInput,
  z
    .string()
    .min(2, translate('pages:signup.validation.fullNameMin'))
    .max(100, translate('pages:signup.validation.fullNameMin')),
);

const signupEmailField = z.preprocess(
  normalizeEmailInput,
  z
    .string()
    .min(1, translate('pages:signup.validation.emailInvalid'))
    .max(100, translate('pages:signup.validation.emailInvalid'))
    .email(translate('pages:signup.validation.emailInvalid')),
);

const checkoutEmailField = z.preprocess(
  normalizeEmailInput,
  z
    .string()
    .min(1, translate('pages:checkout.validation.emailRequired'))
    .max(100, translate('pages:checkout.validation.emailFormat'))
    .refine((value) => !/\s/.test(value), translate('pages:checkout.validation.emailNoSpaces'))
    .email(translate('pages:checkout.validation.emailFormat')),
);

const checkoutFullNameField = z.preprocess(
  normalizeTextInput,
  z
    .string()
    .min(1, translate('pages:checkout.validation.fullNameRequired'))
    .min(2, translate('pages:checkout.validation.fullNameMin'))
    .max(100, translate('pages:checkout.validation.fullNameMin'))
    .refine(
      (value) => !/[@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value),
      translate('pages:checkout.validation.fullNameNoSpecial'),
    ),
);

const checkoutPhoneField = z.preprocess(
  normalizePhoneInput,
  z
    .string()
    .min(1, translate('pages:checkout.validation.phoneRequired'))
    .regex(/^0\d{9}$/, translate('pages:checkout.validation.phoneFormat')),
);

const checkoutAddressField = z.preprocess(
  normalizeTextInput,
  z
    .string()
    .min(1, translate('pages:checkout.validation.addressRequired'))
    .min(6, translate('pages:checkout.validation.addressLength'))
    .max(255, translate('pages:checkout.validation.addressLength')),
);

const checkoutCityField = z.preprocess(
  normalizeTextInput,
  z
    .string()
    .min(1, translate('pages:checkout.validation.cityRequired'))
    .max(50, translate('pages:checkout.validation.cityRequired')),
);

const checkoutDistrictField = z.preprocess(
  normalizeTextInput,
  z
    .string()
    .min(1, translate('pages:checkout.validation.districtRequired'))
    .max(50, translate('pages:checkout.validation.districtRequired')),
);

const checkoutWardField = z.preprocess(
  normalizeTextInput,
  z
    .string()
    .min(1, translate('pages:checkout.validation.wardRequired'))
    .max(50, translate('pages:checkout.validation.wardRequired')),
);

const checkoutNoteField = z.preprocess(
  normalizeOptionalTextInput,
  z.string().max(500, translate('pages:checkout.validation.noteMax')).optional(),
);

const coercePositiveIntField = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return Number(value);
}, positiveIntField);

const optionalCoercePositiveIntField = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return Number(value);
}, positiveIntField.optional());

const coercePriceField = z.preprocess((value) => Number(value), priceField);

const optionalSkuField = z.preprocess(emptyStringToUndefined, skuField.optional());

export const passwordValidation = passwordField;
export { passwordRequirements };

export const signupFormSchema = z.object({
  email: signupEmailField,
  password: passwordField,
  fullName: signupFullNameField,
  confirmPassword: z.string().min(1, translate('pages:signup.validation.confirmPasswordRequired')),
  newsletter: z.boolean().default(true),
}).strict().refine((data) => data.password === data.confirmPassword, {
  message: translate('pages:signup.validation.passwordMismatch'),
  path: ['confirmPassword'],
});

export const loginFormSchema = z.object({
  email: loginEmailField,
  password: loginPasswordField,
}).strict();

export const adminProductFormSchema = z.object({
  name: productNameField,
  description: descriptionField,
  categoryId: coercePositiveIntField,
  brandId: optionalCoercePositiveIntField,
  basePrice: coercePriceField,
  baseSku: optionalSkuField,
  status: z.enum(['Active', 'Inactive', 'Draft', 'Archived']).default('Active'),
});

export const checkoutFormSchema = z.object({
  email: checkoutEmailField,
  fullName: checkoutFullNameField,
  phone: checkoutPhoneField,
  address: checkoutAddressField,
  city: checkoutCityField,
  district: checkoutDistrictField,
  ward: checkoutWardField,
  note: checkoutNoteField,
  paymentMethod: paymentMethodSchema,
}).strict();

export const addToCartClientSchema = addToCartSchema;
export const updateCartItemClientSchema = updateCartItemSchema;
export const mergeCartClientSchema = mergeCartSchema;
export const forgotPasswordClientSchema = forgotPasswordSchema;
export const resetPasswordClientSchema = resetPasswordSchema;
export const verifyEmailClientSchema = verifyEmailSchema;
export const resendVerificationClientSchema = resendVerificationSchema;
export const validateCouponClientSchema = validateCouponRequestSchema;
export const createCouponClientSchema = createCouponSchema;
export const updateCouponClientSchema = updateCouponSchema;
export const createReviewClientSchema = createReviewSchema;
export const quoteOrderClientSchema = quoteOrderSchema;
export const createOrderClientSchema = createOrderSchema;
export const profileUpdateClientSchema = updateProfileSchema;
export const profileAddressClientSchema = addressSchema;
export const addressIdClientParamSchema = addressIdParamSchema;
export const productStatusUpdateClientSchema = updateProductStatusSchema;
export const trackingLookupClientSchema = z.object({
  orderCode: z.preprocess(
    (value) => typeof value === 'string' ? value.trim() : value,
    z
      .string()
      .min(4, translate('pages:trackingLookup.errors.orderCodeInvalid'))
      .max(50, translate('pages:trackingLookup.errors.orderCodeTooLong')),
  ),
  contact: phoneField,
}).strict();

export const productSearchSchema = z.object({
  search: searchKeywordField,
  minPrice: z.preprocess((value) => value === '' || value === undefined ? undefined : Number(value), priceField.optional()),
  maxPrice: z.preprocess((value) => value === '' || value === undefined ? undefined : Number(value), priceField.optional()),
  quantity: z.preprocess((value) => value === '' || value === undefined ? undefined : Number(value), quantityField.optional()),
});

export type SignupFormInput = z.infer<typeof signupFormSchema>;
export type LoginFormInput = z.infer<typeof loginFormSchema>;
export type AdminProductFormInput = z.infer<typeof adminProductFormSchema>;
export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>;
export type CreateCouponClientInput = z.infer<typeof createCouponClientSchema>;
export type UpdateCouponClientInput = z.infer<typeof updateCouponClientSchema>;
export type ProfileUpdateClientInput = z.infer<typeof profileUpdateClientSchema>;
export type ProfileAddressClientInput = z.infer<typeof profileAddressClientSchema>;
export type TrackingLookupClientInput = z.infer<typeof trackingLookupClientSchema>;
