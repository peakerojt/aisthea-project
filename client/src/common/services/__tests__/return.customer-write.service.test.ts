import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/common/services/return.customer-write.service');

const returnApiMock = vi.hoisted(() => ({
  createReturnRequest: vi.fn(),
}));

vi.mock('@/common/api/return.api', () => ({
  returnApi: returnApiMock,
}));

let returnCustomerWriteService: typeof import('@/common/services/return.customer-write.service').returnCustomerWriteService;
let ReturnCustomerWriteError: typeof import('@/common/services/return.customer-write.service').ReturnCustomerWriteError;

describe('returnCustomerWriteService', () => {
  beforeAll(async () => {
    ({ returnCustomerWriteService, ReturnCustomerWriteError } = await import('@/common/services/return.customer-write.service'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
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

    const result = await returnCustomerWriteService.create({
      orderId: 205,
      reason: 'OTHER',
      items: [{ orderItemId: 1, quantity: 1 }],
      attachments: [],
    });

    expect(result).toEqual(
      expect.objectContaining({
        returnRequestId: 15,
        status: 'COMPLETED',
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

    const result = await returnCustomerWriteService.create({
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

  it('normalizes refund transaction methods in modern create payload responses', async () => {
    returnApiMock.createReturnRequest.mockResolvedValueOnce({
      data: {
        returnRequestId: 17,
        orderId: 207,
        userId: 5,
        reason: 'DAMAGED',
        status: 'accepted_for_refund',
        totalRefundAmount: '80000',
        refundTransactions: [
          {
            amount: 80000,
            status: 'PENDING',
            method: 'STORE_WALLET',
          },
        ],
        createdAt: '2026-03-06T10:00:00.000Z',
        items: [],
      },
    });

    const result = await returnCustomerWriteService.create({
      orderId: 207,
      reason: 'DAMAGED',
      items: [{ orderItemId: 2, quantity: 1 }],
      attachments: [],
    });

    expect(result.refundTransactions).toEqual([
      expect.objectContaining({
        method: 'WALLET_CREDIT',
      }),
    ]);
  });

  it('prefers server-provided statusBucket in modern create payload responses', async () => {
    returnApiMock.createReturnRequest.mockResolvedValueOnce({
      data: {
        returnRequestId: 18,
        orderId: 208,
        userId: 5,
        reason: 'OTHER',
        status: 'ACCEPTED_FOR_REFUND',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        statusBucket: 'REQUESTED',
        totalRefundAmount: '0',
        createdAt: '2026-03-05T10:00:00.000Z',
        items: [],
      },
    });

    const result = await returnCustomerWriteService.create({
      orderId: 208,
      reason: 'OTHER',
      items: [{ orderItemId: 1, quantity: 1 }],
      attachments: [],
    });

    expect(result).toEqual(
      expect.objectContaining({
        returnRequestId: 18,
        statusBucket: 'REQUESTED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
      }),
    );
  });

  it('normalizes RETURN_ALREADY_EXISTS into a structured write error for modern create payloads', async () => {
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
      returnCustomerWriteService.create({
        orderId: 208,
        reason: 'OTHER',
        items: [{ orderItemId: 3, quantity: 1 }],
        attachments: [],
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'ReturnCustomerWriteError',
        code: 'RETURN_ALREADY_EXISTS',
        existingReturnId: 901,
        message: 'This order already has an active return request',
      }),
    );
    expect(ReturnCustomerWriteError).toBeDefined();
  });

  it('normalizes ITEM_SELECTION_REQUIRED into a structured write error for modern create payloads', async () => {
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
      returnCustomerWriteService.create({
        orderId: 209,
        reason: 'OTHER',
        items: [{ orderItemId: 4, quantity: 1 }],
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
});
