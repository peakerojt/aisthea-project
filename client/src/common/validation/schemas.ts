import { z } from 'zod';
import {
  addressIdParamSchema,
  addressSchema,
  addToCartSchema,
  createCouponSchema,
  createOrderSchema,
  createReviewSchema,
  forgotPasswordSchema,
  loginSchema,
  mergeCartSchema,
  noteField,
  passwordField,
  passwordRequirements,
  paymentMethodSchema,
  priceField,
  productNameField,
  quantityField,
  quoteOrderSchema,
  registerSchema,
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
  addressLineField,
  cityField,
  districtField,
  emailField,
  fullNameField,
  phoneField,
  wardField,
} from '@validation';

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

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

export const signupFormSchema = registerSchema.extend({
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  newsletter: z.boolean().default(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginFormSchema = loginSchema;

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
  email: emailField,
  fullName: fullNameField,
  phone: phoneField,
  address: addressLineField,
  city: cityField,
  district: districtField,
  ward: wardField,
  note: noteField,
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
    z.string().min(4, 'Order code must be at least 4 characters').max(50, 'Order code must be at most 50 characters'),
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
