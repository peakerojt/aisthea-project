import { z } from 'zod';
import { RETURN_REFUND_METHODS, RETURN_REQUEST_STATUSES } from '../return-request.types';

const DUPLICATE_ORDER_ITEM_MESSAGE = 'Duplicate orderItemId in items';
const positiveInt = z.number().int().positive();
const positiveCoercedInt = z.coerce.number().int().positive();
const sanitizeText = (value: string) => value.replace(/[<>]/g, '').trim();
const sanitizedOptionalText = z.string().max(500).transform(sanitizeText).optional();

export const ReturnReasonEnum = z.enum([
  'DEFECTIVE',
  'WRONG_ITEM',
  'SIZE_ISSUE',
  'CHANGED_MIND',
  'OTHER',
]);

export const RefundMethodEnum = z.enum(RETURN_REFUND_METHODS);

export const ReturnStatusEnum = z.enum(RETURN_REQUEST_STATUSES);

export const createReturnRequestSchema = z.object({
  orderId: positiveInt,
  reason: ReturnReasonEnum,
  note: sanitizedOptionalText,
  items: z
    .array(
      z.object({
        orderItemId: positiveInt,
        quantity: positiveInt,
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
            message: DUPLICATE_ORDER_ITEM_MESSAGE,
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
  orderId: positiveCoercedInt.optional(),
  customerId: positiveCoercedInt.optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  page: positiveCoercedInt.default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const idParamSchema = z.object({ id: positiveCoercedInt });

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
