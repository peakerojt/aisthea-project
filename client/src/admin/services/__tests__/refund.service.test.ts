import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
}));

vi.mock('@/common/utils/api', () => ({
  api: apiMock,
}));

import {
  adminRefundService,
  getRemainingRefundableAmount,
  getSuccessfulRefundedAmount,
  getTotalCollectedAmount,
  getRefundProcessingState,
  getProcessingRefund,
  normalizeRefundStatus,
} from '@/admin/services/refund.service';

describe('refund.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes refund statuses for admin refund UI consumers', () => {
    expect(normalizeRefundStatus(' success ')).toBe('SUCCESS');
    expect(normalizeRefundStatus('failed')).toBe('FAILED');
    expect(normalizeRefundStatus('processing')).toBe('PROCESSING');
    expect(normalizeRefundStatus('')).toBe('PENDING');
  });

  it('finds the active processing refund using normalized status values', () => {
    expect(
      getProcessingRefund([
        {
          refundId: 1,
          orderId: 42,
          paymentId: null,
          amount: '100000',
          type: 'PARTIAL',
          method: 'ORIGINAL_GATEWAY',
          status: 'processing' as any,
          gatewayTransactionId: 'TXN-1',
          reason: 'Refund retry',
          gatewayError: 'Gateway still processing',
          createdBy: 1,
          createdAt: '2026-03-30T00:00:00.000Z',
          updatedAt: '2026-03-30T00:00:00.000Z',
        },
      ] as any),
    ).toMatchObject({
      refundId: 1,
      status: 'processing',
    });
  });

  it('builds a locked processing state when an in-flight refund exists', () => {
    expect(
      getRefundProcessingState([
        {
          refundId: 2,
          orderId: 42,
          paymentId: null,
          amount: '50000',
          type: 'PARTIAL',
          method: 'ORIGINAL_GATEWAY',
          status: 'PROCESSING',
          gatewayTransactionId: 'TXN-2',
          reason: 'Refund retry',
          gatewayError: 'Gateway still processing',
          createdBy: 1,
          createdAt: '2026-03-30T00:00:00.000Z',
          updatedAt: '2026-03-30T00:00:00.000Z',
        },
      ] as any),
    ).toMatchObject({
      isLocked: true,
      processingRefund: {
        refundId: 2,
      },
    });
  });

  it('sums only collected payment rows for refund-cap display', () => {
    expect(
      getTotalCollectedAmount([
        { amount: '300000', status: 'success' },
        { amount: '200000', status: 'PENDING' },
        { amount: 50000, status: 'partial-refund' },
      ]),
    ).toBe(350000);
  });

  it('sums only successful refund rows for refund-cap display', () => {
    expect(
      getSuccessfulRefundedAmount([
        {
          refundId: 1,
          orderId: 42,
          paymentId: null,
          amount: '100000',
          type: 'PARTIAL',
          method: 'BANK_TRANSFER',
          status: 'SUCCESS',
          gatewayTransactionId: null,
          reason: 'done',
          gatewayError: null,
          createdBy: 1,
          createdAt: '2026-03-30T00:00:00.000Z',
          updatedAt: '2026-03-30T00:00:00.000Z',
        },
        {
          refundId: 2,
          orderId: 42,
          paymentId: null,
          amount: '50000',
          type: 'PARTIAL',
          method: 'BANK_TRANSFER',
          status: 'processing' as any,
          gatewayTransactionId: null,
          reason: 'pending',
          gatewayError: null,
          createdBy: 1,
          createdAt: '2026-03-30T00:00:00.000Z',
          updatedAt: '2026-03-30T00:00:00.000Z',
        },
      ] as any),
    ).toBe(100000);
  });

  it('derives remaining refundable from collected payments minus successful refunds', () => {
    expect(
      getRemainingRefundableAmount(
        [
          { amount: '300000', status: 'PAID' },
          { amount: '100000', status: 'PENDING' },
        ],
        [
          {
            refundId: 1,
            orderId: 42,
            paymentId: null,
            amount: '50000',
            type: 'PARTIAL',
            method: 'BANK_TRANSFER',
            status: 'SUCCESS',
            gatewayTransactionId: null,
            reason: 'done',
            gatewayError: null,
            createdBy: 1,
            createdAt: '2026-03-30T00:00:00.000Z',
            updatedAt: '2026-03-30T00:00:00.000Z',
          },
          {
            refundId: 2,
            orderId: 42,
            paymentId: null,
            amount: '75000',
            type: 'PARTIAL',
            method: 'BANK_TRANSFER',
            status: 'FAILED',
            gatewayTransactionId: null,
            reason: 'failed',
            gatewayError: null,
            createdBy: 1,
            createdAt: '2026-03-30T00:00:00.000Z',
            updatedAt: '2026-03-30T00:00:00.000Z',
          },
        ] as any,
      ),
    ).toBe(250000);
  });

  it('returns refund list summaries from the history endpoint without breaking plain data consumers', async () => {
    apiMock.get.mockResolvedValueOnce({
      success: true,
      data: [
        { refundId: 1, amount: '50000', status: 'SUCCESS' },
      ],
      summary: {
        totalCollected: 300000,
        totalRefunded: 50000,
        remainingRefundable: 250000,
      },
    });

    await expect(adminRefundService.list(42)).resolves.toEqual([
      { refundId: 1, amount: '50000', status: 'SUCCESS' },
    ]);

    apiMock.get.mockResolvedValueOnce({
      success: true,
      data: [
        { refundId: 1, amount: '50000', status: 'SUCCESS' },
      ],
      summary: {
        totalCollected: 300000,
        totalRefunded: 50000,
        remainingRefundable: 250000,
      },
    });

    await expect(adminRefundService.listWithSummary(42)).resolves.toEqual({
      refunds: [{ refundId: 1, amount: '50000', status: 'SUCCESS' }],
      summary: {
        totalCollected: 300000,
        totalRefunded: 50000,
        remainingRefundable: 250000,
      },
    });
  });

});

