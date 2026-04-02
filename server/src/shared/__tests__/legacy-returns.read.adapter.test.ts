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
} from '../legacy-returns.read.adapter';

describe('legacy-returns.read.adapter', () => {
  it('maps return-request detail records into the legacy detail shape', () => {
    const result = mapReturnRequestDetailToLegacy({
      returnRequestId: 71,
      orderId: 81,
      userId: 15,
      reason: 'WRONG_ITEM',
      status: 'REQUESTED',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'MANUAL_REVIEW',
      totalRefundAmount: '150000',
      refundableCapAmount: '80000',
      economicsSummary: {
        totalGrossAmount: 200000,
        totalDiscountAmount: 50000,
        totalNetPaidAmount: 150000,
      },
      financeNote: 'Finance is reconciling the final settled amount.',
      financeNoteUpdatedAt: '2026-03-21T11:00:00.000Z',
      financeNoteUpdatedBy: {
        userId: 45,
        fullName: 'Finance Ops',
      },
      refundTransactions: [
        {
          transactionId: 77,
          amount: '80000',
          method: 'ORIGINAL_PAYMENT',
          status: 'COMPLETED',
          transactionRef: 'RF-77',
        },
      ],
      note: 'Original note',
      createdAt: '2026-03-20T09:00:00.000Z',
      updatedAt: '2026-03-21T10:00:00.000Z',
      attachments: [{ fileUrl: 'https://example.com/proof-71.jpg' }],
      items: [
        {
          returnRequestItemId: 901,
          orderItemId: 501,
          quantity: 1,
          unitPrice: '80000',
          requestedRefundAmount: '80000',
          orderItemGrossAmount: '100000',
          orderItemAllocatedDiscountAmount: '20000',
          orderItemNetPaidAmount: '80000',
          reason: 'WRONG_ITEM',
          reasonText: null,
          attachments: [
            {
              attachmentId: 8,
              returnRequestItemId: 901,
              fileUrl: 'https://example.com/item-proof-71.jpg',
            },
          ],
          orderItem: {
            orderItemId: 501,
            productName: 'Ao so mi',
          },
        },
      ],
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
      statusBucket: 'REQUESTED',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'MANUAL_REVIEW',
      totalRefundAmount: '150000',
      refundableCapAmount: '80000',
      economicsSummary: {
        totalGrossAmount: 200000,
        totalDiscountAmount: 50000,
        totalNetPaidAmount: 150000,
      },
      financeNote: 'Finance is reconciling the final settled amount.',
      financeNoteUpdatedAt: '2026-03-21T11:00:00.000Z',
      financeNoteUpdatedBy: {
        userId: 45,
        fullName: 'Finance Ops',
      },
      refundTransactions: [
        {
          transactionId: 77,
          refundTransactionId: 77,
          amount: '80000',
          method: 'ORIGINAL_PAYMENT',
          status: 'COMPLETED',
          transactionRef: 'RF-77',
        },
      ],
      items: [
        {
          returnRequestItemId: 901,
          orderItemId: 501,
          quantity: 1,
          unitPrice: '80000',
          requestedRefundAmount: '80000',
          orderItemGrossAmount: '100000',
          orderItemAllocatedDiscountAmount: '20000',
          orderItemNetPaidAmount: '80000',
          reason: 'WRONG_ITEM',
          reasonText: null,
          attachments: [
            {
              attachmentId: 8,
              returnRequestItemId: 901,
              fileUrl: 'https://example.com/item-proof-71.jpg',
            },
          ],
          orderItem: {
            orderItemId: 501,
            productName: 'Ao so mi',
          },
        },
      ],
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
      workflowStatus: 'IN_RETURN_TRANSIT',
      refundStatus: 'PENDING',
      totalRefundAmount: '150000',
      refundableCapAmount: '80000',
      economicsSummary: {
        totalGrossAmount: 200000,
        totalDiscountAmount: 50000,
        totalNetPaidAmount: 150000,
      },
      financeNote: 'Expected refund reduced to item net-paid cap.',
      refundTransactions: [
        {
          refundTransactionId: 88,
          amount: '80000',
          method: 'WALLET_CREDIT',
          status: 'PROCESSING',
          transactionRef: 'RF-88',
        },
      ],
      note: 'Ready for warehouse',
      createdAt: '2026-03-22T09:00:00.000Z',
      attachments: [{ fileUrl: 'https://example.com/proof-72.jpg' }],
      items: [
        {
          returnRequestItemId: 902,
          orderItemId: 502,
          quantity: 1,
          unitPrice: '80000',
          requestedRefundAmount: '80000',
          orderItemGrossAmount: '100000',
          orderItemAllocatedDiscountAmount: '20000',
          orderItemNetPaidAmount: '80000',
        },
      ],
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
      statusBucket: 'APPROVED',
      workflowStatus: 'IN_RETURN_TRANSIT',
      refundStatus: 'PENDING',
      totalRefundAmount: '150000',
      refundableCapAmount: '80000',
      economicsSummary: {
        totalGrossAmount: 200000,
        totalDiscountAmount: 50000,
        totalNetPaidAmount: 150000,
      },
      financeNote: 'Expected refund reduced to item net-paid cap.',
      financeNoteUpdatedAt: null,
      financeNoteUpdatedBy: null,
      refundTransactions: [
        {
          transactionId: 88,
          refundTransactionId: 88,
          amount: '80000',
          method: 'WALLET_CREDIT',
          status: 'PROCESSING',
          transactionRef: 'RF-88',
        },
      ],
      items: [
        {
          returnRequestItemId: 902,
          orderItemId: 502,
          quantity: 1,
          unitPrice: '80000',
          requestedRefundAmount: '80000',
          orderItemGrossAmount: '100000',
          orderItemAllocatedDiscountAmount: '20000',
          orderItemNetPaidAmount: '80000',
          reason: null,
          reasonText: null,
        },
      ],
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
          statusBucket: 'REQUESTED',
          workflowStatus: 'REQUESTED',
          refundStatus: 'NOT_APPLICABLE',
          totalRefundAmount: null,
          refundableCapAmount: null,
          financeNote: null,
          financeNoteUpdatedAt: null,
          financeNoteUpdatedBy: null,
          items: undefined,
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

  it('preserves item-specific reasonText when mapping modern return-request detail into legacy shape', () => {
    const result = mapReturnRequestDetailToLegacy({
      returnRequestId: 801,
      orderId: 901,
      userId: 15,
      reason: 'WRONG_ITEM',
      status: 'REQUESTED',
      items: [
        {
          returnRequestItemId: 9901,
          orderItemId: 501,
          quantity: 1,
          unitPrice: '80000',
          reason: 'WRONG_ITEM',
          reasonText: 'received wrong size and wrong color',
        },
      ],
      attachments: [],
      statusLogs: [],
    });

    expect(result).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            returnRequestItemId: 9901,
            orderItemId: 501,
            reason: 'WRONG_ITEM',
            reasonText: 'received wrong size and wrong color',
          }),
        ],
      }),
    );
  });

  it('maps legacy route list items with normalized proof images', () => {
    expect(
      mapLegacyRouteReturnListItem({
        returnId: 3,
        proofImages: '["https://example.com/proof-3.jpg"]',
        status: 'COMPLETED',
        refundTransactions: [
          {
            refundTransactionId: 303,
            amount: '80000',
            method: 'ORIGINAL_PAYMENT',
            status: 'COMPLETED',
            transactionRef: 'RF-303',
          },
        ],
      }),
    ).toEqual({
      returnId: 3,
      proofImages: ['https://example.com/proof-3.jpg'],
      status: 'COMPLETED',
      statusBucket: 'REFUNDED',
      workflowStatus: 'CLOSED',
      refundStatus: 'REFUNDED',
      refundTransactions: [
        {
          transactionId: 303,
          refundTransactionId: 303,
          amount: '80000',
          method: 'ORIGINAL_PAYMENT',
          status: 'COMPLETED',
          transactionRef: 'RF-303',
        },
      ],
    });
  });

  it('merges modern economics metadata into legacy admin list payloads when matching orders exist', () => {
    const result = mapReturnRequestAdminListToLegacy(
      {
        data: [
          {
            returnRequestId: 73,
            orderId: 83,
            workflowStatus: 'IN_RETURN_TRANSIT',
            refundStatus: 'PROCESSING',
            totalRefundAmount: '150000',
          refundableCapAmount: '80000',
          financeNote: 'Finance is reconciling the gateway response',
          financeNoteUpdatedAt: '2026-03-24T12:00:00.000Z',
          financeNoteUpdatedBy: 'finance@example.com',
          refundTransactions: [
            {
              refundTransactionId: 9701,
              amount: '80000',
              method: 'ORIGINAL_PAYMENT',
              status: 'PROCESSING',
              transactionRef: 'RF-9701',
            },
          ],
          attachments: [{ fileUrl: 'https://example.com/proof-73-modern.jpg' }],
          items: [
              {
                returnRequestItemId: 970,
                orderItemId: 570,
                quantity: 1,
                unitPrice: '80000',
                requestedRefundAmount: '80000',
                orderItemGrossAmount: '100000',
                orderItemAllocatedDiscountAmount: '20000',
                orderItemNetPaidAmount: '80000',
              },
            ],
          },
        ],
        total: 1,
        page: 2,
        limit: 20,
        totalPages: 1,
      },
      {
        returns: [
          {
            returnId: 73,
            orderId: 83,
            userId: 17,
            reason: 'DEFECTIVE',
            proofImages: ['https://example.com/proof-73.jpg'],
            status: 'APPROVED',
            workflowStatus: 'APPROVED',
            refundStatus: 'NOT_APPLICABLE',
          },
        ],
        pagination: {
          page: 2,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      },
    );

    expect(result).toEqual({
      returns: [
        {
          returnId: 73,
          orderId: 83,
          userId: 17,
          reason: 'DEFECTIVE',
          proofImages: ['https://example.com/proof-73.jpg'],
          status: 'APPROVED',
          statusBucket: 'APPROVED',
          workflowStatus: 'IN_RETURN_TRANSIT',
          refundStatus: 'PROCESSING',
          totalRefundAmount: '150000',
          refundableCapAmount: '80000',
          financeNote: 'Finance is reconciling the gateway response',
          financeNoteUpdatedAt: '2026-03-24T12:00:00.000Z',
          financeNoteUpdatedBy: 'finance@example.com',
          createdAt: undefined,
          refundTransactions: [
            {
              transactionId: 9701,
              refundTransactionId: 9701,
              amount: '80000',
              method: 'ORIGINAL_PAYMENT',
              status: 'PROCESSING',
              transactionRef: 'RF-9701',
            },
          ],
          items: [
            {
              returnRequestItemId: 970,
              orderItemId: 570,
              quantity: 1,
              unitPrice: '80000',
              requestedRefundAmount: '80000',
              orderItemGrossAmount: '100000',
              orderItemAllocatedDiscountAmount: '20000',
              orderItemNetPaidAmount: '80000',
              reason: null,
              reasonText: null,
            },
          ],
          adminNote: null,
          order: undefined,
          updatedAt: undefined,
          user: null,
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

  it('builds customer return payloads from either legacy or fallback sources', () => {
    expect(
      buildLegacyCustomerReturnsPayload({
        legacyReturns: [
          {
            returnId: 1,
            orderId: 500,
            userId: 7,
            proofImages: '["https://example.com/proof-1.jpg"]',
            order: { orderNumber: 'ORD-1', totalAmount: 120000 },
          },
        ],
        legacyTotal: 1,
        fallbackResult: {
          data: [
            {
              returnRequestId: 101,
              orderId: 500,
              workflowStatus: 'IN_RETURN_TRANSIT',
              refundStatus: 'PROCESSING',
              totalRefundAmount: '150000',
              refundableCapAmount: '80000',
              financeNote: 'Finance is reconciling the gateway response',
              financeNoteUpdatedAt: '2026-03-24T12:00:00.000Z',
              financeNoteUpdatedBy: 'finance@example.com',
              refundTransactions: [
                {
                  refundTransactionId: 9101,
                  amount: '80000',
                  method: 'WALLET_CREDIT',
                  status: 'PROCESSING',
                  transactionRef: 'RF-9101',
                },
              ],
              attachments: [{ fileUrl: 'https://example.com/proof-101.jpg' }],
              items: [
                {
                  returnRequestItemId: 910,
                  orderItemId: 510,
                  quantity: 1,
                  unitPrice: '80000',
                  requestedRefundAmount: '80000',
                  orderItemGrossAmount: '100000',
                  orderItemAllocatedDiscountAmount: '20000',
                  orderItemNetPaidAmount: '80000',
                },
              ],
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
          returnId: 1,
          orderId: 500,
          userId: 7,
          proofImages: ['https://example.com/proof-1.jpg'],
          statusBucket: 'APPROVED',
          workflowStatus: 'IN_RETURN_TRANSIT',
          refundStatus: 'PROCESSING',
          totalRefundAmount: '150000',
          refundableCapAmount: '80000',
          financeNote: 'Finance is reconciling the gateway response',
          financeNoteUpdatedAt: '2026-03-24T12:00:00.000Z',
          financeNoteUpdatedBy: 'finance@example.com',
          createdAt: undefined,
          refundTransactions: [
            {
              transactionId: 9101,
              refundTransactionId: 9101,
              amount: '80000',
              method: 'WALLET_CREDIT',
              status: 'PROCESSING',
              transactionRef: 'RF-9101',
            },
          ],
          items: [
            {
              returnRequestItemId: 910,
              orderItemId: 510,
              quantity: 1,
              unitPrice: '80000',
              requestedRefundAmount: '80000',
              orderItemGrossAmount: '100000',
              orderItemAllocatedDiscountAmount: '20000',
              orderItemNetPaidAmount: '80000',
              reason: null,
              reasonText: null,
            },
          ],
          reason: null,
          adminNote: null,
          order: { orderNumber: 'ORD-1', totalAmount: 120000 },
          updatedAt: undefined,
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
          statusBucket: 'REQUESTED',
          workflowStatus: 'REQUESTED',
          refundStatus: 'NOT_APPLICABLE',
          totalRefundAmount: null,
          refundableCapAmount: null,
          financeNote: null,
          financeNoteUpdatedAt: null,
          financeNoteUpdatedBy: null,
          items: undefined,
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

  it('merges modern economics and finance metadata into legacy order return records when available', () => {
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
          orderId: 55,
          workflowStatus: 'IN_RETURN_TRANSIT',
          refundStatus: 'PROCESSING',
          totalRefundAmount: '150000',
          refundableCapAmount: '80000',
          financeNote: 'Finance is reconciling the gateway response',
          financeNoteUpdatedAt: '2026-03-22T11:00:00.000Z',
          financeNoteUpdatedBy: 'finance@example.com',
          refundTransactions: [
            {
              refundTransactionId: 9901,
              amount: '80000',
              method: 'BANK_TRANSFER',
              status: 'PROCESSING',
              transactionRef: 'RF-9901',
            },
          ],
          items: [
            {
              returnRequestItemId: 901,
              orderItemId: 501,
              quantity: 1,
              unitPrice: '80000',
              requestedRefundAmount: '80000',
              orderItemGrossAmount: '100000',
              orderItemAllocatedDiscountAmount: '20000',
              orderItemNetPaidAmount: '80000',
            },
          ],
        },
      ),
    ).toEqual({
      returnId: 55,
      orderId: 55,
      status: 'APPROVED',
      proofImages: ['https://example.com/proof-55.jpg'],
      statusBucket: 'APPROVED',
      workflowStatus: 'IN_RETURN_TRANSIT',
      refundStatus: 'PROCESSING',
      userId: null,
      reason: null,
      totalRefundAmount: '150000',
      refundableCapAmount: '80000',
      financeNote: 'Finance is reconciling the gateway response',
      financeNoteUpdatedAt: '2026-03-22T11:00:00.000Z',
      financeNoteUpdatedBy: 'finance@example.com',
      createdAt: undefined,
      refundTransactions: [
        {
          transactionId: 9901,
          refundTransactionId: 9901,
          amount: '80000',
          method: 'BANK_TRANSFER',
          status: 'PROCESSING',
          transactionRef: 'RF-9901',
        },
      ],
      items: [
        {
          returnRequestItemId: 901,
          orderItemId: 501,
          quantity: 1,
          unitPrice: '80000',
          requestedRefundAmount: '80000',
          orderItemGrossAmount: '100000',
          orderItemAllocatedDiscountAmount: '20000',
          orderItemNetPaidAmount: '80000',
          reason: null,
          reasonText: null,
        },
      ],
      adminNote: null,
      order: undefined,
      updatedAt: undefined,
      user: null,
    });

    expect(
      resolveLegacyOrderReturnData(null, {
        returnRequestId: 74,
        orderId: 84,
        userId: 18,
        reason: 'WRONG_ITEM',
        status: 'REQUESTED',
        workflowStatus: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'MANUAL_REVIEW',
        totalRefundAmount: '150000',
        refundableCapAmount: '80000',
        note: 'Original note',
        refundTransactions: [
          {
            transactionId: 9902,
            amount: '80000',
            method: 'ORIGINAL_PAYMENT',
            status: 'COMPLETED',
            transactionRef: 'RF-9902',
          },
        ],
        createdAt: '2026-03-20T09:00:00.000Z',
        updatedAt: '2026-03-21T10:00:00.000Z',
        attachments: [{ fileUrl: 'https://example.com/proof-74.jpg' }],
        items: [
          {
            returnRequestItemId: 903,
            orderItemId: 503,
            quantity: 1,
            unitPrice: '80000',
            requestedRefundAmount: '80000',
            orderItemGrossAmount: '100000',
            orderItemAllocatedDiscountAmount: '20000',
            orderItemNetPaidAmount: '80000',
          },
        ],
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
      statusBucket: 'REQUESTED',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'MANUAL_REVIEW',
      totalRefundAmount: '150000',
      refundableCapAmount: '80000',
      financeNote: null,
      financeNoteUpdatedAt: null,
      financeNoteUpdatedBy: null,
      refundTransactions: [
        {
          transactionId: 9902,
          refundTransactionId: 9902,
          amount: '80000',
          method: 'ORIGINAL_PAYMENT',
          status: 'COMPLETED',
          transactionRef: 'RF-9902',
        },
      ],
      items: [
        {
          returnRequestItemId: 903,
          orderItemId: 503,
          quantity: 1,
          unitPrice: '80000',
          requestedRefundAmount: '80000',
          orderItemGrossAmount: '100000',
          orderItemAllocatedDiscountAmount: '20000',
          orderItemNetPaidAmount: '80000',
          reason: null,
          reasonText: null,
        },
      ],
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
          status: 'COMPLETED',
        },
        {
          returnRequestId: 145,
          orderId: 45,
          workflowStatus: 'IN_RETURN_TRANSIT',
          refundStatus: 'PROCESSING',
          totalRefundAmount: '150000',
          refundableCapAmount: '80000',
          financeNote: 'Finance is reconciling the gateway response',
          financeNoteUpdatedAt: '2026-03-24T12:00:00.000Z',
          financeNoteUpdatedBy: 'finance@example.com',
          refundTransactions: [
            {
              refundTransactionId: 9451,
              amount: '80000',
              method: 'ORIGINAL_PAYMENT',
              status: 'PROCESSING',
              transactionRef: 'RF-9451',
            },
          ],
          attachments: [{ fileUrl: 'https://example.com/proof-45-modern.jpg' }],
          items: [
            {
              returnRequestItemId: 945,
              orderItemId: 545,
              quantity: 1,
              unitPrice: '80000',
              requestedRefundAmount: '80000',
              orderItemGrossAmount: '100000',
              orderItemAllocatedDiscountAmount: '20000',
              orderItemNetPaidAmount: '80000',
            },
          ],
        },
      ),
    ).toEqual({
      returnId: 45,
      orderId: 45,
      userId: 99,
      proofImages: ['https://example.com/proof-45.jpg'],
      status: 'COMPLETED',
      statusBucket: 'APPROVED',
      workflowStatus: 'IN_RETURN_TRANSIT',
      refundStatus: 'PROCESSING',
      reason: null,
      totalRefundAmount: '150000',
      refundableCapAmount: '80000',
      financeNote: 'Finance is reconciling the gateway response',
      financeNoteUpdatedAt: '2026-03-24T12:00:00.000Z',
      financeNoteUpdatedBy: 'finance@example.com',
      createdAt: undefined,
      refundTransactions: [
        {
          transactionId: 9451,
          refundTransactionId: 9451,
          amount: '80000',
          method: 'ORIGINAL_PAYMENT',
          status: 'PROCESSING',
          transactionRef: 'RF-9451',
        },
      ],
      items: [
        {
          returnRequestItemId: 945,
          orderItemId: 545,
          quantity: 1,
          unitPrice: '80000',
          requestedRefundAmount: '80000',
          orderItemGrossAmount: '100000',
          orderItemAllocatedDiscountAmount: '20000',
          orderItemNetPaidAmount: '80000',
          reason: null,
          reasonText: null,
        },
      ],
      adminNote: null,
      order: undefined,
      updatedAt: undefined,
      user: null,
    });

    expect(
      resolveLegacyRouteDetailData(
        {
          returnId: 47,
          userId: 99,
          proofImages: '["https://example.com/proof-47.jpg"]',
          status: 'COMPLETED',
        },
        null,
      ),
    ).toEqual({
      returnId: 47,
      userId: 99,
      proofImages: ['https://example.com/proof-47.jpg'],
      status: 'COMPLETED',
      statusBucket: 'REFUNDED',
      workflowStatus: 'CLOSED',
      refundStatus: 'REFUNDED',
    });

    expect(
      resolveLegacyRouteDetailData(null, {
        returnRequestId: 46,
        orderId: 46,
        userId: 99,
        reason: 'WRONG_ITEM',
        status: 'REQUESTED',
        workflowStatus: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'MANUAL_REVIEW',
        totalRefundAmount: '150000',
        refundableCapAmount: '80000',
        note: 'Original note',
        refundTransactions: [
          {
            transactionId: 9461,
            amount: '80000',
            method: 'WALLET_CREDIT',
            status: 'COMPLETED',
            transactionRef: 'RF-9461',
          },
        ],
        createdAt: '2026-03-20T09:00:00.000Z',
        updatedAt: '2026-03-21T10:00:00.000Z',
        attachments: [{ fileUrl: 'https://example.com/proof-46.jpg' }],
        items: [
          {
            returnRequestItemId: 904,
            orderItemId: 504,
            quantity: 1,
            unitPrice: '80000',
            requestedRefundAmount: '80000',
            orderItemGrossAmount: '100000',
            orderItemAllocatedDiscountAmount: '20000',
            orderItemNetPaidAmount: '80000',
          },
        ],
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
      statusBucket: 'REQUESTED',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'MANUAL_REVIEW',
      totalRefundAmount: '150000',
      refundableCapAmount: '80000',
      financeNote: null,
      financeNoteUpdatedAt: null,
      financeNoteUpdatedBy: null,
      refundTransactions: [
        {
          transactionId: 9461,
          refundTransactionId: 9461,
          amount: '80000',
          method: 'WALLET_CREDIT',
          status: 'COMPLETED',
          transactionRef: 'RF-9461',
        },
      ],
      items: [
        {
          returnRequestItemId: 904,
          orderItemId: 504,
          quantity: 1,
          unitPrice: '80000',
          requestedRefundAmount: '80000',
          orderItemGrossAmount: '100000',
          orderItemAllocatedDiscountAmount: '20000',
          orderItemNetPaidAmount: '80000',
          reason: null,
          reasonText: null,
        },
      ],
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
