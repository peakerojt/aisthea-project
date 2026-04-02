import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/admin/services/returns.query');

const returnApiMock = vi.hoisted(() => ({
  getAdminReturnRequestDetail: vi.fn(),
  getAdminReturnRequests: vi.fn(),
}));

vi.mock('@/admin/api/returns.api', () => ({
  adminReturnApi: returnApiMock,
}));

let adminReturnReadService: typeof import('@/admin/services/returns.query').adminReturnReadService;

describe('adminReturnReadService', () => {
  beforeAll(async () => {
    ({ adminReturnReadService } = await import('@/admin/services/returns.query'));
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
            financeNote: 'Persisted finance note from backend',
            financeNoteUpdatedAt: '2026-03-01T10:06:00.000Z',
            financeNoteUpdatedBy: {
              userId: 45,
              fullName: 'Finance Reviewer',
            },
            note: 'Original note',
            totalRefundAmount: '250000',
            economicsSummary: {
              totalGrossAmount: 300000,
              totalDiscountAmount: 50000,
              totalNetPaidAmount: 250000,
            },
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
            refundTransactions: [],
          },
        ],
        total: 1,
        page: 2,
        limit: 15,
        totalPages: 3,
      },
    });

    const result = await adminReturnReadService.list({
      status: 'REQUESTED',
      page: 2,
      pageSize: 15,
    });

    expect(returnApiMock.getAdminReturnRequests).toHaveBeenCalledWith('?status=REQUESTED&page=2&limit=15');
    expect(result.returns[0]).toEqual(
      expect.objectContaining({
        returnId: 77,
        status: 'PENDING_APPROVAL',
        statusBucket: 'REQUESTED',
        workflowStatus: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'MANUAL_REVIEW',
        adminNote: 'Reviewed by admin',
        economicsSummary: {
          totalGrossAmount: 300000,
          totalDiscountAmount: 50000,
          totalNetPaidAmount: 250000,
        },
      }),
    );
  });

  it('maps admin return detail payload into legacy detail shape', async () => {
    returnApiMock.getAdminReturnRequestDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 78,
        orderId: 1002,
        userId: 10,
        reason: 'OTHER',
        status: 'completed',
        workflowStatus: 'CLOSED',
        totalRefundAmount: '100000',
        economicsSummary: {
          totalGrossAmount: 120000,
          totalDiscountAmount: 20000,
          totalNetPaidAmount: 100000,
        },
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:10:00.000Z',
        attachments: [{ fileUrl: 'https://cdn.example.com/proof-3.jpg' }],
        statusLogs: [],
        refundTransactions: [
          { amount: 100000, status: 'COMPLETED', method: 'ORIGINAL_GATEWAY' },
        ],
      },
    });

    const result = await adminReturnReadService.detail(78);

    expect(result).toEqual(
      expect.objectContaining({
        returnId: 78,
        status: 'COMPLETED',
        statusBucket: 'REFUNDED',
        workflowStatus: 'CLOSED',
        refundStatus: 'REFUNDED',
        proofImages: ['https://cdn.example.com/proof-3.jpg'],
        economicsSummary: {
          totalGrossAmount: 120000,
          totalDiscountAmount: 20000,
          totalNetPaidAmount: 100000,
        },
        refundTransactions: [expect.objectContaining({ method: 'ORIGINAL_PAYMENT' })],
      }),
    );
  });

  it('derives REFUNDED from refundableCapAmount in admin return detail payloads', async () => {
    returnApiMock.getAdminReturnRequestDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 79,
        orderId: 1003,
        userId: 10,
        reason: 'OTHER',
        status: 'ACCEPTED_FOR_REFUND',
        totalRefundAmount: '150000',
        refundableCapAmount: '80000',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:10:00.000Z',
        attachments: [],
        statusLogs: [],
        refundTransactions: [{ amount: 80000, status: 'COMPLETED' }],
      },
    });

    const result = await adminReturnReadService.detail(79);

    expect(result).toEqual(
      expect.objectContaining({
        returnId: 79,
        refundableCapAmount: '80000',
        refundStatus: 'REFUNDED',
      }),
    );
  });

  it('prefers server-provided statusBucket in admin detail payloads', async () => {
    returnApiMock.getAdminReturnRequestDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 80,
        orderId: 1004,
        userId: 10,
        reason: 'OTHER',
        status: 'ACCEPTED_FOR_REFUND',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        statusBucket: 'REQUESTED',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:10:00.000Z',
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      },
    });

    const result = await adminReturnReadService.detail(80);

    expect(result).toEqual(
      expect.objectContaining({
        returnId: 80,
        statusBucket: 'REQUESTED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
      }),
    );
  });

  it('canonicalizes fallback workflowStatus for legacy admin statuses when the server omits workflowStatus', async () => {
    returnApiMock.getAdminReturnRequests.mockResolvedValueOnce({
      data: {
        data: [
          {
            returnRequestId: 82,
            orderId: 1006,
            userId: 10,
            reason: 'OTHER',
            status: 'PENDING_APPROVAL',
            createdAt: '2026-03-01T10:00:00.000Z',
            updatedAt: '2026-03-01T10:10:00.000Z',
            attachments: [],
            statusLogs: [],
            refundTransactions: [],
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    });

    const result = await adminReturnReadService.list();

    expect(result.returns[0]).toEqual(
      expect.objectContaining({
        returnId: 82,
        status: 'PENDING_APPROVAL',
        workflowStatus: 'PENDING_ADMIN_REVIEW',
        statusBucket: 'REQUESTED',
      }),
    );
  });

  it('preserves item-specific reasonText in admin return detail payloads', async () => {
    returnApiMock.getAdminReturnRequestDetail.mockResolvedValueOnce({
      data: {
        returnRequestId: 81,
        orderId: 1005,
        userId: 10,
        reason: 'OTHER',
        status: 'REQUESTED',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:10:00.000Z',
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
        items: [
          {
            returnRequestItemId: 903,
            orderItemId: 503,
            quantity: 1,
            unitPrice: '80000',
            reason: 'OTHER',
            reasonText: 'Tem san pham bi rach',
          },
        ],
      },
    });

    const result = await adminReturnReadService.detail(81);

    expect(result.items).toEqual([
      expect.objectContaining({
        returnRequestItemId: 903,
        orderItemId: 503,
        reason: 'OTHER',
        reasonText: 'Tem san pham bi rach',
      }),
    ]);
  });
});
