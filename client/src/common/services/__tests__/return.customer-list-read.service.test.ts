import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/common/services/return.customer-list-read.service');

const returnApiMock = vi.hoisted(() => ({
  getMyReturns: vi.fn(),
}));

vi.mock('@/common/api/return.api', () => ({
  returnApi: returnApiMock,
}));

let returnCustomerListReadService: typeof import('@/common/services/return.customer-list-read.service').returnCustomerListReadService;

describe('returnCustomerListReadService', () => {
  beforeAll(async () => {
    ({ returnCustomerListReadService } = await import('@/common/services/return.customer-list-read.service'));
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

    const result = await returnCustomerListReadService.myReturns();

    expect(result.data.map((item) => item.status)).toEqual(['PENDING_APPROVAL', 'COMPLETED']);
    expect(result.data.map((item) => item.statusBucket)).toEqual(['REQUESTED', 'REFUNDED']);
  });

  it('derives REFUNDED from refundableCapAmount in customer return list payloads', async () => {
    returnApiMock.getMyReturns.mockResolvedValueOnce({
      data: {
        data: [
          {
            returnRequestId: 3,
            orderId: 103,
            userId: 5,
            reason: 'OTHER',
            status: 'ACCEPTED_FOR_REFUND',
            totalRefundAmount: '150000',
            refundableCapAmount: '80000',
            refundTransactions: [{ amount: 80000, status: 'COMPLETED' }],
            createdAt: '2026-03-03T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 8,
        totalPages: 1,
      },
    });

    const result = await returnCustomerListReadService.myReturns();

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        returnRequestId: 3,
        refundableCapAmount: '80000',
        refundStatus: 'REFUNDED',
      }),
    );
  });

  it('normalizes refund transaction method aliases in customer return list payloads', async () => {
    returnApiMock.getMyReturns.mockResolvedValueOnce({
      data: {
        data: [
          {
            returnRequestId: 4,
            orderId: 104,
            userId: 5,
            reason: 'OTHER',
            status: 'ACCEPTED_FOR_REFUND',
            refundTransactions: [
              {
                amount: 80000,
                status: 'PROCESSING',
                method: 'store_wallet',
                transactionRef: 'RF-104',
              },
            ],
            createdAt: '2026-03-04T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 8,
        totalPages: 1,
      },
    });

    const result = await returnCustomerListReadService.myReturns();

    expect(result.data[0].refundTransactions).toEqual([
      expect.objectContaining({
        amount: 80000,
        status: 'PROCESSING',
        method: 'WALLET_CREDIT',
        transactionRef: 'RF-104',
      }),
    ]);
  });

  it('prefers server-provided statusBucket in customer return list payloads', async () => {
    returnApiMock.getMyReturns.mockResolvedValueOnce({
      data: {
        data: [
          {
            returnRequestId: 5,
            orderId: 105,
            userId: 5,
            reason: 'OTHER',
            status: 'ACCEPTED_FOR_REFUND',
            workflowStatus: 'ACCEPTED_FOR_REFUND',
            statusBucket: 'REQUESTED',
            createdAt: '2026-03-05T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 8,
        totalPages: 1,
      },
    });

    const result = await returnCustomerListReadService.myReturns();

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        returnRequestId: 5,
        statusBucket: 'REQUESTED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
      }),
    );
  });
});
