import { z } from 'zod';
import {
  emailField,
  fullNameField,
  loginPasswordField,
  passwordField,
} from '../fields';

const verificationCodeField = z.string().trim().min(1, 'Verification code is required').max(32, 'Verification code is too long');

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
