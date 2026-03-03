import { z } from 'zod';

export const ReturnReasonEnum = z.enum([
  'DEFECTIVE',
  'WRONG_ITEM',
  'SIZE_ISSUE',
  'CHANGED_MIND',
  'OTHER',
]);

export const RefundMethodEnum = z.enum(['ORIGINAL_PAYMENT', 'WALLET_CREDIT']);

export const ReturnStatusEnum = z.enum([
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'RECEIVED',
  'REFUNDED',
]);

const sanitizeText = (value: string) => value.replace(/[<>]/g, '').trim();

export const createReturnRequestSchema = z.object({
  orderId: z.number().int().positive(),
  reason: ReturnReasonEnum,
  note: z.string().max(500).transform(sanitizeText).optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.number().int().positive(),
        quantity: z.number().int().positive(),
        reason: ReturnReasonEnum.optional(),
      }),
    )
    .min(1)
    .superRefine((items, ctx) => {
      const ids = new Set<number>();
      items.forEach((item, index) => {
        if (ids.has(item.orderItemId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Duplicate orderItemId in items',
            path: [index, 'orderItemId'],
          });
        }
        ids.add(item.orderItemId);
      });
    }),
  attachments: z.array(z.string().min(1)).max(5).optional(),
});

export const listAdminReturnsSchema = z.object({
  status: ReturnStatusEnum.optional(),
  orderId: z.coerce.number().int().positive().optional(),
  customerId: z.coerce.number().int().positive().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export const rejectSchema = z.object({
  reason: z.string().min(1).max(500).transform(sanitizeText),
});

export const refundSchema = z.object({
  method: RefundMethodEnum,
  idempotencyKey: z.string().min(8).max(100),
  amount: z.number().positive().optional(),
});

export type CreateReturnRequestDto = z.infer<typeof createReturnRequestSchema>;
export type ListAdminReturnsDto = z.infer<typeof listAdminReturnsSchema>;
export type RejectDto = z.infer<typeof rejectSchema>;
export type RefundDto = z.infer<typeof refundSchema>;
