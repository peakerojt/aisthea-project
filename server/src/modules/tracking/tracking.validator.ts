import { z } from 'zod';

export const publicTrackingSchema = z.object({
  orderCode: z.string().trim().min(4),
  contact: z.string().trim().min(4),
});

export const updateOrderStatusSchema = z.object({
  status: z.string().trim().min(1),
  note: z.string().trim().max(500).optional(),
  deliveryProofImages: z.array(z.string().trim().url()).max(5).optional(),
  deliveryProofReviewed: z.boolean().optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
