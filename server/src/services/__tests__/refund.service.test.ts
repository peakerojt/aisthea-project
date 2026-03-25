const prismaMock = {
  $transaction: jest.fn(),
  order: {
    findUnique: jest.fn(),
  },
  refund: {
    findMany: jest.fn(),
  },
};

const deriveOrderPaymentStatusMock = jest.fn();

jest.mock('../../utils/prisma', () => ({
  prisma: prismaMock,
}));

jest.mock('../../shared/order-state', () => ({
  deriveOrderPaymentStatus: (...args: unknown[]) => deriveOrderPaymentStatusMock(...args),
}));

import { RefundError, getRefundsForOrder, initiateRefund } from '../refund.service';

describe('refund.service', () => {
  let mathRandomSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    prismaMock.$transaction.mockReset();
    prismaMock.order.findUnique.mockReset();
    prismaMock.refund.findMany.mockReset();
    deriveOrderPaymentStatusMock.mockReset();
    mathRandomSpy?.mockRestore();
  });

  it('throws ORDER_NOT_FOUND when the order does not exist', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce(null);

    await expect(
      initiateRefund(99, 7, {
        amount: 150000,
        type: 'FULL',
        method: 'BANK_TRANSFER',
        reason: 'Customer requested refund',
      }),
    ).rejects.toMatchObject({
      code: 'ORDER_NOT_FOUND',
      status: 404,
    });
  });

  it('throws ORDER_NOT_PAID when the order is not in a refundable payment state', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 12,
      totalAmount: 500000,
      payments: [],
      refunds: [],
    });
    deriveOrderPaymentStatusMock.mockReturnValueOnce('PENDING');

    await expect(
      initiateRefund(12, 7, {
        amount: 150000,
        type: 'PARTIAL',
        method: 'BANK_TRANSFER',
        reason: 'Customer requested refund',
      }),
    ).rejects.toMatchObject({
      code: 'ORDER_NOT_PAID',
      status: 400,
    });
  });

  it('throws OVER_REFUND when the request exceeds the remaining refundable amount', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 13,
      totalAmount: 500000,
      payments: [{ paymentId: 88, transactionCode: 'PAY-88' }],
      refunds: [{ amount: 400000, status: 'SUCCESS' }],
    });
    deriveOrderPaymentStatusMock.mockReturnValueOnce('PAID');

    await expect(
      initiateRefund(13, 7, {
        amount: 150000,
        type: 'PARTIAL',
        method: 'BANK_TRANSFER',
        reason: 'Partial refund requested',
      }),
    ).rejects.toMatchObject({
      code: 'OVER_REFUND',
      status: 400,
    });
  });

  it('completes a partial manual refund and marks the payment as PARTIALLY_REFUNDED', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 14,
      totalAmount: 500000,
      payments: [{ paymentId: 91, transactionCode: 'PAY-91' }],
      refunds: [{ amount: 100000, status: 'SUCCESS' }],
    });
    deriveOrderPaymentStatusMock.mockReturnValueOnce('PARTIALLY_REFUNDED');

    const tx = {
      refund: {
        create: jest.fn().mockResolvedValue({ refundId: 501 }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      payment: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await initiateRefund(14, 7, {
      amount: 150000,
      type: 'PARTIAL',
      method: 'BANK_TRANSFER',
      reason: 'Manual bank transfer refund',
    });

    expect(tx.refund.create).toHaveBeenCalledWith({
      data: {
        orderId: 14,
        paymentId: 91,
        amount: 150000,
        type: 'PARTIAL',
        method: 'BANK_TRANSFER',
        status: 'PROCESSING',
        reason: 'Manual bank transfer refund',
        createdBy: 7,
      },
    });
    expect(tx.refund.update).toHaveBeenCalledWith({
      where: { refundId: 501 },
      data: expect.objectContaining({
        status: 'SUCCESS',
        gatewayTransactionId: expect.stringMatching(/^MANUAL-/),
      }),
    });
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { paymentId: 91 },
      data: { status: 'PARTIALLY_REFUNDED' },
    });
    expect(result).toEqual(
      expect.objectContaining({
        refundId: 501,
        status: 'SUCCESS',
        gatewayTransactionId: expect.stringMatching(/^MANUAL-/),
      }),
    );
  });

  it('marks the refund as FAILED and throws GATEWAY_FAILED when the original gateway refund fails', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 16,
      totalAmount: 500000,
      payments: [{ paymentId: 93, transactionCode: 'PAY-93' }],
      refunds: [],
    });
    deriveOrderPaymentStatusMock.mockReturnValueOnce('PAID');

    const tx = {
      refund: {
        create: jest.fn().mockResolvedValue({ refundId: 601 }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      payment: {
        update: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
    mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.05);

    await expect(
      initiateRefund(16, 7, {
        amount: 200000,
        type: 'PARTIAL',
        method: 'ORIGINAL_GATEWAY',
        reason: 'Refund via original gateway',
      }),
    ).rejects.toMatchObject({
      code: 'GATEWAY_FAILED',
      status: 400,
    });

    expect(tx.refund.update).toHaveBeenCalledWith({
      where: { refundId: 601 },
      data: {
        status: 'FAILED',
        gatewayError: 'VNPay: Refund transaction failed - Error code GW_TIMEOUT',
      },
    });
    expect(tx.payment.update).not.toHaveBeenCalled();
  });

  it('loads refund history for an order in descending createdAt order', async () => {
    prismaMock.refund.findMany.mockResolvedValueOnce([
      { refundId: 2 },
      { refundId: 1 },
    ]);

    const result = await getRefundsForOrder(15);

    expect(prismaMock.refund.findMany).toHaveBeenCalledWith({
      where: { orderId: 15 },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([{ refundId: 2 }, { refundId: 1 }]);
  });
});
