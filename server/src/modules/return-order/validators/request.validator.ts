import { z } from 'zod';
import { RETURN_REFUND_METHODS, RETURN_REQUEST_STATUSES } from '../types';

const DUPLICATE_ORDER_ITEM_MESSAGE = 'Duplicate orderItemId in items';
const ITEM_REASON_REQUIRED_MESSAGE = 'Each return item must include an explicit reasonCode';
const TOO_MANY_ATTACHMENTS_MESSAGE = 'A maximum of 5 attachments is supported per return request';
const NOTE_TOO_LONG_MESSAGE = 'Combined request note and item reason text must be 500 characters or fewer';
const positiveInt = z.number().int().positive();
const positiveCoercedInt = z.coerce.number().int().positive();
const sanitizeText = (value: string) => value.replace(/[<>]/g, '').trim();
const sanitizedOptionalText = z.string().max(500).transform(sanitizeText).optional();
const sanitizedOptionalShortText = z.string().max(200).transform(sanitizeText).optional();
const sanitizeAttachmentUrl = (value: string) => value.trim();

export const ReturnReasonEnum = z.enum([
  'DEFECTIVE',
  'WRONG_ITEM',
  'SIZE_ISSUE',
  'CHANGED_MIND',
  'PRE_DELIVERY_CANCELLATION',
  'OTHER',
]);

export const RefundMethodEnum = z.enum(RETURN_REFUND_METHODS);

export const ReturnStatusEnum = z.enum(RETURN_REQUEST_STATUSES);
export type ReturnReason = z.infer<typeof ReturnReasonEnum>;

export type CreateReturnRequestItemDto = {
  orderItemId: number;
  quantity: number;
  reason: ReturnReason;
  reasonText?: string;
  attachments?: string[];
};

export type CreateReturnRequestDto = {
  orderId: number;
  reason: ReturnReason;
  note?: string;
  items: CreateReturnRequestItemDto[];
  attachments?: string[];
  requestAttachments?: string[];
};

const attachmentInputSchema = z
  .union([
    z.string().min(1),
    z.object({
      url: z.string().min(1),
      type: z.string().max(50).optional(),
    }),
  ])
  .transform((value) =>
    sanitizeAttachmentUrl(typeof value === 'string' ? value : value.url),
  )
  .refine((value) => value.length > 0, { message: 'Attachment URL is required' });

const createReturnRequestItemSchema = z.object({
  orderItemId: positiveInt,
  quantity: positiveInt,
  reason: ReturnReasonEnum.optional(),
  reasonCode: ReturnReasonEnum.optional(),
  reasonText: sanitizedOptionalShortText,
  attachments: z.array(attachmentInputSchema).optional(),
});

const buildCombinedNote = (
  baseNote: string | undefined,
  items: Array<{ orderItemId: number; reasonText?: string }>,
) => {
  const itemReasonNotes = items
    .filter((item) => item.reasonText)
    .map((item) => `Item ${item.orderItemId}: ${item.reasonText}`);
  const parts = [baseNote, ...itemReasonNotes].filter((value): value is string => Boolean(value));
  return parts.length ? parts.join('\n') : undefined;
};

export const createReturnRequestSchema: z.ZodType<CreateReturnRequestDto> = z
  .object({
    orderId: positiveInt,
    reason: ReturnReasonEnum.optional(),
    note: sanitizedOptionalText,
    requestNote: sanitizedOptionalText,
    items: z.array(createReturnRequestItemSchema).min(1),
    attachments: z.array(attachmentInputSchema).optional(),
  })
  .superRefine((payload, ctx) => {
    const ids = new Set<number>();
    payload.items.forEach((item, index) => {
      if (ids.has(item.orderItemId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: DUPLICATE_ORDER_ITEM_MESSAGE,
          path: ['items', index, 'orderItemId'],
        });
      }
      ids.add(item.orderItemId);

      const resolvedReason = item.reasonCode ?? item.reason;
      if (!resolvedReason) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: ITEM_REASON_REQUIRED_MESSAGE,
          path: ['items', index, 'reasonCode'],
        });
      }
    });

    const mergedAttachments = [
      ...(payload.attachments ?? []),
      ...payload.items.flatMap((item) => item.attachments ?? []),
    ].filter((value, index, all) => all.indexOf(value) === index);

    if (mergedAttachments.length > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: TOO_MANY_ATTACHMENTS_MESSAGE,
        path: ['attachments'],
      });
    }

    const combinedNote = buildCombinedNote(payload.requestNote ?? payload.note, payload.items);
    if (combinedNote && combinedNote.length > 500) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: NOTE_TOO_LONG_MESSAGE,
        path: ['requestNote'],
      });
    }
  })
  .transform((payload) => {
    const normalizedItems = payload.items.map((item) => ({
      orderItemId: item.orderItemId,
      quantity: item.quantity,
      reason: item.reasonCode ?? item.reason!,
      ...(item.reasonText ? { reasonText: item.reasonText } : {}),
      ...(item.attachments?.length ? { attachments: item.attachments } : {}),
    }));

    const distinctReasons = [...new Set(normalizedItems.map((item) => item.reason))];
    const mergedAttachments = [
      ...(payload.attachments ?? []),
      ...normalizedItems.flatMap((item) => item.attachments ?? []),
    ].filter((value, index, all) => all.indexOf(value) === index);

    return {
      orderId: payload.orderId,
      reason:
        payload.reason ??
        (distinctReasons.length === 1 ? distinctReasons[0] : 'OTHER'),
      items: normalizedItems,
      ...(payload.attachments?.length ? { requestAttachments: payload.attachments } : {}),
      ...(buildCombinedNote(payload.requestNote ?? payload.note, normalizedItems)
        ? { note: buildCombinedNote(payload.requestNote ?? payload.note, normalizedItems) }
        : {}),
      ...(mergedAttachments.length ? { attachments: mergedAttachments } : {}),
    };
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

const AdminRefundStatusEnum = z.enum([
  'PENDING',
  'PROCESSING',
  'FAILED',
  'MANUAL_REVIEW',
]);

export const refundStatusSchema = z.object({
  refundStatus: AdminRefundStatusEnum,
  comment: z.string().min(1).max(1000).transform(sanitizeText).optional(),
}).superRefine((payload, ctx) => {
  if (
    (payload.refundStatus === 'FAILED' || payload.refundStatus === 'MANUAL_REVIEW') &&
    !payload.comment
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A comment is required when refund status is FAILED or MANUAL_REVIEW',
      path: ['comment'],
    });
  }
});

export type ListAdminReturnsDto = z.infer<typeof listAdminReturnsSchema>;
export type RejectDto = z.infer<typeof rejectSchema>;
export type RefundDto = z.infer<typeof refundSchema>;
export type RefundStatusDto = z.infer<typeof refundStatusSchema>;
