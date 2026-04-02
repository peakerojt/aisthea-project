import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/common/services/return.summary.service');

const returnApiMock = vi.hoisted(() => ({
  getMyReturns: vi.fn(),
}));

vi.mock('@/common/api/return.api', () => ({
  returnApi: returnApiMock,
}));

let returnSummaryService: typeof import('@/common/services/return.summary.service').returnSummaryService;

describe('returnSummaryService', () => {
  beforeAll(async () => {
    ({ returnSummaryService } = await import('@/common/services/return.summary.service'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
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
            refundableCapAmount: '80000',
            updatedAt: '2026-03-26T10:20:00.000Z',
            financeNote: 'Bộ phận hoàn tiền đang đối soát lại giao dịch.',
            financeNoteUpdatedAt: '2026-03-26T10:15:00.000Z',
            financeNoteUpdatedBy: { fullName: 'Bộ phận hỗ trợ' },
            totalRefundAmount: '99000',
            economicsSummary: {
              totalGrossAmount: '100000',
              totalDiscountAmount: '20000',
              totalNetPaidAmount: '80000',
              totalRequestedRefundAmount: '80000',
              hasSnapshotBreakdown: true,
            },
            createdAt: '2026-03-26T09:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
      },
    });

    const result = await returnSummaryService.myReturnSummaries(1, 100, { orderIds: [301] });

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
        refundableCapAmount: '80000',
        updatedAt: '2026-03-26T10:20:00.000Z',
        financeNote: 'Bộ phận hoàn tiền đang đối soát lại giao dịch.',
        financeNoteUpdatedAt: '2026-03-26T10:15:00.000Z',
        financeNoteUpdatedBy: { fullName: 'Bộ phận hỗ trợ' },
        economicsSummary: {
          totalGrossAmount: '100000',
          totalDiscountAmount: '20000',
          totalNetPaidAmount: '80000',
          totalRequestedRefundAmount: '80000',
          hasSnapshotBreakdown: true,
        },
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

    await returnSummaryService.myReturnSummaries(1, 50, {
      orderIds: [301],
      updatedSince: '2026-03-26T12:00:00.000Z',
    });

    expect(returnApiMock.getMyReturns).toHaveBeenCalledWith(1, 50, {
      view: 'summary',
      orderIds: [301],
      updatedSince: '2026-03-26T12:00:00.000Z',
    });
  });

  it('derives REFUNDED from refundableCapAmount when legacy totalRefundAmount is higher', async () => {
    returnApiMock.getMyReturns.mockResolvedValueOnce({
      data: {
        data: [
          {
            returnRequestId: 22,
            orderId: 302,
            status: 'ACCEPTED_FOR_REFUND',
            totalRefundAmount: '150000',
            refundableCapAmount: '80000',
            refundTransactions: [{ amount: 80000, status: 'COMPLETED' }],
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    });

    const result = await returnSummaryService.myReturnSummaries(1, 20, { orderIds: [302] });

    expect(result[0]).toEqual(
      expect.objectContaining({
        returnRequestId: 22,
        refundableCapAmount: '80000',
        refundStatus: 'REFUNDED',
      }),
    );
  });

  it('prefers server-provided statusBucket over client fallback derivation', async () => {
    returnApiMock.getMyReturns.mockResolvedValueOnce({
      data: {
        data: [
          {
            returnRequestId: 23,
            orderId: 303,
            status: 'ACCEPTED_FOR_REFUND',
            workflowStatus: 'ACCEPTED_FOR_REFUND',
            statusBucket: 'REQUESTED',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    });

    const result = await returnSummaryService.myReturnSummaries(1, 20);

    expect(result[0]).toEqual(
      expect.objectContaining({
        returnRequestId: 23,
        statusBucket: 'REQUESTED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
      }),
    );
  });

  it('canonicalizes fallback workflowStatus for legacy summary statuses when the server omits workflowStatus', async () => {
    returnApiMock.getMyReturns.mockResolvedValueOnce({
      data: {
        data: [
          {
            returnRequestId: 24,
            orderId: 304,
            status: 'PENDING_APPROVAL',
          },
          {
            returnRequestId: 25,
            orderId: 305,
            status: 'completed',
          },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    });

    const result = await returnSummaryService.myReturnSummaries(1, 20);

    expect(result.map((item) => item.workflowStatus)).toEqual([
      'PENDING_ADMIN_REVIEW',
      'CLOSED',
    ]);
  });
});
