const prismaMock = {
  order: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const inventoryMock = {
  atomicCancelRestore: jest.fn(),
};

const loggerMock = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('../../../utils/prisma', () => ({
  prisma: prismaMock,
}));

jest.mock('../../../services/inventory.service', () => ({
  atomicCancelRestore: (...args: unknown[]) => inventoryMock.atomicCancelRestore(...args),
}));

jest.mock('../../../lib/logger', () => ({
  logger: loggerMock,
}));

import { ORDER_STATUS } from '../../../config/orderStatus.config';
import { expireUnpaidVnpayOrders } from '../vnpay-expiration.worker';

describe('vnpay-expiration.worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('auto-cancels expired pending VNPay orders and restores stock', async () => {
    const now = new Date('2026-04-09T12:00:00.000Z');
    const expiredAt = new Date('2026-04-09T11:30:00.000Z');
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          orderId: 321,
          orderNumber: 'ORD-321',
          status: ORDER_STATUS.PENDING,
          createdAt: expiredAt,
          items: [{ variantId: 41, quantity: 2 }],
          payments: [
            {
              paymentId: 71,
              status: 'PENDING',
              paymentDate: expiredAt,
            },
          ],
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };

    prismaMock.order.findMany.mockResolvedValue([
      {
        orderId: 321,
        orderNumber: 'ORD-321',
        createdAt: expiredAt,
        payments: [
          {
            paymentId: 71,
            status: 'PENDING',
            paymentDate: expiredAt,
          },
        ],
      },
    ]);
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(tx));
    inventoryMock.atomicCancelRestore.mockResolvedValue(undefined);

    const result = await expireUnpaidVnpayOrders({
      now,
      ttlMs: 15 * 60_000,
      limit: 10,
    });

    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: {
        orderId: 321,
        status: ORDER_STATUS.PENDING,
      },
      data: {
        status: ORDER_STATUS.CANCELLED,
        note:
          'Đơn VNPay chưa được thanh toán trong thời gian cho phép. Hệ thống đã tự động hủy đơn và hoàn lại tồn kho.',
      },
    });
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { paymentId: 71 },
      data: {
        status: 'CANCELLED',
        note: 'VNPay payment window expired. Order auto-cancelled and stock released.',
      },
    });
    expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 321,
        oldStatus: ORDER_STATUS.PENDING,
        status: ORDER_STATUS.CANCELLED,
        changedBy: null,
      }),
    });
    expect(inventoryMock.atomicCancelRestore).toHaveBeenCalledWith(
      321,
      null,
      [{ variantId: 41, quantity: 2 }],
      tx,
      { restoreType: 'cancel' },
    );
    expect(result).toMatchObject({
      inspectedCount: 1,
      expiredCount: 1,
      restoredItemCount: 1,
    });
  });

  it('also cancels stale failed VNPay orders without rewriting terminal payment status', async () => {
    const now = new Date('2026-04-09T12:00:00.000Z');
    const expiredAt = new Date('2026-04-09T11:20:00.000Z');
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          orderId: 322,
          orderNumber: 'ORD-322',
          status: ORDER_STATUS.PENDING,
          createdAt: expiredAt,
          items: [{ variantId: 52, quantity: 1 }],
          payments: [
            {
              paymentId: 72,
              status: 'FAILED',
              paymentDate: expiredAt,
            },
          ],
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };

    prismaMock.order.findMany.mockResolvedValue([
      {
        orderId: 322,
        orderNumber: 'ORD-322',
        createdAt: expiredAt,
        payments: [
          {
            paymentId: 72,
            status: 'FAILED',
            paymentDate: expiredAt,
          },
        ],
      },
    ]);
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(tx));
    inventoryMock.atomicCancelRestore.mockResolvedValue(undefined);

    const result = await expireUnpaidVnpayOrders({
      now,
      ttlMs: 15 * 60_000,
      limit: 10,
    });

    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(inventoryMock.atomicCancelRestore).toHaveBeenCalledWith(
      322,
      null,
      [{ variantId: 52, quantity: 1 }],
      tx,
      { restoreType: 'cancel' },
    );
    expect(result).toMatchObject({
      inspectedCount: 1,
      expiredCount: 1,
      restoredItemCount: 1,
    });
  });
});
