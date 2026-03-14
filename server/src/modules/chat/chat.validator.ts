import { z } from 'zod';

export const chatHistorySchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(1000),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  page: z.enum(['home', 'product']),
  history: z.array(chatHistorySchema).max(12).optional().default([]),
  productId: z.number().int().positive().optional(),
});
