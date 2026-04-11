import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/admin/services/returns.command');

const returnApiMock = vi.hoisted(() => ({
  approveReturnRequest: vi.fn(),
  acceptReturnForRefund: vi.fn(),
  completeBankRefund: vi.fn(),
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

  it('submits the complete bank refund payload directly to the admin API', async () => {
    const payload = {
      amount: 99000,
      transactionRef: 'BANK-88',
      financeNote: 'Refunded via bank transfer',
      proofImageUrls: ['https://cdn.example.com/refund-proof-88.jpg'],
    };

    const result = await adminReturnRuntimeService.adminCompleteRefund(88, payload);

    expect(returnApiMock.completeBankRefund).toHaveBeenCalledWith(88, payload);
    expect(returnApiMock.approveReturnRequest).not.toHaveBeenCalled();
    expect(returnApiMock.markReturnInTransit).not.toHaveBeenCalled();
    expect(returnApiMock.markReturnReceived).not.toHaveBeenCalled();
    expect(returnApiMock.acceptReturnForRefund).not.toHaveBeenCalled();
    expect(returnApiMock.refundReturnRequest).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      messageKey: 'feedback.refundSuccess',
    });
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
