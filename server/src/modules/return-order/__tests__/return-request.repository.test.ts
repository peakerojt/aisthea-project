const prismaMock = {
  order: {
    findUnique: jest.fn(),
  },
  returnRequest: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('../../../utils/prisma', () => ({
  prisma: prismaMock,
}));

import { ReturnRequestRepository } from '../repositories/return-request.repository';

describe('ReturnRequestRepository', () => {
  const repository = new ReturnRequestRepository();

  beforeEach(() => {
    prismaMock.order.findUnique.mockReset();
    prismaMock.returnRequest.create.mockReset();
    prismaMock.returnRequest.findUnique.mockReset();
    prismaMock.returnRequest.findFirst.mockReset();
    prismaMock.returnRequest.findMany.mockReset();
    prismaMock.returnRequest.count.mockReset();
  });

  it('returns an empty object when returnRequestItem.groupBy is unavailable', async () => {
    const result = await repository.getAlreadyReturnedQtyByOrderItem([10, 11], {});

    expect(result).toEqual({});
  });

  it('aggregates returned quantities by order item when groupBy is available', async () => {
    const tx = {
      returnRequestItem: {
        groupBy: jest.fn().mockResolvedValue([
          { orderItemId: 10, _sum: { quantity: 2 } },
          { orderItemId: 11, _sum: { quantity: 1 } },
        ]),
      },
    };

    const result = await repository.getAlreadyReturnedQtyByOrderItem([10, 11], tx);

    expect(tx.returnRequestItem.groupBy).toHaveBeenCalledWith({
      by: ['orderItemId'],
      where: {
        orderItemId: { in: [10, 11] },
        returnRequest: {
          status: { in: ['REQUESTED', 'APPROVED', 'RECEIVED', 'REFUNDED'] },
        },
      },
      _sum: { quantity: true },
    });
    expect(result).toEqual({ 10: 2, 11: 1 });
  });

  it('creates a return request with the expected include graph', async () => {
    const tx = {
      returnRequest: {
        create: jest.fn().mockResolvedValue({ returnRequestId: 7 }),
      },
    };
    const payload = {
      orderId: 12,
      status: 'REQUESTED',
    };

    const result = await repository.createReturnRequest(payload, tx);

    expect(tx.returnRequest.create).toHaveBeenCalledWith({
      data: payload,
      include: {
        items: { include: { orderItem: true } },
        attachments: true,
        statusLogs: { orderBy: { createdAt: 'asc' } },
      },
    });
    expect(result).toEqual({ returnRequestId: 7 });
  });

  it('queries paginated customer returns with order, item, and attachment relations', async () => {
    prismaMock.returnRequest.findMany.mockResolvedValueOnce([{ returnRequestId: 1 }]);
    prismaMock.returnRequest.count.mockResolvedValueOnce(23);

    const result = await repository.findByUser(7, 2, 10);

    expect(prismaMock.returnRequest.findMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      skip: 10,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        order: { select: { orderId: true, orderNumber: true, totalAmount: true } },
        items: { include: { orderItem: true } },
        attachments: true,
      },
    });
    expect(prismaMock.returnRequest.count).toHaveBeenCalledWith({
      where: { userId: 7 },
    });
    expect(result).toEqual({
      data: [{ returnRequestId: 1 }],
      total: 23,
      page: 2,
      limit: 10,
      totalPages: 3,
    });
  });

  it('loads the latest return request detail by order id', async () => {
    prismaMock.returnRequest.findFirst.mockResolvedValueOnce({ returnRequestId: 88, orderId: 12 });

    const result = await repository.findByOrderId(12);

    expect(prismaMock.returnRequest.findFirst).toHaveBeenCalledWith({
      where: { orderId: 12 },
      orderBy: { createdAt: 'desc' },
      include: {
        order: true,
        user: { select: { userId: true, fullName: true, email: true } },
        items: { include: { orderItem: true } },
        attachments: true,
        statusLogs: {
          include: { changedByUser: { select: { userId: true, fullName: true } } },
          orderBy: { createdAt: 'asc' },
        },
        refundTransactions: { orderBy: { createdAt: 'desc' } },
      },
    });
    expect(result).toEqual({ returnRequestId: 88, orderId: 12 });
  });

  it('loads a return request detail by id with related entities and sorted logs', async () => {
    prismaMock.returnRequest.findUnique.mockResolvedValueOnce({
      returnRequestId: 66,
      orderId: 44,
    });

    const result = await repository.findById(66);

    expect(prismaMock.returnRequest.findUnique).toHaveBeenCalledWith({
      where: { returnRequestId: 66 },
      include: {
        order: true,
        user: { select: { userId: true, fullName: true, email: true } },
        items: { include: { orderItem: true } },
        attachments: true,
        statusLogs: {
          include: { changedByUser: { select: { userId: true, fullName: true } } },
          orderBy: { createdAt: 'asc' },
        },
        refundTransactions: { orderBy: { createdAt: 'desc' } },
      },
    });
    expect(result).toEqual({
      returnRequestId: 66,
      orderId: 44,
    });
  });

  it('builds admin filters for status, customer, order, and date range with admin list relations', async () => {
    prismaMock.returnRequest.findMany.mockResolvedValueOnce([{ returnRequestId: 9 }]);
    prismaMock.returnRequest.count.mockResolvedValueOnce(1);

    const filters = {
      status: 'RECEIVED' as const,
      orderId: 55,
      customerId: 7,
      fromDate: new Date('2026-03-01T00:00:00.000Z'),
      toDate: new Date('2026-03-10T00:00:00.000Z'),
      page: 3,
      limit: 5,
    };

    const result = await repository.findAllAdmin(filters);

    expect(prismaMock.returnRequest.findMany).toHaveBeenCalledWith({
      where: {
        status: 'RECEIVED',
        orderId: 55,
        userId: 7,
        createdAt: {
          gte: new Date('2026-03-01T00:00:00.000Z'),
          lte: new Date('2026-03-10T00:00:00.000Z'),
        },
      },
      skip: 10,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { userId: true, fullName: true, email: true, avatarUrl: true } },
        order: {
          select: {
            orderId: true,
            orderNumber: true,
            totalAmount: true,
            customerName: true,
            customerPhone: true,
          },
        },
        items: true,
        attachments: true,
      },
    });
    expect(prismaMock.returnRequest.count).toHaveBeenCalledWith({
      where: {
        status: 'RECEIVED',
        orderId: 55,
        userId: 7,
        createdAt: {
          gte: new Date('2026-03-01T00:00:00.000Z'),
          lte: new Date('2026-03-10T00:00:00.000Z'),
        },
      },
    });
    expect(result).toEqual({
      data: [{ returnRequestId: 9 }],
      total: 1,
      page: 3,
      limit: 5,
      totalPages: 1,
    });
  });
});
