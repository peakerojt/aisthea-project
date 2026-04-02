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
      payments: [{ paymentId: 88, transactionCode: 'PAY-88', amount: 300000, status: 'PAID' }],
      refunds: [{ amount: 200000, status: 'SUCCESS' }],
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
      details: [
        {
          field: 'amount',
          code: 'MAX_REFUNDABLE_AMOUNT',
          message: '100000',
        },
      ],
    });
  });

  it('marks the payment as REFUNDED when refunds fully consume the collected amount even if order total is higher', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 19,
      totalAmount: 500000,
      payments: [{ paymentId: 109, transactionCode: 'PAY-109', amount: 300000, status: 'PAID' }],
      refunds: [],
    });
    deriveOrderPaymentStatusMock.mockReturnValueOnce('PAID');

    const tx = {
      refund: {
        create: jest.fn().mockResolvedValue({ refundId: 801 }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      payment: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await initiateRefund(19, 7, {
      amount: 300000,
      type: 'FULL',
      method: 'BANK_TRANSFER',
      reason: 'Refund full collected amount only',
    });

    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { paymentId: 109 },
      data: { status: 'REFUNDED' },
    });
    expect(result).toEqual(
      expect.objectContaining({
        refundId: 801,
        status: 'SUCCESS',
        gatewayTransactionId: expect.stringMatching(/^MANUAL-/),
      }),
    );
  });

  it('refunds against the latest collected payment instead of the first payment row', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 20,
      totalAmount: 500000,
      payments: [
        { paymentId: 110, transactionCode: 'PENDING-110', amount: 500000, status: 'PENDING' },
        { paymentId: 111, transactionCode: 'SETTLED-111', amount: 320000, status: 'PAID' },
      ],
      refunds: [],
    });
    deriveOrderPaymentStatusMock.mockReturnValueOnce('PAID');

    const tx = {
      refund: {
        create: jest.fn().mockResolvedValue({ refundId: 802 }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      payment: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
    mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const result = await initiateRefund(20, 7, {
      amount: 120000,
      type: 'PARTIAL',
      method: 'ORIGINAL_GATEWAY',
      reason: 'Refund against collected VNPay payment',
    });

    expect(tx.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 20,
        paymentId: 111,
        amount: 120000,
        method: 'ORIGINAL_GATEWAY',
      }),
    });
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { paymentId: 111 },
      data: { status: 'PARTIALLY_REFUNDED' },
    });
    expect(result).toEqual(
      expect.objectContaining({
        refundId: 802,
        status: 'SUCCESS',
        gatewayTransactionId: expect.stringMatching(/^VNP-RF-SETTLED-111-/),
      }),
    );
  });

  it('throws REFUND_ALREADY_IN_PROGRESS when the order already has a processing refund', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 17,
      totalAmount: 500000,
      payments: [{ paymentId: 92, transactionCode: 'PAY-92', amount: 500000, status: 'PAID' }],
      refunds: [{ amount: 100000, status: 'PROCESSING' }],
    });
    deriveOrderPaymentStatusMock.mockReturnValueOnce('PAID');

    await expect(
      initiateRefund(17, 7, {
        amount: 150000,
        type: 'PARTIAL',
        method: 'ORIGINAL_GATEWAY',
        reason: 'Retry while gateway still processing',
      }),
    ).rejects.toMatchObject({
      code: 'REFUND_ALREADY_IN_PROGRESS',
      status: 409,
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('completes a partial manual refund and marks the payment as PARTIALLY_REFUNDED', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 14,
      totalAmount: 500000,
      payments: [{ paymentId: 91, transactionCode: 'PAY-91', amount: 500000, status: 'PAID' }],
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

  it('normalizes the refund type to PARTIAL when the payload says FULL but refundable balance remains', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 140,
      totalAmount: 500000,
      payments: [{ paymentId: 191, transactionCode: 'PAY-191', amount: 500000, status: 'PAID' }],
      refunds: [{ amount: 100000, status: 'SUCCESS' }],
    });
    deriveOrderPaymentStatusMock.mockReturnValueOnce('PARTIALLY_REFUNDED');

    const tx = {
      refund: {
        create: jest.fn().mockResolvedValue({ refundId: 551 }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      payment: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await initiateRefund(140, 7, {
      amount: 150000,
      type: 'FULL',
      method: 'BANK_TRANSFER',
      reason: 'Full requested but balance remains',
    });

    expect(tx.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 140,
        paymentId: 191,
        amount: 150000,
        type: 'PARTIAL',
      }),
    });
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { paymentId: 191 },
      data: { status: 'PARTIALLY_REFUNDED' },
    });
  });

  it('normalizes the refund type to FULL when the payload amount matches the remaining refundable balance', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 141,
      totalAmount: 500000,
      payments: [{ paymentId: 192, transactionCode: 'PAY-192', amount: 500000, status: 'PAID' }],
      refunds: [{ amount: 100000, status: 'SUCCESS' }],
    });
    deriveOrderPaymentStatusMock.mockReturnValueOnce('PARTIALLY_REFUNDED');

    const tx = {
      refund: {
        create: jest.fn().mockResolvedValue({ refundId: 552 }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      payment: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await initiateRefund(141, 7, {
      amount: 400000,
      type: 'PARTIAL',
      method: 'BANK_TRANSFER',
      reason: 'Partial requested but this consumes remaining balance',
    });

    expect(tx.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 141,
        paymentId: 192,
        amount: 400000,
        type: 'FULL',
      }),
    });
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { paymentId: 192 },
      data: { status: 'REFUNDED' },
    });
  });

  it('marks the refund as FAILED and throws GATEWAY_FAILED when the original gateway refund fails', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 16,
      totalAmount: 500000,
      payments: [{ paymentId: 93, transactionCode: 'PAY-93', amount: 500000, status: 'PAID' }],
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

  it('keeps the refund processing and throws REFUND_IN_PROGRESS when the gateway reports an in-flight refund', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 26,
      totalAmount: 500000,
      payments: [{ paymentId: 94, transactionCode: 'SIM_INFLIGHT-94', amount: 500000, status: 'PAID' }],
      refunds: [],
    });
    deriveOrderPaymentStatusMock.mockReturnValueOnce('PAID');

    const tx = {
      refund: {
        create: jest.fn().mockResolvedValue({ refundId: 701 }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      payment: {
        update: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(
      initiateRefund(26, 7, {
        amount: 200000,
        type: 'PARTIAL',
        method: 'ORIGINAL_GATEWAY',
        reason: 'Refund via original gateway',
      }),
    ).rejects.toMatchObject({
      code: 'REFUND_IN_PROGRESS',
      status: 409,
    });

    expect(tx.refund.update).toHaveBeenCalledWith({
      where: { refundId: 701 },
      data: {
        status: 'PROCESSING',
        gatewayError: 'VNPay: Refund request is still in progress - Error code 94',
      },
    });
    expect(tx.payment.update).not.toHaveBeenCalled();
  });

  it('marks the refund as FAILED and throws REFUND_NOT_ELIGIBLE when the gateway rejects the original transaction', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 27,
      totalAmount: 500000,
      payments: [{ paymentId: 95, transactionCode: 'SIM_INELIGIBLE-95', amount: 500000, status: 'PAID' }],
      refunds: [],
    });
    deriveOrderPaymentStatusMock.mockReturnValueOnce('PAID');

    const tx = {
      refund: {
        create: jest.fn().mockResolvedValue({ refundId: 702 }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      payment: {
        update: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(
      initiateRefund(27, 7, {
        amount: 200000,
        type: 'PARTIAL',
        method: 'ORIGINAL_GATEWAY',
        reason: 'Refund via original gateway',
      }),
    ).rejects.toMatchObject({
      code: 'REFUND_NOT_ELIGIBLE',
      status: 400,
    });

    expect(tx.refund.update).toHaveBeenCalledWith({
      where: { refundId: 702 },
      data: {
        status: 'FAILED',
        gatewayError: 'VNPay: Refund request is not eligible - Error code 95',
      },
    });
    expect(tx.payment.update).not.toHaveBeenCalled();
  });

  it('loads refund history for an order in descending createdAt order', async () => {
    prismaMock.refund.findMany.mockResolvedValueOnce([
      { refundId: 2 },
      { refundId: 1 },
    ]);
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 15,
      payments: [
        { amount: 300000, status: 'PAID' },
      ],
    });

    const result = await getRefundsForOrder(15);

    expect(prismaMock.refund.findMany).toHaveBeenCalledWith({
      where: { orderId: 15 },
      orderBy: { createdAt: 'desc' },
    });
    expect(prismaMock.order.findUnique).toHaveBeenCalledWith({
      where: { orderId: 15 },
      include: {
        payments: true,
      },
    });
    expect(result).toEqual({
      refunds: [{ refundId: 2 }, { refundId: 1 }],
      summary: {
        totalCollected: 300000,
        totalRefunded: 0,
        remainingRefundable: 300000,
      },
    });
  });

  it('treats settled payment aliases as collected when building refund history summary', async () => {
    prismaMock.refund.findMany.mockResolvedValueOnce([]);
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 16,
      payments: [
        { amount: 120000, status: 'success' },
        { amount: 80000, status: 'partial-refund' },
        { amount: 50000, status: 'pending_cod' },
      ],
    });

    const result = await getRefundsForOrder(16);

    expect(result.summary).toEqual({
      totalCollected: 200000,
      totalRefunded: 0,
      remainingRefundable: 200000,
    });
  });
});
