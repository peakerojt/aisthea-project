import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/common/services/return.service');

const returnApiMock = vi.hoisted(() => ({
  approveReturnRequest: vi.fn(),
  createReturnRequest: vi.fn(),
  getAdminReturnRequestDetail: vi.fn(),
  getAdminReturnRequests: vi.fn(),
  getMyReturns: vi.fn(),
  getReturnForOrder: vi.fn(),
  getUserReturnDetail: vi.fn(),
  markReturnReceived: vi.fn(),
  refundReturnRequest: vi.fn(),
  rejectReturnRequest: vi.fn(),
  requestReturn: vi.fn(),
}));

vi.mock('@/common/api/return.api', () => ({
  returnApi: returnApiMock,
}));

let adminReturnService: typeof import('@/common/services/return.service').adminReturnService;
let returnService: typeof import('@/common/services/return.service').returnService;

describe('adminReturnService', () => {
  beforeAll(async () => {
    ({ adminReturnService, returnService } = await import('@/common/services/return.service'));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps admin return list payload into legacy page shape', async () => {
    returnApiMock.getAdminReturnRequests.mockResolvedValueOnce({
      data: {
        data: [
          {
            returnRequestId: 77,
            orderId: 1001,
            userId: 9,
            reason: 'DEFECTIVE',
            status: 'PENDING_APPROVAL',
            note: 'Original note',
            totalRefundAmount: '250000',
            createdAt: '2026-03-01T10:00:00.000Z',
            updatedAt: '2026-03-01T10:05:00.000Z',
            attachments: [
              { fileUrl: 'https://cdn.example.com/proof-1.jpg' },
              { fileUrl: 'https://cdn.example.com/proof-2.jpg' },
            ],
            statusLogs: [
              {
                logId: 1,
                toStatus: 'REQUESTED',
                comment: 'Customer created return request',
                createdAt: '2026-03-01T10:00:00.000Z',
              },
              {
                logId: 2,
                fromStatus: 'REQUESTED',
                toStatus: 'PENDING_APPROVAL',
                comment: 'Reviewed by admin',
                createdAt: '2026-03-01T10:05:00.000Z',
              },
            ],
            order: {
              orderId: 1001,
              orderNumber: 'OD1001',
              totalAmount: '250000',
              customerName: 'Nguyen Van A',
              customerPhone: '0900000000',
            },
            user: {
              userId: 9,
              fullName: 'Nguyen Van A',
              email: 'a@example.com',
              avatarUrl: null,
            },
          },
        ],
        total: 1,
        page: 2,
        limit: 15,
        totalPages: 3,
      },
    });

    const result = await adminReturnService.list({
      status: 'REQUESTED',
      page: 2,
      pageSize: 15,
    });

    expect(returnApiMock.getAdminReturnRequests).toHaveBeenCalledWith('?status=REQUESTED&page=2&limit=15');
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 15,
      total: 1,
      totalPages: 3,
    });
    expect(result.returns).toEqual([
      expect.objectContaining({
        returnId: 77,
        orderId: 1001,
        status: 'REQUESTED',
        proofImages: [
          'https://cdn.example.com/proof-1.jpg',
          'https://cdn.example.com/proof-2.jpg',
        ],
        adminNote: 'Reviewed by admin',
        order: expect.objectContaining({
          orderNumber: 'OD1001',
          totalAmount: '250000',
        }),
        user: expect.objectContaining({
          fullName: 'Nguyen Van A',
          email: 'a@example.com',
        }),
      }),
    ]);
  });

  it('chains approve, receive, and refund when completing refund from requested state', async () => {
    returnApiMock.getAdminReturnRequestDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 88,
        orderId: 2002,
        userId: 4,
        reason: 'WRONG_ITEM',
        status: 'REQUESTED',
        note: null,
        totalRefundAmount: '99000',
        createdAt: '2026-03-10T08:00:00.000Z',
        attachments: [],
        statusLogs: [],
      },
    });

    const result = await adminReturnService.process(88, 'COMPLETE_REFUND');

    expect(returnApiMock.approveReturnRequest).toHaveBeenCalledWith(88);
    expect(returnApiMock.markReturnReceived).toHaveBeenCalledWith(88);
    expect(returnApiMock.refundReturnRequest).toHaveBeenCalledTimes(1);
    expect(returnApiMock.refundReturnRequest).toHaveBeenCalledWith(
      88,
      expect.objectContaining({
        method: 'ORIGINAL_PAYMENT',
        idempotencyKey: expect.stringMatching(/^admin-return-88-\d+$/),
      }),
    );
    expect(result).toEqual({
      success: true,
      messageKey: 'feedback.refundSuccess',
    });
  });

  it('requires a rejection note before rejecting a return', async () => {
    await expect(adminReturnService.process(41, 'REJECT')).rejects.toMatchObject({
      message: 'Vui lòng nhập lý do từ chối.',
      messageKey: 'feedback.rejectReasonRequired',
      code: 'RETURN_REJECT_REASON_REQUIRED',
    });

    expect(returnApiMock.rejectReturnRequest).not.toHaveBeenCalled();
  });

  it('trims the rejection note before sending the reject request', async () => {
    const result = await adminReturnService.process(42, 'REJECT', '  Không đạt điều kiện hoàn tiền  ');

    expect(returnApiMock.rejectReturnRequest).toHaveBeenCalledWith(42, {
      reason: 'Không đạt điều kiện hoàn tiền',
    });
    expect(result).toEqual({
      success: true,
      messageKey: 'feedback.rejectSuccess',
    });
  });

  it('rejects complete refund when current return is already rejected', async () => {
    returnApiMock.getAdminReturnRequestDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 99,
        orderId: 3003,
        userId: 2,
        reason: 'OTHER',
        status: 'REJECTED',
        note: 'Rejected already',
        totalRefundAmount: '10000',
        createdAt: '2026-03-12T09:00:00.000Z',
        attachments: [],
        statusLogs: [],
      },
    });

    await expect(adminReturnService.process(99, 'COMPLETE_REFUND')).rejects.toMatchObject({
      message: 'Yêu cầu đã bị từ chối, không thể hoàn tiền.',
      messageKey: 'feedback.refundRejected',
      code: 'RETURN_ALREADY_REJECTED',
    });

    expect(returnApiMock.approveReturnRequest).not.toHaveBeenCalled();
    expect(returnApiMock.markReturnReceived).not.toHaveBeenCalled();
    expect(returnApiMock.refundReturnRequest).not.toHaveBeenCalled();
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

    expect(result.data.map((item) => item.status)).toEqual(['REQUESTED', 'REFUNDED']);
  });

  it('normalizes legacy statuses in direct request payloads', async () => {
    returnApiMock.requestReturn.mockResolvedValueOnce({
      data: {
        returnId: 13,
        orderId: 203,
        userId: 5,
        reason: 'DEFECTIVE',
        proofImages: ['https://cdn.example.com/proof-1.jpg'],
        status: ' pending approval ',
        adminNote: null,
        createdAt: '2026-03-03T09:00:00.000Z',
        updatedAt: '2026-03-03T09:10:00.000Z',
      },
    });

    const result = await returnService.request(203, 'DEFECTIVE', ['https://cdn.example.com/proof-1.jpg']);

    expect(result).toEqual(
      expect.objectContaining({
        returnId: 13,
        status: 'REQUESTED',
      }),
    );
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
        status: 'REFUNDED',
      }),
    );
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
        adminNote: null,
        createdAt: '2026-03-04T10:00:00.000Z',
        updatedAt: '2026-03-04T10:10:00.000Z',
      },
    });

    const result = await returnService.getForOrder(204);

    expect(result).toEqual(
      expect.objectContaining({
        returnId: 14,
        status: 'REFUNDED',
      }),
    );
  });

  it('normalizes legacy statuses in customer return detail payloads', async () => {
    returnApiMock.getUserReturnDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 12,
        orderId: 202,
        userId: 5,
        reason: 'WRONG_ITEM',
        status: ' pending approval ',
        totalRefundAmount: '5000',
        createdAt: '2026-03-03T10:00:00.000Z',
        attachments: [],
        statusLogs: [
          {
            logId: 1,
            fromStatus: ' pending approval ',
            toStatus: 'completed',
            createdAt: '2026-03-03T10:10:00.000Z',
          },
        ],
      },
    });

    const result = await returnService.detail(12);

    expect(result.status).toBe('REQUESTED');
    expect(result.statusLogs).toEqual([
      expect.objectContaining({
        fromStatus: 'REQUESTED',
        toStatus: 'REFUNDED',
      }),
    ]);
  });

  it('normalizes casing before processing refund transitions', async () => {
    returnApiMock.getAdminReturnRequestDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 66,
        orderId: 3006,
        userId: 7,
        reason: 'OTHER',
        status: ' approved ',
        note: null,
        totalRefundAmount: '45000',
        createdAt: '2026-03-13T09:00:00.000Z',
        attachments: [],
        statusLogs: [],
      },
    });

    const result = await adminReturnService.process(66, 'COMPLETE_REFUND');

    expect(returnApiMock.approveReturnRequest).not.toHaveBeenCalled();
    expect(returnApiMock.markReturnReceived).toHaveBeenCalledWith(66);
    expect(returnApiMock.refundReturnRequest).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: true,
      messageKey: 'feedback.refundSuccess',
    });
  });
});
