import {
  createReturnRequestSchema,
  idParamSchema,
  listAdminReturnsSchema,
  refundSchema,
  rejectSchema,
} from '../validators/request.validator';

describe('return request validator', () => {
  it('sanitizes note and reject reason text', () => {
    const createParsed = createReturnRequestSchema.parse({
      orderId: 12,
      requestNote: '  <broken> zipper  ',
      items: [{ orderItemId: 55, quantity: 1, reasonCode: 'DEFECTIVE' }],
      attachments: ['https://example.com/proof-1.jpg'],
    });

    const rejectParsed = rejectSchema.parse({
      reason: '  <not eligible>  ',
    });

    expect(createParsed.note).toBe('broken zipper');
    expect(createParsed.reason).toBe('DEFECTIVE');
    expect(createParsed.items[0].reason).toBe('DEFECTIVE');
    expect(rejectParsed.reason).toBe('not eligible');
  });

  it('rejects duplicate orderItemId entries in create payload items', () => {
    const parsed = createReturnRequestSchema.safeParse({
      orderId: 12,
      reason: 'WRONG_ITEM',
      items: [
        { orderItemId: 55, quantity: 1, reasonCode: 'WRONG_ITEM' },
        { orderItemId: 55, quantity: 2, reasonCode: 'WRONG_ITEM' },
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
        items: [{ orderItemId: 55, quantity: 1, reasonCode: 'OTHER' }],
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

  it('accepts canonical item-level reasonCode and requestNote payloads', () => {
    const parsed = createReturnRequestSchema.parse({
      orderId: 77,
      requestNote: '  <please review>  ',
      items: [
        {
          orderItemId: 88,
          quantity: 1,
          reasonCode: 'WRONG_ITEM',
          reasonText: '  <received blue instead of black>  ',
          attachments: [{ url: 'https://example.com/item-88.jpg', type: 'image' }],
        },
      ],
    });

    expect(parsed).toEqual({
      orderId: 77,
      reason: 'WRONG_ITEM',
      note: 'please review\nItem 88: received blue instead of black',
      items: [
        {
          orderItemId: 88,
          quantity: 1,
          reason: 'WRONG_ITEM',
          reasonText: 'received blue instead of black',
          attachments: ['https://example.com/item-88.jpg'],
        },
      ],
      attachments: ['https://example.com/item-88.jpg'],
    });
  });

  it('preserves top-level request attachments separately from item-level attachments', () => {
    const parsed = createReturnRequestSchema.parse({
      orderId: 90,
      attachments: ['https://example.com/request-proof.jpg'],
      items: [
        {
          orderItemId: 12,
          quantity: 1,
          reasonCode: 'DEFECTIVE',
          attachments: ['https://example.com/item-proof.jpg'],
        },
      ],
    });

    expect(parsed.requestAttachments).toEqual(['https://example.com/request-proof.jpg']);
    expect(parsed.attachments).toEqual([
      'https://example.com/request-proof.jpg',
      'https://example.com/item-proof.jpg',
    ]);
    expect(parsed.items[0].attachments).toEqual(['https://example.com/item-proof.jpg']);
  });

  it('rejects canonical payloads when an item reasonCode is omitted', () => {
    const parsed = createReturnRequestSchema.safeParse({
      orderId: 44,
      reason: 'WRONG_ITEM',
      items: [{ orderItemId: 9, quantity: 1 }],
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error('Expected missing item reason validation to fail');
    }

    expect(parsed.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Each return item must include an explicit reasonCode',
          path: ['items', 0, 'reasonCode'],
        }),
      ]),
    );
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
