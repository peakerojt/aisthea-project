import {
  buildLegacyCustomerReturnsPayload,
  mapReturnRequestAdminListToLegacy,
  mapReturnRequestDetailToLegacy,
  mapReturnRequestListItemToLegacy,
  mapLegacyRouteReturnListItem,
  parseLegacyProofImages,
  resolveLegacyRouteDetailData,
  resolveLegacyOrderReturnData,
  shouldFallbackToReturnRequestList,
} from '../legacy-return-read.adapter';

describe('legacy-return-read.adapter', () => {
  it('maps return-request detail records into the legacy detail shape', () => {
    const result = mapReturnRequestDetailToLegacy({
      returnRequestId: 71,
      orderId: 81,
      userId: 15,
      reason: 'WRONG_ITEM',
      status: 'REQUESTED',
      note: 'Original note',
      createdAt: '2026-03-20T09:00:00.000Z',
      updatedAt: '2026-03-21T10:00:00.000Z',
      attachments: [{ fileUrl: 'https://example.com/proof-71.jpg' }],
      statusLogs: [
        { comment: 'Customer created return request' },
        { comment: 'Support reviewed evidence' },
      ],
      order: {
        orderNumber: 'ORD-81',
        totalAmount: '420000',
        customerName: 'Nguyen Van C',
        customerPhone: '0922222222',
      },
      user: {
        userId: 15,
        fullName: 'Nguyen Van C',
        email: 'customer3@example.com',
        avatarUrl: null,
      },
    });

    expect(result).toEqual({
      returnId: 71,
      orderId: 81,
      userId: 15,
      reason: 'WRONG_ITEM',
      proofImages: ['https://example.com/proof-71.jpg'],
      status: 'REQUESTED',
      adminNote: 'Support reviewed evidence',
      createdAt: '2026-03-20T09:00:00.000Z',
      updatedAt: '2026-03-21T10:00:00.000Z',
      order: {
        orderNumber: 'ORD-81',
        totalAmount: '420000',
        customerName: 'Nguyen Van C',
        customerPhone: '0922222222',
      },
      user: {
        userId: 15,
        fullName: 'Nguyen Van C',
        email: 'customer3@example.com',
        avatarUrl: null,
      },
    });
  });

  it('maps return-request list items into the legacy list shape', () => {
    const result = mapReturnRequestListItemToLegacy({
      returnRequestId: 72,
      orderId: 82,
      userId: 16,
      reason: 'DEFECTIVE',
      status: 'APPROVED',
      note: 'Ready for warehouse',
      createdAt: '2026-03-22T09:00:00.000Z',
      attachments: [{ fileUrl: 'https://example.com/proof-72.jpg' }],
      order: {
        orderNumber: 'ORD-82',
        totalAmount: 510000,
        customerName: 'Nguyen Van D',
        customerPhone: '0933333333',
      },
      user: {
        userId: 16,
        fullName: 'Nguyen Van D',
        email: 'customer4@example.com',
        avatarUrl: 'https://example.com/avatar-72.jpg',
      },
    });

    expect(result).toEqual({
      returnId: 72,
      orderId: 82,
      userId: 16,
      reason: 'DEFECTIVE',
      proofImages: ['https://example.com/proof-72.jpg'],
      status: 'APPROVED',
      adminNote: 'Ready for warehouse',
      createdAt: '2026-03-22T09:00:00.000Z',
      updatedAt: '2026-03-22T09:00:00.000Z',
      order: {
        orderNumber: 'ORD-82',
        totalAmount: '510000',
        customerName: 'Nguyen Van D',
        customerPhone: '0933333333',
      },
      user: {
        userId: 16,
        fullName: 'Nguyen Van D',
        email: 'customer4@example.com',
        avatarUrl: 'https://example.com/avatar-72.jpg',
      },
    });
  });

  it('detects when an empty legacy list should fall back to return-request data', () => {
    expect(
      shouldFallbackToReturnRequestList({
        returns: [],
        pagination: { total: 0 },
      }),
    ).toBe(true);

    expect(
      shouldFallbackToReturnRequestList({
        returns: [{ returnId: 1 }],
        pagination: { total: 1 },
      }),
    ).toBe(false);
  });

  it('maps admin return-request list payloads into the legacy admin list shape', () => {
    const result = mapReturnRequestAdminListToLegacy({
      data: [
        {
          returnRequestId: 73,
          orderId: 83,
          userId: 17,
          reason: 'DEFECTIVE',
          status: 'REQUESTED',
          note: 'Needs review',
          createdAt: '2026-03-23T09:00:00.000Z',
          updatedAt: '2026-03-24T10:00:00.000Z',
          attachments: [{ fileUrl: 'https://example.com/proof-73.jpg' }],
          order: {
            orderNumber: 'ORD-83',
            totalAmount: '610000',
            customerName: 'Nguyen Van E',
            customerPhone: '0944444444',
          },
          user: {
            userId: 17,
            fullName: 'Nguyen Van E',
            email: 'customer5@example.com',
            avatarUrl: null,
          },
        },
      ],
      total: 1,
      page: 2,
      limit: 20,
      totalPages: 1,
    });

    expect(result).toEqual({
      returns: [
        {
          returnId: 73,
          orderId: 83,
          userId: 17,
          reason: 'DEFECTIVE',
          proofImages: ['https://example.com/proof-73.jpg'],
          status: 'REQUESTED',
          adminNote: 'Needs review',
          createdAt: '2026-03-23T09:00:00.000Z',
          updatedAt: '2026-03-24T10:00:00.000Z',
          order: {
            orderNumber: 'ORD-83',
            totalAmount: '610000',
            customerName: 'Nguyen Van E',
            customerPhone: '0944444444',
          },
          user: {
            userId: 17,
            fullName: 'Nguyen Van E',
            email: 'customer5@example.com',
            avatarUrl: null,
          },
        },
      ],
      pagination: {
        page: 2,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('parses legacy proof images from JSON strings and ignores invalid values', () => {
    expect(parseLegacyProofImages('["https://example.com/proof-1.jpg"]')).toEqual([
      'https://example.com/proof-1.jpg',
    ]);
    expect(parseLegacyProofImages('not-json')).toEqual([]);
    expect(parseLegacyProofImages(null)).toEqual([]);
  });

  it('maps legacy route list items with normalized proof images', () => {
    expect(
      mapLegacyRouteReturnListItem({
        returnId: 3,
        proofImages: '["https://example.com/proof-3.jpg"]',
      }),
    ).toEqual({
      returnId: 3,
      proofImages: ['https://example.com/proof-3.jpg'],
    });
  });

  it('builds customer return payloads from either legacy or fallback sources', () => {
    expect(
      buildLegacyCustomerReturnsPayload({
        legacyReturns: [
          {
            returnId: 1,
            userId: 7,
            proofImages: '["https://example.com/proof-1.jpg"]',
            order: { orderNumber: 'ORD-1', totalAmount: 120000 },
          },
        ],
        legacyTotal: 1,
        fallbackResult: null,
        page: 2,
        limit: 1,
      }),
    ).toEqual({
      returns: [
        {
          returnId: 1,
          userId: 7,
          proofImages: ['https://example.com/proof-1.jpg'],
          order: { orderNumber: 'ORD-1', totalAmount: 120000 },
        },
      ],
      pagination: {
        page: 2,
        pageSize: 1,
        total: 1,
        totalPages: 1,
      },
    });

    expect(
      buildLegacyCustomerReturnsPayload({
        legacyReturns: [],
        legacyTotal: 0,
        fallbackResult: {
          data: [
            {
              returnRequestId: 101,
              orderId: 500,
              userId: 7,
              reason: 'DEFECTIVE',
              status: 'REQUESTED',
              note: 'Need support review',
              createdAt: '2026-03-20T09:00:00.000Z',
              updatedAt: '2026-03-21T10:00:00.000Z',
              attachments: [{ fileUrl: 'https://example.com/proof-101.jpg' }],
              order: { orderNumber: 'ORD-500', totalAmount: '250000' },
            },
          ],
          total: 1,
          limit: 1,
        },
        page: 2,
        limit: 1,
      }),
    ).toEqual({
      returns: [
        {
          returnId: 101,
          orderId: 500,
          userId: 7,
          reason: 'DEFECTIVE',
          proofImages: ['https://example.com/proof-101.jpg'],
          status: 'REQUESTED',
          adminNote: 'Need support review',
          createdAt: '2026-03-20T09:00:00.000Z',
          updatedAt: '2026-03-21T10:00:00.000Z',
          order: {
            orderNumber: 'ORD-500',
            totalAmount: '250000',
            customerName: '',
            customerPhone: '',
          },
          user: null,
        },
      ],
      pagination: {
        page: 2,
        pageSize: 1,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('prefers legacy order return records and only falls back to return-request detail when needed', () => {
    expect(
      resolveLegacyOrderReturnData(
        {
          returnId: 55,
          orderId: 55,
          status: 'APPROVED',
          proofImages: ['https://example.com/proof-55.jpg'],
        },
        {
          returnRequestId: 99,
          orderId: 99,
        },
      ),
    ).toEqual({
      returnId: 55,
      orderId: 55,
      status: 'APPROVED',
      proofImages: ['https://example.com/proof-55.jpg'],
    });

    expect(
      resolveLegacyOrderReturnData(null, {
        returnRequestId: 74,
        orderId: 84,
        userId: 18,
        reason: 'WRONG_ITEM',
        status: 'REQUESTED',
        note: 'Original note',
        createdAt: '2026-03-20T09:00:00.000Z',
        updatedAt: '2026-03-21T10:00:00.000Z',
        attachments: [{ fileUrl: 'https://example.com/proof-74.jpg' }],
        statusLogs: [
          { comment: 'Customer created return request' },
          { comment: 'Support reviewed evidence' },
        ],
        order: {
          orderNumber: 'ORD-84',
          totalAmount: '120000',
          customerName: 'Nguyen Van F',
          customerPhone: '0955555555',
        },
        user: {
          userId: 18,
          fullName: 'Nguyen Van F',
          email: 'customer6@example.com',
          avatarUrl: null,
        },
      }),
    ).toEqual({
      returnId: 74,
      orderId: 84,
      userId: 18,
      reason: 'WRONG_ITEM',
      proofImages: ['https://example.com/proof-74.jpg'],
      status: 'REQUESTED',
      adminNote: 'Support reviewed evidence',
      createdAt: '2026-03-20T09:00:00.000Z',
      updatedAt: '2026-03-21T10:00:00.000Z',
      order: {
        orderNumber: 'ORD-84',
        totalAmount: '120000',
        customerName: 'Nguyen Van F',
        customerPhone: '0955555555',
      },
      user: {
        userId: 18,
        fullName: 'Nguyen Van F',
        email: 'customer6@example.com',
        avatarUrl: null,
      },
    });
  });

  it('normalizes route detail payloads with parsed proof images', () => {
    expect(
      resolveLegacyRouteDetailData(
        {
          returnId: 45,
          userId: 99,
          proofImages: '["https://example.com/proof-45.jpg"]',
        },
        null,
      ),
    ).toEqual({
      returnId: 45,
      userId: 99,
      proofImages: ['https://example.com/proof-45.jpg'],
    });

    expect(
      resolveLegacyRouteDetailData(null, {
        returnRequestId: 46,
        orderId: 46,
        userId: 99,
        reason: 'WRONG_ITEM',
        status: 'REQUESTED',
        note: 'Original note',
        createdAt: '2026-03-20T09:00:00.000Z',
        updatedAt: '2026-03-21T10:00:00.000Z',
        attachments: [{ fileUrl: 'https://example.com/proof-46.jpg' }],
        statusLogs: [
          { comment: 'Customer created return request' },
          { comment: 'Support reviewed evidence' },
        ],
        order: {
          orderNumber: 'ORD-46',
          totalAmount: '100000',
          customerName: 'A',
          customerPhone: '1',
        },
        user: {
          userId: 99,
          fullName: 'Owner',
          email: 'owner@example.com',
          avatarUrl: null,
        },
      }),
    ).toEqual({
      returnId: 46,
      orderId: 46,
      userId: 99,
      reason: 'WRONG_ITEM',
      proofImages: ['https://example.com/proof-46.jpg'],
      status: 'REQUESTED',
      adminNote: 'Support reviewed evidence',
      createdAt: '2026-03-20T09:00:00.000Z',
      updatedAt: '2026-03-21T10:00:00.000Z',
      order: {
        orderNumber: 'ORD-46',
        totalAmount: '100000',
        customerName: 'A',
        customerPhone: '1',
      },
      user: {
        userId: 99,
        fullName: 'Owner',
        email: 'owner@example.com',
        avatarUrl: null,
      },
    });
  });
});
