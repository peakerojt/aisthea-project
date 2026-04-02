import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/common/services/return.service');

const returnApiMock = vi.hoisted(() => ({
  createReturnRequest: vi.fn(),
  getMyReturns: vi.fn(),
  getReturnForOrder: vi.fn(),
  getUserReturnDetail: vi.fn(),
}));

vi.mock('@/common/api/return.api', () => ({
  returnApi: returnApiMock,
}));

let returnService: typeof import('@/common/services/return.service').returnService;
let ReturnCustomerWriteError: typeof import('@/common/services/return.service').ReturnCustomerWriteError;

describe('returnService', () => {
  beforeAll(async () => {
    ({ returnService, ReturnCustomerWriteError } = await import('@/common/services/return.service'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes legacy requested and completed statuses in customer return queries', async () => {
    returnApiMock.getMyReturns.mockResolvedValueOnce({
      data: {
        data: [
          {
            returnRequestId: 1,
            orderId: 101,
            userId: 5,
            reason: 'DEFECTIVE',
            status: 'PENDING_APPROVAL',
            totalRefundAmount: '1000',
            createdAt: '2026-03-01T10:00:00.000Z',
          },
          {
            returnRequestId: 2,
            orderId: 102,
            userId: 5,
            reason: 'OTHER',
            status: ' completed ',
            totalRefundAmount: '2000',
            createdAt: '2026-03-02T10:00:00.000Z',
          },
        ],
        total: 2,
        page: 1,
        limit: 8,
        totalPages: 1,
      },
    });

    const result = await returnService.myReturns();

    expect(result.data.map((item) => item.status)).toEqual(['PENDING_APPROVAL', 'COMPLETED']);
    expect(result.data.map((item) => item.workflowStatus)).toEqual([
      'PENDING_ADMIN_REVIEW',
      'CLOSED',
    ]);
    expect(result.data.map((item) => item.statusBucket)).toEqual(['REQUESTED', 'REFUNDED']);
  });

  it('normalizes legacy statuses in modern create payload responses', async () => {
    returnApiMock.createReturnRequest.mockResolvedValueOnce({
      data: {
        returnRequestId: 15,
        orderId: 205,
        userId: 5,
        reason: 'OTHER',
        status: ' completed ',
        totalRefundAmount: '0',
        createdAt: '2026-03-05T10:00:00.000Z',
        items: [],
      },
    });

    const result = await returnService.create({
      orderId: 205,
      reason: 'OTHER',
      items: [{ orderItemId: 1, quantity: 1 }],
      attachments: [],
    });

    expect(result).toEqual(
      expect.objectContaining({
        returnRequestId: 15,
        status: 'COMPLETED',
        workflowStatus: 'CLOSED',
        statusBucket: 'REFUNDED',
      }),
    );
  });

  it('derives REFUNDED from refundableCapAmount in modern create payload responses', async () => {
    returnApiMock.createReturnRequest.mockResolvedValueOnce({
      data: {
        returnRequestId: 16,
        orderId: 206,
        userId: 5,
        reason: 'DAMAGED',
        status: 'completed',
        totalRefundAmount: '150000',
        refundableCapAmount: '80000',
        refundTransactions: [
          {
            amount: 80000,
            status: 'COMPLETED',
          },
        ],
        createdAt: '2026-03-06T10:00:00.000Z',
        items: [],
      },
    });

    const result = await returnService.create({
      orderId: 206,
      reason: 'DAMAGED',
      items: [{ orderItemId: 2, quantity: 1 }],
      attachments: [],
    });

    expect(result).toEqual(
      expect.objectContaining({
        returnRequestId: 16,
        refundStatus: 'REFUNDED',
      }),
    );
  });

  it('re-exports structured duplicate-create errors through the compatibility facade', async () => {
    returnApiMock.createReturnRequest.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: 'RETURN_ALREADY_EXISTS',
            message: 'This order already has an active return request',
            details: {
              returnRequestId: 901,
            },
          },
        },
      },
    });

    await expect(
      returnService.create({
        orderId: 207,
        reason: 'OTHER',
        items: [{ orderItemId: 3, quantity: 1 }],
        attachments: [],
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'ReturnCustomerWriteError',
        code: 'RETURN_ALREADY_EXISTS',
        existingReturnId: 901,
      }),
    );
    expect(ReturnCustomerWriteError).toBeDefined();
  });

  it('re-exports structured item-selection errors through the compatibility facade', async () => {
    returnApiMock.createReturnRequest.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: 'ITEM_SELECTION_REQUIRED',
            message: 'Select at least one order item to return',
          },
        },
      },
    });

    await expect(
      returnService.create({
        orderId: 208,
        reason: 'OTHER',
        items: [{ orderItemId: 3, quantity: 1 }],
        attachments: [],
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'ReturnCustomerWriteError',
        code: 'ITEM_SELECTION_REQUIRED',
        existingReturnId: undefined,
        message: 'Select at least one order item to return',
      }),
    );
  });

  it('normalizes refund transaction method aliases in customer return queries', async () => {
    returnApiMock.getMyReturns.mockResolvedValueOnce({
      data: {
        data: [
          {
            returnRequestId: 3,
            orderId: 103,
            userId: 5,
            reason: 'OTHER',
            status: 'ACCEPTED_FOR_REFUND',
            refundTransactions: [
              {
                amount: 80000,
                status: 'PROCESSING',
                method: 'store_wallet',
                transactionRef: 'RF-103',
              },
            ],
            createdAt: '2026-03-03T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 8,
        totalPages: 1,
      },
    });

    const result = await returnService.myReturns();

    expect(result.data[0].refundTransactions).toEqual([
      expect.objectContaining({
        amount: 80000,
        status: 'PROCESSING',
        method: 'WALLET_CREDIT',
        transactionRef: 'RF-103',
      }),
    ]);
  });

  it('normalizes legacy statuses in get-for-order payloads', async () => {
    returnApiMock.getReturnForOrder.mockResolvedValueOnce({
      data: {
        returnId: 14,
        orderId: 204,
        userId: 5,
        reason: 'OTHER',
        proofImages: [],
        status: ' completed ',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PENDING',
        adminNote: null,
        createdAt: '2026-03-04T10:00:00.000Z',
        updatedAt: '2026-03-04T10:10:00.000Z',
      },
    });

    const result = await returnService.getForOrder(204);

    expect(result).toEqual(
      expect.objectContaining({
        returnId: 14,
        status: 'COMPLETED',
        statusBucket: 'RECEIVED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PENDING',
      }),
    );
  });

  it('normalizes refund transaction method aliases in get-for-order payloads', async () => {
    returnApiMock.getReturnForOrder.mockResolvedValueOnce({
      data: {
        returnId: 16,
        orderId: 206,
        userId: 5,
        reason: 'OTHER',
        proofImages: [],
        status: 'ACCEPTED_FOR_REFUND',
        refundTransactions: [
          {
            amount: 80000,
            status: 'PROCESSING',
            method: 'original_gateway',
            transactionRef: 'RF-206',
          },
        ],
        adminNote: null,
        createdAt: '2026-03-04T10:00:00.000Z',
        updatedAt: '2026-03-04T10:10:00.000Z',
      },
    });

    const result = await returnService.getForOrder(206);

    expect(result?.refundTransactions).toEqual([
      expect.objectContaining({
        amount: 80000,
        status: 'PROCESSING',
        method: 'ORIGINAL_PAYMENT',
        transactionRef: 'RF-206',
      }),
    ]);
  });

  it('normalizes legacy statuses in customer return detail payloads', async () => {
    returnApiMock.getUserReturnDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 12,
        orderId: 202,
        userId: 5,
        reason: 'WRONG_ITEM',
        status: ' pending approval ',
        workflowStatus: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'MANUAL_REVIEW',
        totalRefundAmount: '5000',
        createdAt: '2026-03-03T10:00:00.000Z',
        attachments: [],
        refundTransactions: [],
        statusLogs: [
          {
            logId: 1,
            fromStatus: ' pending approval ',
            fromWorkflowStatus: 'PENDING_ADMIN_REVIEW',
            toStatus: 'completed',
            toWorkflowStatus: 'CLOSED',
            createdAt: '2026-03-03T10:10:00.000Z',
          },
        ],
      },
    });

    const result = await returnService.detail(12);

    expect(result.status).toBe('PENDING_APPROVAL');
    expect(result.statusBucket).toBe('REQUESTED');
    expect(result.workflowStatus).toBe('PENDING_ADMIN_REVIEW');
    expect(result.refundStatus).toBe('MANUAL_REVIEW');
    expect(result.statusLogs).toEqual([
      expect.objectContaining({
        fromStatus: 'REQUESTED',
        fromWorkflowStatus: 'PENDING_ADMIN_REVIEW',
        toStatus: 'REFUNDED',
        toWorkflowStatus: 'CLOSED',
      }),
    ]);
  });

  it('maps customer return summaries for storefront list use', async () => {
    returnApiMock.getMyReturns.mockResolvedValueOnce({
      data: {
        data: [
          {
            returnRequestId: 21,
            orderId: 301,
            userId: 5,
            reason: 'DEFECTIVE',
            status: ' accepted_for_refund ',
            workflowStatus: 'ACCEPTED_FOR_REFUND',
            refundStatus: ' failed ',
            updatedAt: '2026-03-26T10:20:00.000Z',
            financeNote: 'Bộ phận hoàn tiền đang đối soát lại giao dịch.',
            financeNoteUpdatedAt: '2026-03-26T10:15:00.000Z',
            financeNoteUpdatedBy: { fullName: 'Bộ phận hỗ trợ' },
            totalRefundAmount: '99000',
            createdAt: '2026-03-26T09:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
      },
    });

    const result = await returnService.myReturnSummaries(1, 100, { orderIds: [301] });

    expect(returnApiMock.getMyReturns).toHaveBeenCalledWith(1, 100, {
      view: 'summary',
      orderIds: [301],
    });
    expect(result).toEqual([
      {
        returnRequestId: 21,
        orderId: 301,
        statusBucket: 'RECEIVED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'FAILED',
        totalRefundAmount: '99000',
        refundableCapAmount: null,
        updatedAt: '2026-03-26T10:20:00.000Z',
        financeNote: 'Bộ phận hoàn tiền đang đối soát lại giao dịch.',
        financeNoteUpdatedAt: '2026-03-26T10:15:00.000Z',
        financeNoteUpdatedBy: { fullName: 'Bộ phận hỗ trợ' },
      },
    ]);
  });

  it('forwards updatedSince when requesting customer return summaries', async () => {
    returnApiMock.getMyReturns.mockResolvedValueOnce({
      data: {
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      },
    });

    await returnService.myReturnSummaries(1, 50, {
      orderIds: [301],
      updatedSince: '2026-03-26T12:00:00.000Z',
    });

    expect(returnApiMock.getMyReturns).toHaveBeenCalledWith(1, 50, {
      view: 'summary',
      orderIds: [301],
      updatedSince: '2026-03-26T12:00:00.000Z',
    });
  });

  it('derives LOCKED_UNTIL_PAYMENT_CONFIRMED for COD-gated return details', async () => {
    returnApiMock.getUserReturnDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 18,
        orderId: 208,
        userId: 5,
        reason: 'OTHER',
        status: 'PENDING_PAYMENT_CONFIRMATION',
        totalRefundAmount: '5000',
        createdAt: '2026-03-07T10:00:00.000Z',
        attachments: [],
        refundTransactions: [],
      },
    });

    const result = await returnService.detail(18);

    expect(result.refundStatus).toBe('LOCKED_UNTIL_PAYMENT_CONFIRMED');
  });

  it('derives PARTIALLY_REFUNDED when completed refunds do not cover total refund amount', async () => {
    returnApiMock.getUserReturnDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 19,
        orderId: 209,
        userId: 5,
        reason: 'OTHER',
        status: 'CLOSED',
        totalRefundAmount: '100000',
        createdAt: '2026-03-08T10:00:00.000Z',
        attachments: [],
        refundTransactions: [
          {
            refundTransactionId: 1,
            amount: 40000,
            method: 'ORIGINAL_PAYMENT',
            status: 'COMPLETED',
          },
        ],
      },
    });

    const result = await returnService.detail(19);

    expect(result.refundStatus).toBe('PARTIALLY_REFUNDED');
  });
});
