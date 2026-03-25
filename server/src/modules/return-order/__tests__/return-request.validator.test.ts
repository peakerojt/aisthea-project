import {
  createReturnRequestSchema,
  idParamSchema,
  listAdminReturnsSchema,
  refundSchema,
  rejectSchema,
} from '../validators/return-request.validator';

describe('return request validator', () => {
  it('sanitizes note and reject reason text', () => {
    const createParsed = createReturnRequestSchema.parse({
      orderId: 12,
      reason: 'DEFECTIVE',
      note: '  <broken> zipper  ',
      items: [{ orderItemId: 55, quantity: 1 }],
      attachments: ['https://example.com/proof-1.jpg'],
    });

    const rejectParsed = rejectSchema.parse({
      reason: '  <not eligible>  ',
    });

    expect(createParsed.note).toBe('broken zipper');
    expect(rejectParsed.reason).toBe('not eligible');
  });

  it('rejects duplicate orderItemId entries in create payload items', () => {
    const parsed = createReturnRequestSchema.safeParse({
      orderId: 12,
      reason: 'WRONG_ITEM',
      items: [
        { orderItemId: 55, quantity: 1 },
        { orderItemId: 55, quantity: 2 },
      ],
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error('Expected duplicate orderItemId validation to fail');
    }

    expect(parsed.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Duplicate orderItemId in items',
          path: ['items', 1, 'orderItemId'],
        }),
      ]),
    );
  });

  it('enforces attachment and refund idempotency bounds', () => {
    expect(() =>
      createReturnRequestSchema.parse({
        orderId: 12,
        reason: 'OTHER',
        items: [{ orderItemId: 55, quantity: 1 }],
        attachments: [
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'https://example.com/3.jpg',
          'https://example.com/4.jpg',
          'https://example.com/5.jpg',
          'https://example.com/6.jpg',
        ],
      }),
    ).toThrow();

    expect(() =>
      refundSchema.parse({
        method: 'ORIGINAL_PAYMENT',
        idempotencyKey: 'short',
      }),
    ).toThrow();
  });

  it('coerces admin filters and param ids into typed values', () => {
    const filters = listAdminReturnsSchema.parse({
      status: 'RECEIVED',
      orderId: '55',
      customerId: '7',
      fromDate: '2026-03-01T00:00:00.000Z',
      toDate: '2026-03-10T00:00:00.000Z',
      page: '2',
      limit: '5',
    });

    expect(filters).toEqual({
      status: 'RECEIVED',
      orderId: 55,
      customerId: 7,
      fromDate: new Date('2026-03-01T00:00:00.000Z'),
      toDate: new Date('2026-03-10T00:00:00.000Z'),
      page: 2,
      limit: 5,
    });
    expect(idParamSchema.parse({ id: '42' })).toEqual({ id: 42 });
  });

  it('applies admin filter defaults when page and limit are omitted', () => {
    const parsed = listAdminReturnsSchema.parse({});

    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
  });
});
