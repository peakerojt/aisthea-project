import { z } from 'zod';

export const orderIdParamSchema = z.object({
  id: z
    .string()
    .min(1, 'Order id is required')
    .regex(/^\d+$/, 'Order id must be a positive integer'),
});

export type OrderIdParams = z.infer<typeof orderIdParamSchema>;

