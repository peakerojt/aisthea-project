const prismaMock = {
  $transaction: jest.fn(),
};

const repoMock = {
  findOrderForReturn: jest.fn(),
  getAlreadyReturnedQtyByOrderItem: jest.fn(),
  createReturnRequest: jest.fn(),
  findByUser: jest.fn(),
  findById: jest.fn(),
  findByOrderId: jest.fn(),
  findAllAdmin: jest.fn(),
};

const notifyCustomerMock = jest.fn();

jest.mock('../../../utils/prisma', () => ({
  prisma: prismaMock,
}));

jest.mock('../repositories/return-request.repository', () => ({
  ReturnRequestRepository: jest.fn().mockImplementation(() => repoMock),
}));

jest.mock('../../../utils/notification.util', () => ({
  notifyCustomer: (...args: unknown[]) => notifyCustomerMock(...args),
}));

import { Prisma } from '../../../generated/client';
import { ReturnRequestService, ServiceError } from '../services/return-request.service';

describe('ReturnRequestService', () => {
  const service = new ReturnRequestService();
  const createTransitionTx = (currentStatus = 'REQUESTED', orderId = 12) => ({
    returnRequest: {
      findUnique: jest.fn().mockResolvedValue({
        returnRequestId: 50,
        orderId,
        status: currentStatus,
      }),
      update: jest.fn().mockResolvedValue({
        returnRequestId: 50,
        orderId,
        status: currentStatus,
      }),
    },
    returnRequestStatusLog: {
      create: jest.fn().mockResolvedValue(undefined),
    },
  });

  beforeEach(() => {
    prismaMock.$transaction.mockReset();
    repoMock.findOrderForReturn.mockReset();
    repoMock.getAlreadyReturnedQtyByOrderItem.mockReset();
    repoMock.createReturnRequest.mockReset();
    repoMock.findByUser.mockReset();
    repoMock.findById.mockReset();
    repoMock.findByOrderId.mockReset();
    repoMock.findAllAdmin.mockReset();
    notifyCustomerMock.mockReset();
  });

  it('throws ORDER_NOT_FOUND when the order does not exist', async () => {
    repoMock.findOrderForReturn.mockResolvedValueOnce(null);

    await expect(
      service.createReturnRequest(5, {
        orderId: 99,
        reason: 'OTHER',
        items: [{ orderItemId: 10, quantity: 1 }],
      }),
    ).rejects.toMatchObject({
      code: 'ORDER_NOT_FOUND',
      status: 404,
    });
  });

  it('throws ORDER_NOT_DELIVERED when the order is not yet delivered', async () => {
    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 10,
      userId: 5,
      status: 'Processing',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      items: [],
      statusHistory: [],
    });

    await expect(
      service.createReturnRequest(5, {
        orderId: 10,
        reason: 'DEFECTIVE',
        items: [{ orderItemId: 12, quantity: 1 }],
      }),
    ).rejects.toMatchObject({
      code: 'ORDER_NOT_DELIVERED',
      status: 400,
    });
  });

  it('throws FORBIDDEN when a user attempts to return another user order', async () => {
    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 10,
      userId: 999,
      status: 'DELIVERED',
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      items: [],
      statusHistory: [],
    });

    await expect(
      service.createReturnRequest(5, {
        orderId: 10,
        reason: 'DEFECTIVE',
        items: [{ orderItemId: 12, quantity: 1 }],
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('throws RETURN_WINDOW_EXPIRED when the return deadline has passed', async () => {
    const createdAt = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 10,
      userId: 5,
      status: 'DELIVERED',
      createdAt,
      items: [{ orderItemId: 12, quantity: 1, unitPrice: 100000 }],
      statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
    });

    await expect(
      service.createReturnRequest(5, {
        orderId: 10,
        reason: 'DEFECTIVE',
        items: [{ orderItemId: 12, quantity: 1 }],
      }),
    ).rejects.toMatchObject({
      code: 'RETURN_WINDOW_EXPIRED',
      status: 400,
    });
  });

  it('throws ORDER_ITEM_NOT_FOUND when a payload item does not belong to the order', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 11,
      userId: 5,
      status: 'DELIVERED',
      createdAt,
      items: [{ orderItemId: 18, quantity: 1, unitPrice: 250000 }],
      statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
    });
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({});
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn({}));

    await expect(
      service.createReturnRequest(5, {
        orderId: 11,
        reason: 'WRONG_ITEM',
        items: [{ orderItemId: 999, quantity: 1 }],
      }),
    ).rejects.toMatchObject({
      code: 'ORDER_ITEM_NOT_FOUND',
      status: 400,
    });
  });

  it('throws INVALID_RETURN_QUANTITY when requested quantity exceeds remaining allowance', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 11,
      userId: 5,
      status: 'DELIVERED',
      createdAt,
      items: [{ orderItemId: 18, quantity: 1, unitPrice: 250000 }],
      statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
    });
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({ 18: 1 });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn({}));

    await expect(
      service.createReturnRequest(5, {
        orderId: 11,
        reason: 'WRONG_ITEM',
        items: [{ orderItemId: 18, quantity: 1 }],
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_RETURN_QUANTITY',
      status: 400,
    });

    expect(repoMock.createReturnRequest).not.toHaveBeenCalled();
  });

  it('creates a return request and notifies the customer on success', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 12,
      userId: 5,
      status: 'Đã giao',
      createdAt,
      items: [{ orderItemId: 21, quantity: 2, unitPrice: 175000 }],
      statusHistory: [{ status: 'Da Giao', changedAt: deliveredAt }],
    });
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({});
    repoMock.createReturnRequest.mockResolvedValueOnce({
      returnRequestId: 44,
      orderId: 12,
      status: 'REQUESTED',
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn({}));

    const result = await service.createReturnRequest(5, {
      orderId: 12,
      reason: 'DEFECTIVE',
      note: 'broken zipper',
      items: [{ orderItemId: 21, quantity: 1 }],
      attachments: ['https://example.com/proof-1.jpg'],
    });

    expect(repoMock.createReturnRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'DEFECTIVE',
        note: 'broken zipper',
        status: 'REQUESTED',
        order: { connect: { orderId: 12 } },
        user: { connect: { userId: 5 } },
        attachments: {
          create: [{ fileUrl: 'https://example.com/proof-1.jpg' }],
        },
      }),
      {},
    );
    expect(repoMock.createReturnRequest.mock.calls[0][0].items.create).toHaveLength(1);
    expect(result).toEqual({
      returnRequestId: 44,
      orderId: 12,
      status: 'REQUESTED',
    });
    expect(notifyCustomerMock).toHaveBeenCalledWith('RETURN_REQUESTED', {
      returnRequestId: 44,
      orderId: 12,
    });
  });

  it('creates a legacy-compatible return request when the order has a single item', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn
      .mockResolvedValueOnce({
        orderId: 40,
        userId: 5,
        status: 'Delivered',
        createdAt,
        items: [{ orderItemId: 301, quantity: 1 }],
        statusHistory: [],
      })
      .mockResolvedValueOnce({
        orderId: 40,
        userId: 5,
        status: 'Delivered',
        createdAt,
        items: [{ orderItemId: 301, quantity: 1, unitPrice: 175000 }],
        statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
      });
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({});
    repoMock.createReturnRequest.mockResolvedValueOnce({
      returnRequestId: 45,
      orderId: 40,
      status: 'REQUESTED',
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn({}));

    const result = await service.createLegacyCompatibleReturnRequest(5, {
      orderId: 40,
      reason: 'Wrong item received from warehouse',
      proofImages: ['https://example.com/proof-40.jpg'],
    });

    expect(repoMock.createReturnRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { connect: { orderId: 40 } },
        user: { connect: { userId: 5 } },
        reason: 'WRONG_ITEM',
        note: 'Wrong item received from warehouse',
      }),
      {},
    );
    expect(repoMock.createReturnRequest.mock.calls[0][0].items.create).toEqual([
      {
        orderItem: { connect: { orderItemId: 301 } },
        quantity: 1,
        unitPrice: 175000,
        reason: 'WRONG_ITEM',
      },
    ]);
    expect(result).toEqual({
      returnRequestId: 45,
      orderId: 40,
      status: 'REQUESTED',
    });
  });

  it('creates a legacy-compatible return request when a multi-item order has exactly one remaining returnable item', async () => {
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deliveredAt = new Date(Date.now() - 24 * 60 * 60 * 1000);

    repoMock.findOrderForReturn
      .mockResolvedValueOnce({
        orderId: 41,
        userId: 5,
        status: 'Delivered',
        createdAt,
        items: [
          { orderItemId: 401, quantity: 1 },
          { orderItemId: 402, quantity: 2 },
        ],
        statusHistory: [],
      })
      .mockResolvedValueOnce({
        orderId: 41,
        userId: 5,
        status: 'Delivered',
        createdAt,
        items: [
          { orderItemId: 401, quantity: 1, unitPrice: 150000 },
          { orderItemId: 402, quantity: 2, unitPrice: 175000 },
        ],
        statusHistory: [{ status: 'DELIVERED', changedAt: deliveredAt }],
      });
    repoMock.getAlreadyReturnedQtyByOrderItem
      .mockResolvedValueOnce({ 401: 1, 402: 1 })
      .mockResolvedValueOnce({ 402: 1 });
    repoMock.createReturnRequest.mockResolvedValueOnce({
      returnRequestId: 46,
      orderId: 41,
      status: 'REQUESTED',
    });
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn({}));

    const result = await service.createLegacyCompatibleReturnRequest(5, {
      orderId: 41,
      reason: 'Defective packaging',
      proofImages: ['https://example.com/proof-41.jpg'],
    });

    expect(repoMock.createReturnRequest.mock.calls[0][0].items.create).toEqual([
      {
        orderItem: { connect: { orderItemId: 402 } },
        quantity: 1,
        unitPrice: 175000,
        reason: 'DEFECTIVE',
      },
    ]);
    expect(result).toEqual({
      returnRequestId: 46,
      orderId: 41,
      status: 'REQUESTED',
    });
  });

  it('rejects legacy-compatible create when the order needs explicit item selection', async () => {
    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 41,
      userId: 5,
      status: 'Delivered',
      createdAt: new Date(),
      items: [
        { orderItemId: 401, quantity: 1 },
        { orderItemId: 402, quantity: 1 },
      ],
      statusHistory: [],
    });

    await expect(
      service.createLegacyCompatibleReturnRequest(5, {
        orderId: 41,
        reason: 'Defective items',
        proofImages: [],
      }),
    ).rejects.toMatchObject({
      code: 'LEGACY_CREATE_REQUIRES_ITEM_SELECTION',
      status: 409,
    });

    expect(repoMock.createReturnRequest).not.toHaveBeenCalled();
  });

  it('rejects legacy-compatible create when no returnable items remain after previous returns', async () => {
    repoMock.findOrderForReturn.mockResolvedValueOnce({
      orderId: 42,
      userId: 5,
      status: 'Delivered',
      createdAt: new Date(),
      items: [
        { orderItemId: 501, quantity: 1 },
        { orderItemId: 502, quantity: 2 },
      ],
      statusHistory: [],
    });
    repoMock.getAlreadyReturnedQtyByOrderItem.mockResolvedValueOnce({
      501: 1,
      502: 2,
    });

    await expect(
      service.createLegacyCompatibleReturnRequest(5, {
        orderId: 42,
        reason: 'Defective items',
        proofImages: [],
      }),
    ).rejects.toMatchObject({
      code: 'LEGACY_CREATE_REQUIRES_ITEM_SELECTION',
      status: 409,
    });

    expect(repoMock.createReturnRequest).not.toHaveBeenCalled();
  });

  it('approves a return request and notifies the customer', async () => {
    const tx = createTransitionTx('REQUESTED', 700);
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.approveReturnRequest(50, 88);

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 50 },
      data: { status: 'APPROVED', updatedAt: expect.any(Date) },
    });
    expect(tx.returnRequestStatusLog.create).toHaveBeenCalledWith({
      data: {
        returnRequestId: 50,
        fromStatus: 'REQUESTED',
        toStatus: 'APPROVED',
        changedBy: 88,
        comment: 'Approved by support/admin',
      },
    });
    expect(result).toEqual({
      returnRequestId: 50,
      orderId: 700,
      status: 'REQUESTED',
    });
    expect(notifyCustomerMock).toHaveBeenCalledWith('RETURN_APPROVED', {
      returnRequestId: 50,
      orderId: 700,
    });
  });

  it('rejects a return request and notifies the customer with the comment', async () => {
    const tx = createTransitionTx('REQUESTED', 701);
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.rejectReturnRequest(51, 89, 'Out of policy');

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 51 },
      data: { status: 'REJECTED', updatedAt: expect.any(Date) },
    });
    expect(tx.returnRequestStatusLog.create).toHaveBeenCalledWith({
      data: {
        returnRequestId: 51,
        fromStatus: 'REQUESTED',
        toStatus: 'REJECTED',
        changedBy: 89,
        comment: 'Out of policy',
      },
    });
    expect(result).toEqual({
      returnRequestId: 50,
      orderId: 701,
      status: 'REQUESTED',
    });
    expect(notifyCustomerMock).toHaveBeenCalledWith('RETURN_REJECTED', {
      returnRequestId: 51,
      orderId: 701,
      comment: 'Out of policy',
    });
  });

  it('marks a return request as received and notifies the customer', async () => {
    const tx = createTransitionTx('APPROVED', 702);
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await service.markReturnReceived(52, 90);

    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 52 },
      data: { status: 'RECEIVED', updatedAt: expect.any(Date) },
    });
    expect(tx.returnRequestStatusLog.create).toHaveBeenCalledWith({
      data: {
        returnRequestId: 52,
        fromStatus: 'APPROVED',
        toStatus: 'RECEIVED',
        changedBy: 90,
        comment: 'Warehouse confirmed return package received',
      },
    });
    expect(result).toEqual({
      returnRequestId: 50,
      orderId: 702,
      status: 'APPROVED',
    });
    expect(notifyCustomerMock).toHaveBeenCalledWith('RETURN_RECEIVED', {
      returnRequestId: 52,
      orderId: 702,
    });
  });

  it('throws INVALID_STATE_TRANSITION when mark-received is called before approval', async () => {
    const tx = createTransitionTx('REQUESTED', 702);
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(service.markReturnReceived(52, 90)).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
      status: 400,
    });

    expect(tx.returnRequest.update).not.toHaveBeenCalled();
    expect(notifyCustomerMock).not.toHaveBeenCalled();
  });

  it('returns the existing refund transaction when the idempotency key already exists', async () => {
    const existingRefund = {
      refundTransactionId: 90,
      amount: new Prisma.Decimal(150000),
      method: 'WALLET_CREDIT',
      status: 'COMPLETED',
      idempotencyKey: 'dup-key-1234',
      transactionRef: 'RF-12-dup',
    };
    const tx = {
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(existingRefund),
        create: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
    repoMock.findById.mockResolvedValueOnce({ orderId: 12 });

    const result = await service.refundReturnRequest(12, 99, {
      method: 'WALLET_CREDIT',
      idempotencyKey: 'dup-key-1234',
    });

    expect(result).toBe(existingRefund);
    expect(tx.refundTransaction.create).not.toHaveBeenCalled();
    expect(tx.returnRequest.update).not.toHaveBeenCalled();
  });

  it('throws INVALID_REFUND_AMOUNT when refund amount exceeds the allowed total', async () => {
    const tx = {
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 50,
          status: 'RECEIVED',
          totalRefundAmount: new Prisma.Decimal(150000),
        }),
        update: jest.fn(),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(
      service.refundReturnRequest(50, 99, {
        method: 'ORIGINAL_PAYMENT',
        amount: 200000,
        idempotencyKey: 'refund-key-200000',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_REFUND_AMOUNT',
      status: 400,
    });

    expect(tx.refundTransaction.create).not.toHaveBeenCalled();
    expect(tx.returnRequest.update).not.toHaveBeenCalled();
  });

  it('throws RETURN_REQUEST_NOT_FOUND when refund target does not exist', async () => {
    const tx = {
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(
      service.refundReturnRequest(404, 99, {
        method: 'ORIGINAL_PAYMENT',
        idempotencyKey: 'refund-key-missing',
      }),
    ).rejects.toMatchObject({
      code: 'RETURN_REQUEST_NOT_FOUND',
      status: 404,
    });

    expect(tx.refundTransaction.create).not.toHaveBeenCalled();
    expect(tx.returnRequest.update).not.toHaveBeenCalled();
  });

  it('throws INVALID_STATE_TRANSITION when refund is attempted before the return is received', async () => {
    const tx = {
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 50,
          status: 'REQUESTED',
          totalRefundAmount: new Prisma.Decimal(150000),
        }),
        update: jest.fn(),
      },
      returnRequestStatusLog: {
        create: jest.fn(),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    await expect(
      service.refundReturnRequest(50, 99, {
        method: 'ORIGINAL_PAYMENT',
        idempotencyKey: 'refund-key-requested',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_STATE_TRANSITION',
      status: 400,
    });

    expect(tx.refundTransaction.create).not.toHaveBeenCalled();
    expect(tx.returnRequest.update).not.toHaveBeenCalled();
  });

  it('creates a refund transaction, updates status, and notifies the customer', async () => {
    const tx = {
      refundTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          refundTransactionId: 101,
          amount: new Prisma.Decimal(150000),
          method: 'ORIGINAL_PAYMENT',
          status: 'COMPLETED',
          idempotencyKey: 'refund-key-1234',
          transactionRef: 'RF-55-101',
        }),
      },
      returnRequest: {
        findUnique: jest.fn().mockResolvedValue({
          returnRequestId: 55,
          orderId: 700,
          status: 'RECEIVED',
          totalRefundAmount: new Prisma.Decimal(150000),
        }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      returnRequestStatusLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));
    repoMock.findById.mockResolvedValueOnce({ orderId: 700 });

    const result = await service.refundReturnRequest(55, 88, {
      method: 'ORIGINAL_PAYMENT',
      amount: 150000,
      idempotencyKey: 'refund-key-1234',
    });

    expect(tx.refundTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        returnRequestId: 55,
        method: 'ORIGINAL_PAYMENT',
        status: 'COMPLETED',
        idempotencyKey: 'refund-key-1234',
        processedBy: 88,
      }),
    });
    expect(tx.returnRequest.update).toHaveBeenCalledWith({
      where: { returnRequestId: 55 },
      data: { status: 'REFUNDED' },
    });
    expect(tx.returnRequestStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        returnRequestId: 55,
        fromStatus: 'RECEIVED',
        toStatus: 'REFUNDED',
        changedBy: 88,
      }),
    });
    expect(result).toMatchObject({
      refundTransactionId: 101,
      method: 'ORIGINAL_PAYMENT',
      status: 'COMPLETED',
    });
    expect(notifyCustomerMock).toHaveBeenCalledWith('RETURN_REFUNDED', {
      returnRequestId: 55,
      orderId: 700,
      refundAmount: 150000,
      refundMethod: 'ORIGINAL_PAYMENT',
    });
  });

  it('forwards customer return queries to the repository', async () => {
    repoMock.findByUser.mockResolvedValueOnce({
      data: [{ returnRequestId: 91 }],
      pagination: { page: 2, limit: 5, total: 1 },
    });

    const result = await service.getMyReturns(12, 2, 5);

    expect(repoMock.findByUser).toHaveBeenCalledWith(12, 2, 5);
    expect(result).toEqual({
      data: [{ returnRequestId: 91 }],
      pagination: { page: 2, limit: 5, total: 1 },
    });
  });

  it('forwards return detail lookups to the repository', async () => {
    repoMock.findById.mockResolvedValueOnce({
      returnRequestId: 92,
      orderId: 701,
    });

    const result = await service.getReturnDetail(92);

    expect(repoMock.findById).toHaveBeenCalledWith(92);
    expect(result).toEqual({
      returnRequestId: 92,
      orderId: 701,
    });
  });

  it('forwards order-based return detail lookups to the repository', async () => {
    repoMock.findByOrderId.mockResolvedValueOnce({
      returnRequestId: 94,
      orderId: 702,
    });

    const result = await service.getReturnDetailByOrderId(702);

    expect(repoMock.findByOrderId).toHaveBeenCalledWith(702);
    expect(result).toEqual({
      returnRequestId: 94,
      orderId: 702,
    });
  });

  it('forwards admin return queries to the repository', async () => {
    const filters = { page: 1, limit: 20, status: 'REQUESTED' as const };
    repoMock.findAllAdmin.mockResolvedValueOnce({
      data: [{ returnRequestId: 93 }],
      pagination: { page: 1, limit: 20, total: 1 },
    });

    const result = await service.getAdminReturns(filters);

    expect(repoMock.findAllAdmin).toHaveBeenCalledWith(filters);
    expect(result).toEqual({
      data: [{ returnRequestId: 93 }],
      pagination: { page: 1, limit: 20, total: 1 },
    });
  });
});
