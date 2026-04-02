import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/common/services/return.order-read.service');

const returnApiMock = vi.hoisted(() => ({
  getReturnForOrder: vi.fn(),
}));

vi.mock('@/common/api/return.api', () => ({
  returnApi: returnApiMock,
}));

let returnOrderReadService: typeof import('@/common/services/return.order-read.service').returnOrderReadService;

describe('returnOrderReadService', () => {
  beforeAll(async () => {
    ({ returnOrderReadService } = await import('@/common/services/return.order-read.service'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
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

    const result = await returnOrderReadService.getForOrder(204);

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

  it('returns null when the order does not have a linked return', async () => {
    returnApiMock.getReturnForOrder.mockResolvedValueOnce({ data: null });

    await expect(returnOrderReadService.getForOrder(205)).resolves.toBeNull();
  });

  it('preserves raw legacy status while preferring canonical workflowStatus from the server', async () => {
    returnApiMock.getReturnForOrder.mockResolvedValueOnce({
      data: {
        returnId: 19,
        orderId: 209,
        userId: 5,
        reason: 'OTHER',
        proofImages: [],
        status: 'COMPLETED',
        workflowStatus: 'CLOSED',
        refundStatus: 'REFUNDED',
        createdAt: '2026-03-04T10:00:00.000Z',
        updatedAt: '2026-03-04T10:10:00.000Z',
      },
    });

    const result = await returnOrderReadService.getForOrder(209);

    expect(result).toEqual(
      expect.objectContaining({
        returnId: 19,
        status: 'COMPLETED',
        workflowStatus: 'CLOSED',
        statusBucket: 'REFUNDED',
        refundStatus: 'REFUNDED',
      }),
    );
  });

  it('canonicalizes legacy workflow fallback when the server omits workflowStatus', async () => {
    returnApiMock.getReturnForOrder.mockResolvedValueOnce({
      data: {
        returnId: 20,
        orderId: 210,
        userId: 5,
        reason: 'OTHER',
        proofImages: [],
        status: 'COMPLETED',
        refundStatus: 'REFUNDED',
        createdAt: '2026-03-04T10:00:00.000Z',
        updatedAt: '2026-03-04T10:10:00.000Z',
      },
    });

    const result = await returnOrderReadService.getForOrder(210);

    expect(result).toEqual(
      expect.objectContaining({
        returnId: 20,
        status: 'COMPLETED',
        workflowStatus: 'CLOSED',
        statusBucket: 'REFUNDED',
        refundStatus: 'REFUNDED',
      }),
    );
  });

  it('derives REFUNDED from refundableCapAmount when completed refunds match the capped amount', async () => {
    returnApiMock.getReturnForOrder.mockResolvedValueOnce({
      data: {
        returnId: 15,
        orderId: 205,
        userId: 5,
        reason: 'OTHER',
        proofImages: [],
        status: 'ACCEPTED_FOR_REFUND',
        totalRefundAmount: '150000',
        refundableCapAmount: '80000',
        refundTransactions: [{ amount: 80000, status: 'COMPLETED' }],
        createdAt: '2026-03-04T10:00:00.000Z',
        updatedAt: '2026-03-04T10:10:00.000Z',
      },
    });

    const result = await returnOrderReadService.getForOrder(205);

    expect(result).toEqual(
      expect.objectContaining({
        returnId: 15,
        refundableCapAmount: '80000',
        refundStatus: 'REFUNDED',
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
        createdAt: '2026-03-04T10:00:00.000Z',
        updatedAt: '2026-03-04T10:10:00.000Z',
      },
    });

    const result = await returnOrderReadService.getForOrder(206);

    expect(result?.refundTransactions).toEqual([
      expect.objectContaining({
        amount: 80000,
        status: 'PROCESSING',
        method: 'ORIGINAL_PAYMENT',
        transactionRef: 'RF-206',
      }),
    ]);
  });

  it('prefers server-provided statusBucket in get-for-order payloads', async () => {
    returnApiMock.getReturnForOrder.mockResolvedValueOnce({
      data: {
        returnId: 17,
        orderId: 207,
        userId: 5,
        reason: 'OTHER',
        proofImages: [],
        status: 'ACCEPTED_FOR_REFUND',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        statusBucket: 'REQUESTED',
        createdAt: '2026-03-04T10:00:00.000Z',
        updatedAt: '2026-03-04T10:10:00.000Z',
      },
    });

    const result = await returnOrderReadService.getForOrder(207);

    expect(result).toEqual(
      expect.objectContaining({
        returnId: 17,
        statusBucket: 'REQUESTED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
      }),
    );
  });

  it('preserves item-specific reasonText in get-for-order payloads', async () => {
    returnApiMock.getReturnForOrder.mockResolvedValueOnce({
      data: {
        returnId: 18,
        orderId: 208,
        userId: 5,
        reason: 'OTHER',
        proofImages: [],
        status: 'REQUESTED',
        createdAt: '2026-03-04T10:00:00.000Z',
        updatedAt: '2026-03-04T10:10:00.000Z',
        items: [
          {
            returnRequestItemId: 901,
            orderItemId: 501,
            quantity: 1,
            unitPrice: '80000',
            reason: 'OTHER',
            reasonText: 'Khuy ao bi sut',
          },
        ],
      },
    });

    const result = await returnOrderReadService.getForOrder(208);

    expect(result?.items).toEqual([
      expect.objectContaining({
        returnRequestItemId: 901,
        orderItemId: 501,
        reason: 'OTHER',
        reasonText: 'Khuy ao bi sut',
      }),
    ]);
  });
});
