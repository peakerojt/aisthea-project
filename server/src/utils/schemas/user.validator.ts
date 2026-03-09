import { z } from 'zod';

/**
 * Schema for updating a user profile.
 * Validates fullName and phone fields.
 */
export const updateProfileSchema = z.object({
    fullName: z
        .string()
        .min(1, 'Full name cannot be empty')
        .max(100, 'Full name cannot exceed 100 characters')
        .optional(),
    phone: z
        .string()
        .regex(/^[0-9\s\-\+\(\)]+$/, 'Invalid phone number format')
        .max(20, 'Phone number cannot exceed 20 characters')
        .optional(),
});

/**
 * Schema for creating or updating an address.
 */
export const addressSchema = z.object({
    recipientName: z
        .string()
        .min(1, 'Recipient name is required')
        .max(100, 'Recipient name cannot exceed 100 characters'),
    phone: z
        .string()
        .min(1, 'Phone is required')
        .regex(/^[0-9\s\-\+\(\)]+$/, 'Invalid phone number format')
        .max(20, 'Phone cannot exceed 20 characters'),
    addressLine: z
        .string()
        .min(1, 'Address is required')
        .max(255, 'Address cannot exceed 255 characters'),
    city: z
        .string()
        .min(1, 'City is required')
        .max(50, 'City cannot exceed 50 characters'),
    district: z
        .string()
        .max(50, 'District cannot exceed 50 characters')
        .optional(),
    isDefault: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
