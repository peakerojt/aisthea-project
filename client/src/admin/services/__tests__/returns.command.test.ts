import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/admin/services/returns.command');

const returnApiMock = vi.hoisted(() => ({
  approveReturnRequest: vi.fn(),
  acceptReturnForRefund: vi.fn(),
  getAdminReturnRequestDetail: vi.fn(),
  getAdminReturnRequests: vi.fn(),
  markReturnInTransit: vi.fn(),
  markReturnReceived: vi.fn(),
  refundReturnRequest: vi.fn(),
  updateRefundStatus: vi.fn(),
  rejectReturnRequest: vi.fn(),
}));

vi.mock('@/admin/api/returns.api', () => ({
  adminReturnApi: returnApiMock,
}));

let adminReturnRuntimeService: typeof import('@/admin/services/returns.command').adminReturnRuntimeService;

describe('adminReturnRuntimeService', () => {
  beforeAll(async () => {
    ({ adminReturnRuntimeService } = await import('@/admin/services/returns.command'));
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
            workflowStatus: 'PENDING_ADMIN_REVIEW',
            refundStatus: 'MANUAL_REVIEW',
            note: 'Original note',
            totalRefundAmount: '250000',
            createdAt: '2026-03-01T10:00:00.000Z',
            updatedAt: '2026-03-01T10:05:00.000Z',
            attachments: [
              { fileUrl: 'https://cdn.example.com/proof-1.jpg' },
              { fileUrl: 'https://cdn.example.com/proof-2.jpg' },
            ],
            statusLogs: [],
            order: {
              orderId: 1001,
              orderNumber: 'OD1001',
              totalAmount: '250000',
            },
            user: {
              userId: 9,
              fullName: 'Nguyen Van A',
              email: 'a@example.com',
            },
            refundTransactions: [],
          },
        ],
        total: 1,
        page: 2,
        limit: 15,
        totalPages: 3,
      },
    });

    const result = await adminReturnRuntimeService.list({
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
    expect(result.returns[0]).toEqual(
      expect.objectContaining({
        returnId: 77,
        status: 'PENDING_APPROVAL',
        statusBucket: 'REQUESTED',
        workflowStatus: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'MANUAL_REVIEW',
      }),
    );
  });

  it('chains approve, receive, accept, and refund when completing refund from requested state', async () => {
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
        refundTransactions: [],
      },
    });

    const result = await adminReturnRuntimeService.adminCompleteRefund(88);

    expect(returnApiMock.approveReturnRequest).toHaveBeenCalledWith(88);
    expect(returnApiMock.markReturnInTransit).toHaveBeenCalledWith(88);
    expect(returnApiMock.markReturnReceived).toHaveBeenCalledWith(88);
    expect(returnApiMock.acceptReturnForRefund).toHaveBeenCalledWith(88);
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

  it('canonicalizes legacy workflow aliases before completing refund', async () => {
    returnApiMock.getAdminReturnRequestDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 189,
        orderId: 2203,
        userId: 4,
        reason: 'WRONG_ITEM',
        status: 'REQUESTED',
        workflowStatus: 'PENDING_APPROVAL',
        refundStatus: 'PENDING',
        note: null,
        totalRefundAmount: '99000',
        createdAt: '2026-03-10T08:00:00.000Z',
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      },
    });

    await adminReturnRuntimeService.adminCompleteRefund(189);

    expect(returnApiMock.approveReturnRequest).toHaveBeenCalledWith(189);
    expect(returnApiMock.markReturnInTransit).toHaveBeenCalledWith(189);
    expect(returnApiMock.markReturnReceived).toHaveBeenCalledWith(189);
    expect(returnApiMock.acceptReturnForRefund).toHaveBeenCalledWith(189);
  });

  it('jumps prepaid cancellation requests straight from approval to refund execution', async () => {
    returnApiMock.getAdminReturnRequestDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 190,
        orderId: 2204,
        userId: 4,
        reason: 'PRE_DELIVERY_CANCELLATION',
        status: 'REQUESTED',
        workflowStatus: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'PENDING',
        note: null,
        totalRefundAmount: '1492000',
        createdAt: '2026-04-01T08:00:00.000Z',
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      },
    });

    const result = await adminReturnRuntimeService.adminCompleteRefund(190);

    expect(returnApiMock.approveReturnRequest).toHaveBeenCalledWith(190);
    expect(returnApiMock.markReturnInTransit).not.toHaveBeenCalled();
    expect(returnApiMock.markReturnReceived).not.toHaveBeenCalled();
    expect(returnApiMock.acceptReturnForRefund).not.toHaveBeenCalled();
    expect(returnApiMock.refundReturnRequest).toHaveBeenCalledWith(
      190,
      expect.objectContaining({
        method: 'ORIGINAL_PAYMENT',
        idempotencyKey: expect.stringMatching(/^admin-return-190-\d+$/),
      }),
    );
    expect(result).toEqual({
      success: true,
      messageKey: 'feedback.refundSuccess',
    });
  });

  it('blocks complete refund when refund is locked pending payment confirmation', async () => {
    returnApiMock.getAdminReturnRequestDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 109,
        orderId: 3013,
        userId: 2,
        reason: 'OTHER',
        status: 'PENDING_PAYMENT_CONFIRMATION',
        note: null,
        totalRefundAmount: '10000',
        createdAt: '2026-03-12T09:00:00.000Z',
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      },
    });

    await expect(adminReturnRuntimeService.adminCompleteRefund(109)).rejects.toMatchObject({
      messageKey: 'feedback.refundLocked',
      code: 'RETURN_REFUND_LOCKED',
    });
    expect(returnApiMock.refundReturnRequest).not.toHaveBeenCalled();
  });

  it('requires and trims rejection notes', async () => {
    await expect(adminReturnRuntimeService.adminReject(41)).rejects.toMatchObject({
      messageKey: 'feedback.rejectReasonRequired',
      code: 'RETURN_REJECT_REASON_REQUIRED',
    });

    await expect(
      adminReturnRuntimeService.adminReject(42, '  Không đạt điều kiện hoàn tiền  '),
    ).resolves.toEqual({
      success: true,
      messageKey: 'feedback.rejectSuccess',
    });

    expect(returnApiMock.rejectReturnRequest).toHaveBeenCalledWith(42, {
      reason: 'Không đạt điều kiện hoàn tiền',
    });
  });

  it('updates refund status through semantic alias helpers', async () => {
    await expect(adminReturnRuntimeService.adminSetRefundPending(71)).resolves.toEqual({
      success: true,
      messageKey: 'feedback.refundStatusPendingSuccess',
    });
    expect(returnApiMock.updateRefundStatus).toHaveBeenCalledWith(71, {
      refundStatus: 'PENDING',
      comment: undefined,
    });

    await expect(
      adminReturnRuntimeService.adminSetRefundManualReview(74, '  Cần kiểm tra thủ công  '),
    ).resolves.toEqual({
      success: true,
      messageKey: 'feedback.refundStatusManualReviewSuccess',
    });
    expect(returnApiMock.updateRefundStatus).toHaveBeenCalledWith(74, {
      refundStatus: 'MANUAL_REVIEW',
      comment: 'Cần kiểm tra thủ công',
    });
  });

  it('passes explicit refund payload fields through the refund alias', async () => {
    await expect(
      adminReturnRuntimeService.adminRefund(65, {
        method: 'WALLET_CREDIT',
        amount: 125000,
        idempotencyKey: 'manual-refund-65',
      }),
    ).resolves.toEqual({
      success: true,
      messageKey: 'feedback.refundSuccess',
    });

    expect(returnApiMock.refundReturnRequest).toHaveBeenCalledWith(65, {
      method: 'WALLET_CREDIT',
      amount: 125000,
      idempotencyKey: 'manual-refund-65',
    });
  });
});
