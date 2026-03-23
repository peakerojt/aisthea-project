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
  images: z
    .array(z.string().trim().url('Mỗi hình ảnh phải là một URL hợp lệ'))
    .max(10, 'Không thể tải lên quá 10 hình ảnh')
    .optional(),
}).strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
