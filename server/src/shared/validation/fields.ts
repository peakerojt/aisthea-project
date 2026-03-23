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
      .min(min, `${label} phải có ít nhất ${min} ký tự`)
      .max(max, `${label} không được vượt quá ${max} ký tự`),
  );

const optionalText = (label: string, max: number) =>
  z.preprocess(
    normalizeOptionalTextInput,
    z.string().max(max, `${label} không được vượt quá ${max} ký tự`).optional(),
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
    .min(1, 'Vui lòng nhập email')
    .max(100, 'Email không được vượt quá 100 ký tự')
    .email('Email không hợp lệ'),
);

export const optionalEmailField = z.preprocess(
  (value) => {
    const normalized = normalizeEmailInput(value);
    return normalized === '' ? undefined : normalized;
  },
  z
    .string()
    .max(100, 'Email không được vượt quá 100 ký tự')
    .email('Email không hợp lệ')
    .optional(),
);

export const passwordField = z
  .string()
  .min(
    passwordRequirements.minLength,
    `Mật khẩu phải có ít nhất ${passwordRequirements.minLength} ký tự`,
  )
  .max(
    passwordRequirements.maxLength,
    `Mật khẩu không được vượt quá ${passwordRequirements.maxLength} ký tự`,
  )
  .regex(passwordRequirements.hasUpperCase, 'Mật khẩu phải có ít nhất một chữ cái viết hoa')
  .regex(passwordRequirements.hasLowerCase, 'Mật khẩu phải có ít nhất một chữ cái viết thường')
  .regex(passwordRequirements.hasNumber, 'Mật khẩu phải có ít nhất một chữ số')
  .regex(passwordRequirements.hasSpecialChar, 'Mật khẩu phải có ít nhất một ký tự đặc biệt');

export const loginPasswordField = z.string().min(1, 'Vui lòng nhập mật khẩu');

export const fullNameField = requiredText('Họ và tên', 2, 100);
export const optionalFullNameField = optionalText('Họ và tên', 100);

export const phoneField = z.preprocess(
  normalizePhoneInput,
  z
    .string()
    .regex(/^0\d{9}$/, 'Số điện thoại phải là số di động Việt Nam hợp lệ'),
);

export const optionalPhoneField = z.preprocess(
  (value) => {
    const normalized = normalizePhoneInput(value);
    return normalized === '' ? undefined : normalized;
  },
  z
    .string()
    .regex(/^0\d{9}$/, 'Số điện thoại phải là số di động Việt Nam hợp lệ')
    .optional(),
);

export const addressLineField = requiredText('Địa chỉ', 6, 255);
export const cityField = requiredText('Tỉnh/Thành phố', 1, 50);
export const districtField = requiredText('Quận/Huyện', 1, 50);
export const wardField = requiredText('Phường/Xã', 1, 50);

export const optionalDistrictField = optionalText('Quận/Huyện', 50);
export const noteField = optionalText('Ghi chú', 500);
export const reviewCommentField = optionalText('Bình luận', 1000);
export const searchKeywordField = optionalText('Từ khóa tìm kiếm', 100);

export const couponCodeField = z.preprocess(
  normalizeCouponInput,
  z
    .string()
    .min(1, 'Vui lòng nhập mã giảm giá')
    .max(50, 'Mã giảm giá không được vượt quá 50 ký tự'),
);

export const optionalCouponCodeField = z.preprocess(
  normalizeCouponInput,
  z
    .string()
    .min(1, 'Vui lòng nhập mã giảm giá')
    .max(50, 'Mã giảm giá không được vượt quá 50 ký tự')
    .optional(),
);

export const skuField = z.preprocess(
  normalizeTextInput,
  z
    .string()
    .min(1, 'Vui lòng nhập SKU')
    .max(50, 'SKU không được vượt quá 50 ký tự'),
);

export const slugField = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    return value.trim().toLowerCase();
  },
  z
    .string()
    .min(1, 'Vui lòng nhập slug')
    .max(255, 'Slug không được vượt quá 255 ký tự')
    .regex(/^[a-z0-9-]+$/, 'Slug chỉ được chứa chữ thường, số và dấu gạch nối'),
);

export const attributeNameField = requiredText('Tên thuộc tính', 1, 50);
export const attributeValueField = requiredText('Giá trị thuộc tính', 1, 50);
export const productNameField = requiredText('Tên sản phẩm', 1, 255);
export const descriptionField = optionalText('Mô tả', 5000);

export const quantityField = z.number().int('Số lượng phải là số nguyên').positive('Số lượng phải lớn hơn 0');
export const nonNegativeQuantityField = z.number().int('Số lượng phải là số nguyên').min(0, 'Số lượng không được âm');
export const positiveIntField = z.number().int('Giá trị phải là số nguyên').positive('Giá trị phải lớn hơn 0');
export const nonNegativeNumberField = z.number().min(0, 'Giá trị không được âm');
export const priceField = z.number().positive('Giá phải lớn hơn 0');
export const ratingField = z.number().int('Đánh giá phải là số nguyên').min(1, 'Đánh giá phải từ 1 trở lên').max(5, 'Đánh giá không được vượt quá 5');

export const couponSubtotalField = z.number().positive('Tạm tính giỏ hàng phải lớn hơn 0');

export const shippingCityCodeField = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập mã tỉnh/thành giao hàng')
  .regex(/^\d+$/, 'Mã tỉnh/thành giao hàng chỉ được chứa chữ số');
