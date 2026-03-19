import { z } from 'zod';
import {
  positiveIntField,
  ratingField,
  reviewCommentField,
} from '../fields';

export const createReviewSchema = z.object({
  productId: positiveIntField,
  orderItemId: positiveIntField,
  rating: ratingField,
  comment: reviewCommentField,
  images: z.array(z.string().trim().url('Each image must be a valid URL')).max(10, 'Cannot upload more than 10 images').optional(),
}).strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
