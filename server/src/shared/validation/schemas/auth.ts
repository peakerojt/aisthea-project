import { z } from 'zod';
import {
  emailField,
  fullNameField,
  loginPasswordField,
  passwordField,
} from '../fields';

const verificationCodeField = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập mã xác thực')
  .max(32, 'Mã xác thực quá dài');
const resetCodeField = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return value;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  },
  z.string().regex(/^\d{6}$/, 'Mã đặt lại phải gồm đúng 6 chữ số').optional(),
);

export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
  fullName: fullNameField,
}).strict();

export const loginSchema = z.object({
  email: emailField,
  password: loginPasswordField,
}).strict();

export const forgotPasswordSchema = z.object({
  email: emailField,
}).strict();

export const resetPasswordSchema = z.object({
  token: resetCodeField,
  newPassword: passwordField,
}).strict();

export const verifyEmailSchema = z.object({
  email: emailField,
  code: verificationCodeField,
}).strict();

export const resendVerificationSchema = z.object({
  email: emailField,
}).strict();

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterInput = RegisterDto;
export type LoginInput = LoginDto;
