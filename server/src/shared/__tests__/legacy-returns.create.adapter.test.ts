import {
  buildLegacyCreateReturnDraft,
  normalizeLegacyReturnReason,
} from '../legacy-returns.create.adapter';

describe('legacy-returns.create.adapter', () => {
  it('keeps direct enum reasons when building a conservative draft', () => {
    const result = buildLegacyCreateReturnDraft(
      {
        orderId: 91,
        items: [{ orderItemId: 201, quantity: 2 }],
      },
      'DEFECTIVE',
      ['https://example.com/proof-91.jpg'],
    );

    expect(result).toEqual({
      orderId: 91,
      reason: 'DEFECTIVE',
      note: 'DEFECTIVE',
      items: [{ orderItemId: 201, quantity: 2 }],
      attachments: ['https://example.com/proof-91.jpg'],
    });
  });

  it('maps free-text reasons into the closest return-request enum and preserves the original note', () => {
    const result = buildLegacyCreateReturnDraft(
      {
        orderId: 92,
        items: [{ orderItemId: 202, quantity: 1 }],
      },
      'Wrong item received from warehouse',
      ['https://example.com/proof-92.jpg', '   '],
    );

    expect(result).toEqual({
      orderId: 92,
      reason: 'WRONG_ITEM',
      note: 'Wrong item received from warehouse',
      items: [{ orderItemId: 202, quantity: 1 }],
      attachments: ['https://example.com/proof-92.jpg'],
    });
  });

  it('returns OTHER for unknown free-text reasons', () => {
    expect(normalizeLegacyReturnReason('Need support to review this case')).toBe('OTHER');
  });

  it('maps Vietnamese defect wording and trims the preserved note', () => {
    const result = buildLegacyCreateReturnDraft(
      {
        orderId: 92,
        items: [{ orderItemId: 205, quantity: 1 }],
      },
      '  Hàng bị hỏng khóa kéo  ',
      ['https://example.com/proof-92b.jpg'],
    );

    expect(result).toEqual({
      orderId: 92,
      reason: 'DEFECTIVE',
      note: 'Hàng bị hỏng khóa kéo',
      items: [{ orderItemId: 205, quantity: 1 }],
      attachments: ['https://example.com/proof-92b.jpg'],
    });
  });

  it('drops blank attachments and note content when the legacy reason is empty', () => {
    const result = buildLegacyCreateReturnDraft(
      {
        orderId: 94,
        items: [{ orderItemId: 206, quantity: 1 }],
      },
      '   ',
      ['   ', 'https://example.com/proof-94.jpg', ''],
    );

    expect(result).toEqual({
      orderId: 94,
      reason: 'OTHER',
      note: undefined,
      items: [{ orderItemId: 206, quantity: 1 }],
      attachments: ['https://example.com/proof-94.jpg'],
    });
  });

  it('returns null when the legacy request cannot be mapped safely because the order has multiple items', () => {
    const result = buildLegacyCreateReturnDraft(
      {
        orderId: 93,
        items: [
          { orderItemId: 203, quantity: 1 },
          { orderItemId: 204, quantity: 1 },
        ],
      },
      'Product damaged',
      [],
    );

    expect(result).toBeNull();
  });

  it('returns null when the single bridged item is invalid', () => {
    expect(
      buildLegacyCreateReturnDraft(
        {
          orderId: 95,
          items: [{ orderItemId: 0, quantity: 1 }],
        },
        'Product damaged',
        [],
      ),
    ).toBeNull();

    expect(
      buildLegacyCreateReturnDraft(
        {
          orderId: 96,
          items: [{ orderItemId: 207, quantity: 0 }],
        },
        'Product damaged',
        [],
      ),
    ).toBeNull();
  });
});
