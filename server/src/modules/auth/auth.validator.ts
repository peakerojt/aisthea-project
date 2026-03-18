import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(72, 'Password must be at most 72 characters'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(6, 'Reset token/code is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(72, 'Password must be at most 72 characters'),
});

export const verifyEmailSchema = z.object({
    code: z.string().min(1, 'Verification code is required'),
    email: z.string().email('Invalid email address'),
});

export const resendVerificationSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export type RegisterDto = z.infer<typeof registerSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
