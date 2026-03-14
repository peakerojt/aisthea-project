import { z } from 'zod';

export const chatHistorySchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(1000),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  page: z.enum(['home', 'product', 'stylist', 'support', 'weather']),
  history: z.array(chatHistorySchema).max(12).optional().default([]),
  productId: z.number().int().positive().optional(),
  contextSummary: z.string().trim().max(1200).optional(),
});

export const chatTelemetrySchema = z.object({
  event: z.enum(['chat_open', 'chat_send', 'chat_cta_click', 'chat_product_click']),
  page: z.enum(['home', 'product', 'stylist', 'support', 'weather']),
  sessionId: z.string().trim().min(8).max(64),
  productId: z.number().int().positive().optional(),
  messageLength: z.number().int().min(0).max(1000).optional(),
  conversationLength: z.number().int().min(0).max(100).optional(),
  target: z.string().trim().min(1).max(200).optional(),
  label: z.string().trim().min(1).max(80).optional(),
  placement: z.enum(['launcher', 'initial_actions', 'reply_actions', 'product_card']).optional(),
  hasContextSummary: z.boolean().optional(),
});
