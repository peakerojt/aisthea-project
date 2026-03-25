const prismaMock = {
  $transaction: jest.fn(),
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  orderReturn: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('../../utils/prisma', () => ({
  prisma: prismaMock,
}));

import {
  ReturnError,
  getReturnForOrder,
  listReturns,
  processReturn,
  requestReturn,
} from '../return.service';

describe('return.service', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockReset();
    prismaMock.order.findUnique.mockReset();
    prismaMock.order.update.mockReset();
    prismaMock.orderReturn.findUnique.mockReset();
    prismaMock.orderReturn.update.mockReset();
    prismaMock.orderReturn.findMany.mockReset();
    prismaMock.orderReturn.count.mockReset();
  });

  it('throws ORDER_NOT_FOUND when requestReturn cannot load the order', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce(null);

    await expect(
      requestReturn(99, 7, ['Customer'], 'Wrong item', []),
    ).rejects.toMatchObject({
      code: 'ORDER_NOT_FOUND',
      status: 404,
    });
  });

  it('throws FORBIDDEN when a non-admin requests return for another user order', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 12,
      userId: 99,
      status: 'Delivered',
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      orderReturn: null,
    });

    await expect(
      requestReturn(12, 7, ['Customer'], 'Wrong item', []),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    });
  });

  it('throws ORDER_NOT_DELIVERED when requestReturn is called before delivery', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 13,
      userId: 7,
      status: 'Shipping',
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      orderReturn: null,
    });

    await expect(
      requestReturn(13, 7, ['Customer'], 'Wrong item', []),
    ).rejects.toMatchObject({
      code: 'ORDER_NOT_DELIVERED',
      status: 400,
    });
  });

  it('throws RETURN_WINDOW_EXPIRED when the delivery is outside the return window', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 14,
      userId: 7,
      status: 'Delivered',
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      orderReturn: null,
    });

    await expect(
      requestReturn(14, 7, ['Customer'], 'Wrong item', []),
    ).rejects.toMatchObject({
      code: 'RETURN_WINDOW_EXPIRED',
      status: 400,
    });
  });

  it('throws RETURN_ALREADY_EXISTS when the order already has a return request', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 16,
      userId: 7,
      status: 'Delivered',
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      orderReturn: { returnId: 1 },
    });

    await expect(
      requestReturn(16, 7, ['Customer'], 'Wrong item', []),
    ).rejects.toMatchObject({
      code: 'RETURN_ALREADY_EXISTS',
      status: 400,
    });
  });

  it('creates a return request and updates order history for eligible orders', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 15,
      userId: 7,
      status: 'Delivered',
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      orderReturn: null,
    });

    const tx = {
      orderReturn: {
        create: jest.fn().mockResolvedValue({ returnId: 41, status: 'PENDING_APPROVAL' }),
      },
      order: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await requestReturn(15, 7, ['Customer'], 'Wrong item', ['https://example.com/proof-1.jpg']);

    expect(tx.orderReturn.create).toHaveBeenCalledWith({
      data: {
        orderId: 15,
        userId: 7,
        reason: 'Wrong item',
        proofImages: '["https://example.com/proof-1.jpg"]',
        status: 'PENDING_APPROVAL',
      },
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { orderId: 15 },
      data: { status: 'Return_Requested' },
    });
    expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 15,
        oldStatus: 'Delivered',
        status: 'Return_Requested',
        changedBy: 7,
      }),
    });
    expect(result).toEqual({ returnId: 41, status: 'PENDING_APPROVAL' });
  });

  it('rejects a return and restores order status to Delivered', async () => {
    prismaMock.orderReturn.findUnique.mockResolvedValueOnce({
      returnId: 22,
      orderId: 55,
      order: { status: 'Return_Requested', items: [] },
    });

    const tx = {
      orderReturn: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      order: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await processReturn(22, 9, 'REJECT', 'Policy mismatch');

    expect(tx.orderReturn.update).toHaveBeenCalledWith({
      where: { returnId: 22 },
      data: { status: 'REJECTED', adminNote: 'Policy mismatch' },
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { orderId: 55 },
      data: { status: 'Delivered' },
    });
    expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 55,
        oldStatus: 'Return_Requested',
        status: 'Delivered',
        changedBy: 9,
        note: 'Return rejected: Policy mismatch',
      }),
    });
    expect(result).toEqual({ success: true, code: 'RETURN_REJECTED' });
  });

  it('throws RETURN_NOT_FOUND when processReturn cannot load the request', async () => {
    prismaMock.orderReturn.findUnique.mockResolvedValueOnce(null);

    await expect(
      processReturn(404, 9, 'APPROVE'),
    ).rejects.toMatchObject({
      code: 'RETURN_NOT_FOUND',
      status: 404,
    });
  });

  it('approves a return request with optional admin note', async () => {
    prismaMock.orderReturn.findUnique.mockResolvedValueOnce({
      returnId: 25,
      orderId: 60,
      order: { status: 'Return_Requested', items: [] },
    });
    prismaMock.orderReturn.update.mockResolvedValueOnce(undefined);

    const result = await processReturn(25, 9, 'APPROVE', 'Verified evidence');

    expect(prismaMock.orderReturn.update).toHaveBeenCalledWith({
      where: { returnId: 25 },
      data: {
        status: 'APPROVED',
        adminNote: 'Verified evidence',
      },
    });
    expect(result).toEqual({ success: true, code: 'RETURN_APPROVED' });
  });

  it('completes refund, restores stock, and logs inventory changes', async () => {
    prismaMock.orderReturn.findUnique.mockResolvedValueOnce({
      returnId: 30,
      orderId: 80,
      order: {
        status: 'Return_Requested',
        items: [
          { variantId: 11, quantity: 2, variant: {} },
          { variantId: null, quantity: 1, variant: null },
        ],
      },
    });

    const tx = {
      orderReturn: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      order: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      productVariant: {
        findUnique: jest.fn().mockResolvedValue({ stockQuantity: 5 }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      inventoryLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => fn(tx));

    const result = await processReturn(30, 9, 'COMPLETE_REFUND', 'Checked and approved');

    expect(tx.orderReturn.update).toHaveBeenCalledWith({
      where: { returnId: 30 },
      data: { status: 'COMPLETED', adminNote: 'Checked and approved' },
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { orderId: 80 },
      data: { status: 'Returned' },
    });
    expect(tx.productVariant.findUnique).toHaveBeenCalledWith({
      where: { variantId: 11 },
      select: { stockQuantity: true },
    });
    expect(tx.productVariant.update).toHaveBeenCalledWith({
      where: { variantId: 11 },
      data: { stockQuantity: { increment: 2 } },
    });
    expect(tx.inventoryLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        variantId: 11,
        orderId: 80,
        userId: 9,
        changeQuantity: 2,
        previousStock: 5,
        newStock: 7,
        reason: 'RETURN_RESTORE',
      }),
    });
    expect(result).toEqual({ success: true, code: 'REFUND_COMPLETED' });
  });

  it('returns paginated admin returns with parsed proofImages', async () => {
    prismaMock.orderReturn.findMany.mockResolvedValueOnce([
      { returnId: 1, proofImages: '["https://example.com/proof-1.jpg"]' },
      { returnId: 2, proofImages: 'not-json' },
    ]);
    prismaMock.orderReturn.count.mockResolvedValueOnce(2);

    const result = await listReturns({ status: 'PENDING_APPROVAL', page: 2, pageSize: 1 });

    expect(prismaMock.orderReturn.findMany).toHaveBeenCalledWith({
      where: { status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' },
      skip: 1,
      take: 1,
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            customerName: true,
            customerPhone: true,
          },
        },
        user: {
          select: {
            userId: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    expect(result).toEqual({
      returns: [
        { returnId: 1, proofImages: ['https://example.com/proof-1.jpg'] },
        { returnId: 2, proofImages: [] },
      ],
      pagination: {
        page: 2,
        pageSize: 1,
        total: 2,
        totalPages: 2,
      },
    });
  });

  it('uses default pagination and no status filter when filters are omitted', async () => {
    prismaMock.orderReturn.findMany.mockResolvedValueOnce([]);
    prismaMock.orderReturn.count.mockResolvedValueOnce(0);

    const result = await listReturns();

    expect(prismaMock.orderReturn.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            customerName: true,
            customerPhone: true,
          },
        },
        user: {
          select: {
            userId: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('treats the ALL sentinel like no legacy status filter', async () => {
    prismaMock.orderReturn.findMany.mockResolvedValueOnce([]);
    prismaMock.orderReturn.count.mockResolvedValueOnce(0);

    const result = await listReturns({ status: 'ALL', page: 2, pageSize: 5 });

    expect(prismaMock.orderReturn.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
      skip: 5,
      take: 5,
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            customerName: true,
            customerPhone: true,
          },
        },
        user: {
          select: {
            userId: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 5,
      total: 0,
      totalPages: 0,
    });
  });

  it('clamps invalid pagination inputs and keeps the normalized read shape', async () => {
    prismaMock.orderReturn.findMany.mockResolvedValueOnce([
      { returnId: 20, proofImages: '[]' },
    ]);
    prismaMock.orderReturn.count.mockResolvedValueOnce(1);

    const result = await listReturns({ status: 'REJECTED', page: 0, pageSize: 999 });

    expect(prismaMock.orderReturn.findMany).toHaveBeenCalledWith({
      where: { status: 'REJECTED' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 50,
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            customerName: true,
            customerPhone: true,
          },
        },
        user: {
          select: {
            userId: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    expect(result).toEqual({
      returns: [{ returnId: 20, proofImages: [] }],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('keeps the last page shape stable for filtered legacy return reads', async () => {
    prismaMock.orderReturn.findMany.mockResolvedValueOnce([
      { returnId: 31, proofImages: '[]' },
      { returnId: 32, proofImages: '[]' },
    ]);
    prismaMock.orderReturn.count.mockResolvedValueOnce(5);

    const result = await listReturns({ status: 'APPROVED', page: 3, pageSize: 2 });

    expect(prismaMock.orderReturn.findMany).toHaveBeenCalledWith({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      skip: 4,
      take: 2,
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            customerName: true,
            customerPhone: true,
          },
        },
        user: {
          select: {
            userId: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    expect(result.pagination).toEqual({
      page: 3,
      pageSize: 2,
      total: 5,
      totalPages: 3,
    });
  });

  it('returns an empty filtered page without changing the pagination contract', async () => {
    prismaMock.orderReturn.findMany.mockResolvedValueOnce([]);
    prismaMock.orderReturn.count.mockResolvedValueOnce(0);

    const result = await listReturns({ status: 'COMPLETED', page: 4, pageSize: 10 });

    expect(prismaMock.orderReturn.findMany).toHaveBeenCalledWith({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      skip: 30,
      take: 10,
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            customerName: true,
            customerPhone: true,
          },
        },
        user: {
          select: {
            userId: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
    expect(result).toEqual({
      returns: [],
      pagination: {
        page: 4,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      },
    });
  });

  it('locks current parseProofImages behavior for empty, nullish, object, and malformed values', async () => {
    prismaMock.orderReturn.findMany.mockResolvedValueOnce([
      { returnId: 10, proofImages: '[]' },
      { returnId: 11, proofImages: null },
      { returnId: 12, proofImages: undefined },
      { returnId: 13, proofImages: '{"url":"https://example.com/proof-13.jpg"}' },
      { returnId: 14, proofImages: 'not-json' },
    ]);
    prismaMock.orderReturn.count.mockResolvedValueOnce(5);

    const result = await listReturns({ page: 1, pageSize: 10 });

    expect(result.returns).toEqual([
      { returnId: 10, proofImages: [] },
      { returnId: 11, proofImages: null },
      { returnId: 12, proofImages: [] },
      { returnId: 13, proofImages: { url: 'https://example.com/proof-13.jpg' } },
      { returnId: 14, proofImages: [] },
    ]);
  });

  it('returns null or parsed proofImages when loading a return by order id', async () => {
    prismaMock.orderReturn.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        returnId: 77,
        orderId: 88,
        proofImages: '["https://example.com/proof-77.jpg"]',
      });

    expect(await getReturnForOrder(88)).toBeNull();
    expect(await getReturnForOrder(88)).toEqual({
      returnId: 77,
      orderId: 88,
      proofImages: ['https://example.com/proof-77.jpg'],
    });
  });

  it('locks current proofImages parsing for getReturnForOrder nullish and malformed data', async () => {
    prismaMock.orderReturn.findUnique
      .mockResolvedValueOnce({
        returnId: 78,
        orderId: 89,
        proofImages: null,
      })
      .mockResolvedValueOnce({
        returnId: 79,
        orderId: 90,
        proofImages: undefined,
      })
      .mockResolvedValueOnce({
        returnId: 80,
        orderId: 91,
        proofImages: '{"url":"https://example.com/proof-80.jpg"}',
      })
      .mockResolvedValueOnce({
        returnId: 81,
        orderId: 92,
        proofImages: 'not-json',
      });

    expect(await getReturnForOrder(89)).toEqual({
      returnId: 78,
      orderId: 89,
      proofImages: null,
    });
    expect(await getReturnForOrder(90)).toEqual({
      returnId: 79,
      orderId: 90,
      proofImages: [],
    });
    expect(await getReturnForOrder(91)).toEqual({
      returnId: 80,
      orderId: 91,
      proofImages: { url: 'https://example.com/proof-80.jpg' },
    });
    expect(await getReturnForOrder(92)).toEqual({
      returnId: 81,
      orderId: 92,
      proofImages: [],
    });
  });

  it('keeps empty-array proofImages stable for getReturnForOrder', async () => {
    prismaMock.orderReturn.findUnique.mockResolvedValueOnce({
      returnId: 82,
      orderId: 93,
      proofImages: '[]',
    });

    expect(await getReturnForOrder(93)).toEqual({
      returnId: 82,
      orderId: 93,
      proofImages: [],
    });
  });

  it('throws INVALID_ACTION for unsupported processReturn actions', async () => {
    prismaMock.orderReturn.findUnique.mockResolvedValueOnce({
      returnId: 31,
      orderId: 81,
      order: { status: 'Return_Requested', items: [] },
    });

    await expect(
      processReturn(31, 9, 'UNKNOWN' as 'APPROVE'),
    ).rejects.toMatchObject({
      code: 'INVALID_ACTION',
      status: 400,
    });
  });
});
