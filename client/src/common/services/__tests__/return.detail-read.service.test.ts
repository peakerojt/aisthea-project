import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/common/services/return.detail-read.service');

const returnApiMock = vi.hoisted(() => ({
  getUserReturnDetail: vi.fn(),
}));

vi.mock('@/common/api/return.api', () => ({
  returnApi: returnApiMock,
}));

let returnDetailReadService: typeof import('@/common/services/return.detail-read.service').returnDetailReadService;

describe('returnDetailReadService', () => {
  beforeAll(async () => {
    ({ returnDetailReadService } = await import('@/common/services/return.detail-read.service'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
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

    const result = await returnDetailReadService.detail(12);

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

  it('preserves persisted finance metadata on customer return detail payloads', async () => {
    returnApiMock.getUserReturnDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 18,
        orderId: 205,
        userId: 5,
        reason: 'OTHER',
        status: 'ACCEPTED_FOR_REFUND',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'MANUAL_REVIEW',
        financeNote: 'Finance team is reviewing the gateway response.',
        financeNoteUpdatedAt: '2026-03-26T11:00:00.000Z',
        financeNoteUpdatedBy: {
          userId: 45,
          fullName: 'Finance Reviewer',
        },
        totalRefundAmount: '8000',
        createdAt: '2026-03-03T10:00:00.000Z',
        attachments: [],
        refundTransactions: [],
        statusLogs: [],
      },
    });

    const result = await returnDetailReadService.detail(18);

    expect(result.financeNote).toBe('Finance team is reviewing the gateway response.');
    expect(result.financeNoteUpdatedAt).toBe('2026-03-26T11:00:00.000Z');
    expect(result.financeNoteUpdatedBy).toEqual({
      userId: 45,
      fullName: 'Finance Reviewer',
    });
  });

  it('derives REFUNDED from refundableCapAmount on detail payloads when legacy totalRefundAmount is higher', async () => {
    returnApiMock.getUserReturnDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 19,
        orderId: 206,
        userId: 5,
        reason: 'OTHER',
        status: 'ACCEPTED_FOR_REFUND',
        totalRefundAmount: '150000',
        refundableCapAmount: '80000',
        refundTransactions: [{ amount: 80000, status: 'COMPLETED' }],
        createdAt: '2026-03-03T10:00:00.000Z',
        attachments: [],
        statusLogs: [],
      },
    });

    const result = await returnDetailReadService.detail(19);

    expect(result).toEqual(
      expect.objectContaining({
        returnRequestId: 19,
        refundableCapAmount: '80000',
        refundStatus: 'REFUNDED',
      }),
    );
  });

  it('normalizes refund transaction methods from compatibility aliases on detail payloads', async () => {
    returnApiMock.getUserReturnDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 20,
        orderId: 207,
        userId: 5,
        reason: 'OTHER',
        status: 'ACCEPTED_FOR_REFUND',
        totalRefundAmount: '80000',
        createdAt: '2026-03-03T10:00:00.000Z',
        attachments: [],
        refundTransactions: [
          { amount: 80000, status: 'COMPLETED', method: 'ORIGINAL_GATEWAY' },
          { amount: 10000, status: 'PENDING', method: 'STORE_WALLET' },
          { amount: 5000, status: 'PENDING', method: 'BANK_TRANSFER' },
        ],
        statusLogs: [],
      },
    });

    const result = await returnDetailReadService.detail(20);

    expect(result.refundTransactions).toEqual([
      expect.objectContaining({ method: 'ORIGINAL_PAYMENT' }),
      expect.objectContaining({ method: 'WALLET_CREDIT' }),
      expect.objectContaining({ method: 'BANK_TRANSFER' }),
    ]);
  });

  it('prefers server-provided statusBucket in detail payloads', async () => {
    returnApiMock.getUserReturnDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 21,
        orderId: 208,
        userId: 5,
        reason: 'OTHER',
        status: 'ACCEPTED_FOR_REFUND',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        statusBucket: 'REQUESTED',
        createdAt: '2026-03-03T10:00:00.000Z',
        attachments: [],
        refundTransactions: [],
        statusLogs: [],
      },
    });

    const result = await returnDetailReadService.detail(21);

    expect(result).toEqual(
      expect.objectContaining({
        returnRequestId: 21,
        statusBucket: 'REQUESTED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
      }),
    );
  });

  it('canonicalizes fallback workflowStatus for legacy detail statuses when the server omits workflowStatus', async () => {
    returnApiMock.getUserReturnDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 23,
        orderId: 210,
        userId: 5,
        reason: 'OTHER',
        status: 'completed',
        createdAt: '2026-03-03T10:00:00.000Z',
        attachments: [],
        refundTransactions: [],
        statusLogs: [],
      },
    });

    const result = await returnDetailReadService.detail(23);

    expect(result.workflowStatus).toBe('CLOSED');
    expect(result.status).toBe('COMPLETED');
  });

  it('preserves item-specific reasonText in customer return detail payloads', async () => {
    returnApiMock.getUserReturnDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 22,
        orderId: 209,
        userId: 5,
        reason: 'OTHER',
        status: 'REQUESTED',
        createdAt: '2026-03-03T10:00:00.000Z',
        attachments: [],
        refundTransactions: [],
        statusLogs: [],
        items: [
          {
            returnRequestItemId: 902,
            orderItemId: 502,
            quantity: 1,
            unitPrice: '80000',
            reason: 'OTHER',
            reasonText: 'Mau sac khong giong hinh',
          },
        ],
      },
    });

    const result = await returnDetailReadService.detail(22);

    expect(result.items).toEqual([
      expect.objectContaining({
        returnRequestItemId: 902,
        orderItemId: 502,
        reason: 'OTHER',
        reasonText: 'Mau sac khong giong hinh',
      }),
    ]);
  });
});
