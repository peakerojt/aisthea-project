import { z } from 'zod';
import {
  addressLineField,
  cityField,
  districtField,
  fullNameField,
  optionalFullNameField,
  optionalPhoneField,
  phoneField,
  wardField,
} from '../fields';

export const updateProfileSchema = z.object({
  fullName: optionalFullNameField,
  phone: optionalPhoneField,
}).strict();

export const addressSchema = z.object({
  recipientName: fullNameField,
  phone: phoneField,
  addressLine: addressLineField,
  city: cityField,
  district: districtField,
  ward: wardField,
  isDefault: z.boolean().optional(),
}).strict();

export const addressIdParamSchema = z.object({
  id: z.coerce.number().int('Mã địa chỉ phải là số nguyên').positive('Mã địa chỉ phải lớn hơn 0'),
});

export const bankInputMethodSchema = z.enum(['MANUAL', 'QR_IMAGE']);

const bankNameField = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập tên ngân hàng')
  .max(120, 'Tên ngân hàng không được vượt quá 120 ký tự');

const bankCodeField = z
  .string()
  .trim()
  .max(50, 'Mã ngân hàng không được vượt quá 50 ký tự')
  .optional();

const accountNumberField = z
  .string()
  .trim()
  .min(4, 'Số tài khoản phải có ít nhất 4 ký tự')
  .max(50, 'Số tài khoản không được vượt quá 50 ký tự')
  .regex(/^[0-9A-Za-z\s-]+$/, 'Số tài khoản chỉ được chứa chữ, số, khoảng trắng hoặc dấu gạch nối');

const accountHolderField = z
  .string()
  .trim()
  .min(2, 'Vui lòng nhập tên chủ tài khoản')
  .max(120, 'Tên chủ tài khoản không được vượt quá 120 ký tự');

const bankImageUrlField = z
  .string()
  .trim()
  .min(1, 'Thiếu URL ảnh')
  .max(1000, 'URL ảnh quá dài')
  .optional();

const qrValidationTokenField = z
  .string()
  .trim()
  .min(1, 'Thiếu mã xác thực QR')
  .max(4000, 'Mã xác thực QR quá dài')
  .optional();

export const bankAccountSchema = z.object({
  bankName: bankNameField,
  bankCode: bankCodeField,
  accountNumber: accountNumberField,
  accountHolder: accountHolderField,
  qrImageUrl: bankImageUrlField,
  qrValidationToken: qrValidationTokenField,
  inputMethod: bankInputMethodSchema,
}).strict();

export const bankAccountIdParamSchema = z.object({
  id: z.coerce.number().int('Mã tài khoản ngân hàng phải là số nguyên').positive('Mã tài khoản ngân hàng phải lớn hơn 0'),
});

export const uploadImagePayloadSchema = z.object({
  imageData: z.string().trim().min(1, 'Thiếu dữ liệu ảnh'),
  fileName: z.string().trim().max(255, 'Tên tệp quá dài').optional(),
  qrContent: z.string().trim().min(1, 'Thiếu nội dung QR').max(4000, 'Nội dung QR quá dài').optional(),
}).strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type AddressIdParams = z.infer<typeof addressIdParamSchema>;
export type BankAccountInput = z.infer<typeof bankAccountSchema>;
export type BankAccountIdParams = z.infer<typeof bankAccountIdParamSchema>;
export type UploadImagePayloadInput = z.infer<typeof uploadImagePayloadSchema>;
