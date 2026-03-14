import { z } from 'zod';

/**
 * Schema for creating a new review.
 * Validates productId, orderItemId, rating (1–5), comment, and images.
 */
export const createReviewSchema = z.object({
    productId: z.number().int().positive('productId must be a positive integer'),
    orderItemId: z.number().int().positive('orderItemId must be a positive integer'),
    rating: z
        .number()
        .int('Rating must be an integer')
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating must be at most 5'),
    comment: z.string().max(1000, 'Comment cannot exceed 1000 characters').optional(),
    images: z
        .array(z.string().url('Each image must be a valid URL'))
        .max(10, 'Cannot upload more than 10 images')
        .optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
