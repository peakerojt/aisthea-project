import { createReturnRequestSchema, refundSchema } from '../validators/return-request.validator';

describe('return-request.validator', () => {
  it('validates create payload', () => {
    const parsed = createReturnRequestSchema.safeParse({
      orderId: 1,
      reason: 'DEFECTIVE',
      note: '  <b>broken</b>  ',
      items: [{ orderItemId: 11, quantity: 1 }],
      attachments: ['https://img.test/1.jpg'],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.note).toBe('bbroken/b');
    }
  });

  it('rejects duplicate orderItemId', () => {
    const parsed = createReturnRequestSchema.safeParse({
      orderId: 1,
      reason: 'OTHER',
      items: [
        { orderItemId: 11, quantity: 1 },
        { orderItemId: 11, quantity: 1 },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects attachments > 5', () => {
    const parsed = createReturnRequestSchema.safeParse({
      orderId: 1,
      reason: 'OTHER',
      items: [{ orderItemId: 11, quantity: 1 }],
      attachments: ['1', '2', '3', '4', '5', '6'],
    });

    expect(parsed.success).toBe(false);
  });

  it('validates refund payload', () => {
    const parsed = refundSchema.safeParse({
      method: 'ORIGINAL_PAYMENT',
      idempotencyKey: 'idem-key-123',
      amount: 10000,
    });

    expect(parsed.success).toBe(true);
  });
});
