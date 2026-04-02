import {
  collectCodReturnLockCandidates,
  runCodReturnLockReconciliation,
} from '../reconcile-cod-return-locks';

describe('reconcile-cod-return-locks script', () => {
  it('collects only delivered COD candidates and groups locked returns by order', () => {
    const result = collectCodReturnLockCandidates([
      {
        returnRequestId: 11,
        orderId: 1,
        order: {
          orderId: 1,
          orderNumber: 'ORD-1',
          status: 'Delivered',
          paymentMethod: 'COD',
          totalAmount: 100000,
        },
      },
      {
        returnRequestId: 12,
        orderId: 1,
        order: {
          orderId: 1,
          orderNumber: 'ORD-1',
          status: 'Delivered',
          paymentMethod: 'COD',
          totalAmount: 100000,
        },
      },
      {
        returnRequestId: 21,
        orderId: 2,
        order: {
          orderId: 2,
          orderNumber: 'ORD-2',
          status: 'Shipping',
          paymentMethod: 'COD',
          totalAmount: 200000,
        },
      },
      {
        returnRequestId: 31,
        orderId: 3,
        order: {
          orderId: 3,
          orderNumber: 'ORD-3',
          status: 'Delivered',
          paymentMethod: 'VNPAY',
          totalAmount: 300000,
        },
      },
    ]);

    expect(result.candidates).toEqual([
      {
        orderId: 1,
        orderNumber: 'ORD-1',
        paymentMethod: 'COD',
        orderStatus: 'Delivered',
        totalAmount: 100000,
        lockedReturnIds: [11, 12],
      },
    ]);
    expect(result.skippedUndeliveredOrders).toBe(1);
    expect(result.skippedNonCodOrders).toBe(1);
  });

  it('reports candidates in dry-run mode without mutating data', async () => {
    const prismaClient = {
      returnRequest: {
        findMany: jest.fn().mockResolvedValue([
          {
            returnRequestId: 41,
            orderId: 4,
            order: {
              orderId: 4,
              orderNumber: 'ORD-4',
              status: 'Delivered',
              paymentMethod: 'COD',
              totalAmount: 410000,
            },
          },
        ]),
      },
      $transaction: jest.fn(),
    } as any;

    const report = await runCodReturnLockReconciliation({
      apply: false,
      prismaClient,
      log: { info: jest.fn(), error: jest.fn() },
    });

    expect(prismaClient.$transaction).not.toHaveBeenCalled();
    expect(report).toMatchObject({
      apply: false,
      scannedLockedReturns: 1,
      candidateOrders: 1,
      reconciledOrders: 0,
      unlockedReturns: 0,
    });
    expect(report.orderSummaries).toEqual([
      expect.objectContaining({
        orderId: 4,
        orderNumber: 'ORD-4',
        lockedReturnIds: [41],
        applied: false,
        paymentAction: 'skipped',
      }),
    ]);
  });

  it('reconciles COD payments and unlocks returns in apply mode', async () => {
    const tx = {
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ paymentId: 501 }),
      },
      returnRequest: {
        findMany: jest.fn().mockResolvedValue([{ returnRequestId: 51 }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      returnRequestStatusLog: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const prismaClient = {
      returnRequest: {
        findMany: jest.fn().mockResolvedValue([
          {
            returnRequestId: 51,
            orderId: 5,
            order: {
              orderId: 5,
              orderNumber: 'ORD-5',
              status: 'Delivered',
              paymentMethod: 'COD',
              totalAmount: 510000,
            },
          },
        ]),
      },
      $transaction: jest.fn().mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    } as any;

    const report = await runCodReturnLockReconciliation({
      apply: true,
      prismaClient,
      log: { info: jest.fn(), error: jest.fn() },
    });

    expect(tx.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 5,
        paymentMethod: 'COD',
        amount: 510000,
        status: 'COMPLETED',
      }),
    });
    expect(tx.returnRequest.updateMany).toHaveBeenCalledWith({
      where: {
        returnRequestId: { in: [51] },
      },
      data: expect.objectContaining({
        status: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'NOT_APPLICABLE',
      }),
    });
    expect(tx.returnRequestStatusLog.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          returnRequestId: 51,
          fromStatus: 'PENDING_PAYMENT_CONFIRMATION',
          toStatus: 'PENDING_ADMIN_REVIEW',
          changedBy: null,
          comment: 'Backfill repair: COD payment confirmed. Return request moved to admin review.',
        }),
      ],
    });
    expect(report).toMatchObject({
      apply: true,
      scannedLockedReturns: 1,
      candidateOrders: 1,
      reconciledOrders: 1,
      unlockedReturns: 1,
    });
  });
});
