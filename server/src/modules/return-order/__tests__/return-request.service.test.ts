import { Prisma } from '../../../generated/client';
import { ReturnRequestService, ServiceError } from '../services/return-request.service';

const txMock: any = {
  returnRequest: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  returnRequestStatusLog: {
    create: jest.fn(),
  },
  refundTransaction: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../../../utils/prisma', () => ({
  prisma: {
    $transaction: jest.fn(async (cb: any) => cb(txMock)),
  },
}));

// Suppress notification logs during tests
jest.mock('../../../utils/notification.util', () => ({
  notifyCustomer: jest.fn(),
}));

describe('return-request.service', () => {
  const service = new ReturnRequestService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── State machine ────────────────────────────────────────────────────────

  it('rejects invalid transition: REJECTED → APPROVED', async () => {
    txMock.returnRequest.findUnique.mockResolvedValueOnce({
      returnRequestId: 1,
      status: 'REJECTED',
    });

    await expect(service.approveReturnRequest(1, 2)).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
    });
  });

  it('rejects invalid transition: REFUNDED → APPROVED', async () => {
    txMock.returnRequest.findUnique.mockResolvedValueOnce({
      returnRequestId: 2,
      status: 'REFUNDED',
    });

    await expect(service.approveReturnRequest(2, 2)).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
    });
  });

  it('allows valid transition: REQUESTED → APPROVED', async () => {
    txMock.returnRequest.findUnique.mockResolvedValueOnce({
      returnRequestId: 3,
      orderId: 10,
      status: 'REQUESTED',
    });
    txMock.returnRequest.update.mockResolvedValueOnce({
      returnRequestId: 3,
      orderId: 10,
      status: 'APPROVED',
    });
    txMock.returnRequestStatusLog.create.mockResolvedValueOnce({});

    const result = await service.approveReturnRequest(3, 99);
    expect(result.status).toBe('APPROVED');
  });

  it('allows valid transition: APPROVED → RECEIVED', async () => {
    txMock.returnRequest.findUnique.mockResolvedValueOnce({
      returnRequestId: 4,
      orderId: 10,
      status: 'APPROVED',
    });
    txMock.returnRequest.update.mockResolvedValueOnce({
      returnRequestId: 4,
      orderId: 10,
      status: 'RECEIVED',
    });
    txMock.returnRequestStatusLog.create.mockResolvedValueOnce({});

    const result = await service.markReturnReceived(4, 99);
    expect(result.status).toBe('RECEIVED');
  });

  it('rejects invalid transition: APPROVED → REFUNDED (must go through RECEIVED)', async () => {
    txMock.refundTransaction.findUnique.mockResolvedValueOnce(null);
    txMock.returnRequest.findUnique.mockResolvedValueOnce({
      returnRequestId: 5,
      status: 'APPROVED',
      totalRefundAmount: new Prisma.Decimal(100000),
    });

    await expect(
      service.refundReturnRequest(5, 99, {
        method: 'ORIGINAL_PAYMENT',
        idempotencyKey: 'idem-approved',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATE_TRANSITION' });
  });

  // ─── Idempotency ─────────────────────────────────────────────────────────

  it('refund is idempotent when idempotency key already exists', async () => {
    txMock.refundTransaction.findUnique.mockResolvedValueOnce({
      transactionId: 9,
      idempotencyKey: 'same-key',
      amount: new Prisma.Decimal(50000),
      method: 'ORIGINAL_PAYMENT',
    });

    const result = await service.refundReturnRequest(1, 2, {
      method: 'ORIGINAL_PAYMENT',
      idempotencyKey: 'same-key',
    });

    expect(result).toMatchObject({ transactionId: 9 });
    expect(txMock.returnRequest.update).not.toHaveBeenCalled();
  });

  // ─── Amount validation ────────────────────────────────────────────────────

  it('rejects refund amount greater than totalRefundAmount', async () => {
    txMock.refundTransaction.findUnique.mockResolvedValueOnce(null);
    txMock.returnRequest.findUnique.mockResolvedValueOnce({
      returnRequestId: 1,
      status: 'RECEIVED',
      totalRefundAmount: new Prisma.Decimal(100000),
    });

    await expect(
      service.refundReturnRequest(1, 99, {
        method: 'ORIGINAL_PAYMENT',
        idempotencyKey: 'idem-2',
        amount: 120000,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_REFUND_AMOUNT' });
  });

  it('rejects refund amount of 0', async () => {
    txMock.refundTransaction.findUnique.mockResolvedValueOnce(null);
    txMock.returnRequest.findUnique.mockResolvedValueOnce({
      returnRequestId: 1,
      status: 'RECEIVED',
      totalRefundAmount: new Prisma.Decimal(100000),
    });

    await expect(
      service.refundReturnRequest(1, 99, {
        method: 'WALLET_CREDIT',
        idempotencyKey: 'idem-3',
        amount: 0,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_REFUND_AMOUNT' });
  });

  // ─── Not found ───────────────────────────────────────────────────────────

  it('throws NOT_FOUND when return request does not exist', async () => {
    txMock.returnRequest.findUnique.mockResolvedValueOnce(null);

    await expect(service.approveReturnRequest(999, 1)).rejects.toMatchObject({
      code: 'RETURN_REQUEST_NOT_FOUND',
    });
  });

  // ─── Reject flow ──────────────────────────────────────────────────────────

  it('allows reject from REQUESTED status', async () => {
    txMock.returnRequest.findUnique.mockResolvedValueOnce({
      returnRequestId: 10,
      orderId: 5,
      status: 'REQUESTED',
    });
    txMock.returnRequest.update.mockResolvedValueOnce({
      returnRequestId: 10,
      orderId: 5,
      status: 'REJECTED',
    });
    txMock.returnRequestStatusLog.create.mockResolvedValueOnce({});

    const result = await service.rejectReturnRequest(10, 1, 'Không hợp lệ');
    expect(result.status).toBe('REJECTED');
  });
});
