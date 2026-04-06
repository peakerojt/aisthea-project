const prismaMock = {
  order: {
    findUnique: jest.fn(),
  },
  cart: {
    findFirst: jest.fn(),
  },
  cartItem: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const createOrderServiceMock = jest.fn();
const emitNewOrderMock = jest.fn();
const getRefundsForOrderMock = jest.fn();
const uploadBase64Mock = jest.fn();
const findManyOrdersMock = jest.fn();
const countOrdersByStatusMock = jest.fn();

jest.mock('../../utils/prisma', () => ({
  prisma: prismaMock,
}));

jest.mock('../../modules/order/order.repository', () => ({
  findManyOrders: (...args: unknown[]) => findManyOrdersMock(...args),
  countOrdersByStatus: (...args: unknown[]) => countOrdersByStatusMock(...args),
}));

jest.mock('../../modules/order/order.service', () => ({
  createOrder: (...args: unknown[]) => createOrderServiceMock(...args),
}));

jest.mock('../../socket', () => ({
  emitNewOrder: (...args: unknown[]) => emitNewOrderMock(...args),
  emitOrderStatusUpdated: jest.fn(),
}));

jest.mock('../../services/refund.service', () => ({
  getRefundsForOrder: (...args: unknown[]) => getRefundsForOrderMock(...args),
}));

jest.mock('../../services/cloudinary.service', () => ({
  cloudinaryService: {
    uploadBase64: (...args: unknown[]) => uploadBase64Mock(...args),
  },
}));

import {
  confirmReceipt,
  createOrder,
  getAdminOrderDetail,
  getAdminOrderTabCounts,
  uploadReturnProofImages,
} from '../order.controller';

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('order.controller confirmReceipt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findManyOrdersMock.mockReset();
    countOrdersByStatusMock.mockReset();
    prismaMock.cart.findFirst.mockResolvedValue(null);
    prismaMock.cartItem.deleteMany.mockResolvedValue({ count: 0 });
    getRefundsForOrderMock.mockResolvedValue({
      refunds: [],
      summary: {
        totalCollected: 0,
        totalRefunded: 0,
        remainingRefundable: 0,
      },
    });
    uploadBase64Mock.mockResolvedValue({
      secureUrl: 'https://cdn.example.com/proof-1.jpg',
      width: 1200,
      height: 900,
    });
  });

  it('returns aggregated admin tab counts from one repository call', async () => {
    countOrdersByStatusMock.mockResolvedValue({
      total: 12,
      counts: {
        Pending: 4,
        Processing: 3,
        Shipping: 2,
        Delivered: 2,
      },
    });

    const req: any = {
      query: {
        search: 'ORD',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      },
      originalUrl: '/api/orders/admin/tab-counts?search=ORD',
    };
    const res = createResponse();

    await getAdminOrderTabCounts(req, res);

    expect(countOrdersByStatusMock).toHaveBeenCalledWith({
      search: 'ORD',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    });
    expect(res.json).toHaveBeenCalledWith({
      data: {
        ALL: 12,
        Pending: 4,
        Processing: 3,
        Shipping: 2,
        Delivered: 2,
        Cancelled: 0,
      },
    });
  });

  it('returns PENDING_VNPAY from checkout when the service already resolved the canonical VNPay pending state', async () => {
    createOrderServiceMock.mockResolvedValue({
      id: '321',
      orderCode: 'ORD-321',
      trackingCode: 'ORD-321',
      status: 'Pending',
      paymentStatus: 'PENDING_VNPAY',
      paymentMethod: 'VNPAY',
      pricing: {
        itemsTotal: 450000,
        shippingFee: 15000,
        discount: 0,
        tax: 0,
        grandTotal: 465000,
      },
    });

    const req: any = {
      user: { userId: 5, roles: ['Customer'] },
      body: {
        items: [{ variantId: 11, quantity: 1 }],
        paymentMethod: 'VNPAY',
        customerName: 'Khach Hang',
        customerEmail: 'khach@example.com',
        customerPhone: '0900000000',
        shippingCity: 'Da Nang',
        shippingDistrict: 'Hai Chau',
        shippingWard: null,
        shippingAddressDetail: '123 Test',
        shippingCityCode: '48',
        shippingMethod: 'STANDARD',
        note: null,
      },
    };
    const res = createResponse();

    await createOrder(req, res);

    expect(createOrderServiceMock).toHaveBeenCalledWith(
      { userId: 5, roles: ['Customer'] },
      expect.objectContaining({
        paymentMethod: 'VNPAY',
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        code: 'ORDER_CREATED',
        orderId: 321,
        paymentMethod: 'VNPAY',
        paymentStatus: 'PENDING_VNPAY',
      }),
    );
  });

  it('returns PENDING_COD from checkout for COD orders', async () => {
    createOrderServiceMock.mockResolvedValue({
      id: '322',
      orderCode: 'ORD-322',
      trackingCode: 'ORD-322',
      status: 'Pending',
      paymentStatus: 'PENDING_COD',
      paymentMethod: 'COD',
      pricing: {
        itemsTotal: 250000,
        shippingFee: 15000,
        discount: 0,
        tax: 0,
        grandTotal: 265000,
      },
    });

    const req: any = {
      user: { userId: 6, roles: ['Customer'] },
      body: {
        items: [{ variantId: 12, quantity: 1 }],
        paymentMethod: 'COD',
        customerName: 'Khach Hang',
        customerEmail: 'khach@example.com',
        customerPhone: '0900000000',
        shippingCity: 'Da Nang',
        shippingDistrict: 'Hai Chau',
        shippingWard: null,
        shippingAddressDetail: '123 Test',
        shippingCityCode: '48',
        shippingMethod: 'STANDARD',
        note: null,
      },
    };
    const res = createResponse();

    await createOrder(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        code: 'ORDER_CREATED',
        orderId: 322,
        paymentMethod: 'COD',
        paymentStatus: 'PENDING_COD',
      }),
    );
  });

  it('returns UNAUTHORIZED when the request has no authenticated user', async () => {
    const req: any = {
      user: undefined,
      params: { id: '77' },
    };
    const res = createResponse();

    await confirmReceipt(req, res);

    expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      errorCode: 'UNAUTHORIZED',
    });
  });

  it('returns INVALID_ORDER_ID when the route param is not numeric', async () => {
    const req: any = {
      user: { userId: 5 },
      params: { id: 'abc' },
    };
    const res = createResponse();

    await confirmReceipt(req, res);

    expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errorCode: 'INVALID_ORDER_ID',
    });
  });

  it('returns ORDER_NOT_FOUND when the target order cannot be loaded', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);

    const req: any = {
      user: { userId: 5 },
      params: { id: '77' },
    };
    const res = createResponse();

    await confirmReceipt(req, res);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      errorCode: 'ORDER_NOT_FOUND',
    });
  });

  it('returns NOT_ORDER_OWNER when a different user confirms receipt', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 77,
      userId: 99,
      status: 'Shipping',
      paymentMethod: 'COD',
      totalAmount: 208000,
    });

    const req: any = {
      user: { userId: 5 },
      params: { id: '77' },
    };
    const res = createResponse();

    await confirmReceipt(req, res);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      errorCode: 'NOT_ORDER_OWNER',
    });
  });

  it('returns ORDER_NOT_SHIPPING when the order is not in Shipping state', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 77,
      userId: 5,
      status: 'Delivered',
      paymentMethod: 'COD',
      totalAmount: 208000,
    });

    const req: any = {
      user: { userId: 5 },
      params: { id: '77' },
    };
    const res = createResponse();

    await confirmReceipt(req, res);

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errorCode: 'ORDER_NOT_SHIPPING',
      currentStatus: 'Delivered',
    });
  });

  it('marks COD payment as completed when customer confirms receipt and payment exists', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 77,
      userId: 5,
      status: 'Shipping',
      paymentMethod: 'COD',
      totalAmount: 208000,
    });

    const tx = {
      order: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue({
          paymentId: 91,
          status: 'PENDING',
          paymentMethod: 'COD',
        }),
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      },
      returnRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      returnRequestStatusLog: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const req: any = {
      user: { userId: 5 },
      params: { id: '77' },
    };
    const res = createResponse();

    await confirmReceipt(req, res);

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { orderId: 77 },
      data: { status: 'Delivered' },
    });
    expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 77,
        oldStatus: 'Shipping',
        status: 'Delivered',
        changedBy: 5,
      }),
    });
    expect(tx.payment.findFirst).toHaveBeenCalledWith({
      where: { orderId: 77, paymentMethod: 'COD' },
      orderBy: { paymentId: 'desc' },
    });
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { paymentId: 91 },
      data: expect.objectContaining({
        status: 'COMPLETED',
        note: 'Khách hàng đã xác nhận nhận hàng. Thanh toán COD được đánh dấu là đã thu.',
      }),
    });
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        orderId: 77,
        newStatus: 'Delivered',
      }),
    );
  });

  it('creates a COD payment when customer confirms receipt and no payment exists yet', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 78,
      userId: 6,
      status: 'Shipping',
      paymentMethod: 'COD',
      totalAmount: 181000,
    });

    const tx = {
      order: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ paymentId: 99 }),
      },
      returnRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      returnRequestStatusLog: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const req: any = {
      user: { userId: 6 },
      params: { id: '78' },
    };
    const res = createResponse();

    await confirmReceipt(req, res);

    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 78,
        paymentMethod: 'COD',
        amount: 181000,
        status: 'COMPLETED',
        note: 'Khách hàng đã xác nhận nhận hàng. Thanh toán COD được đánh dấu là đã thu.',
      }),
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        orderId: 78,
        newStatus: 'Delivered',
      }),
    );
  });

  it.each(['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'SUCCESS'])(
    'does not rewrite COD payment when latest payment is already settled as %s',
    async (settledStatus) => {
      prismaMock.order.findUnique.mockResolvedValue({
        orderId: 79,
        userId: 7,
        status: 'Shipping',
        paymentMethod: 'COD',
        totalAmount: 265000,
      });

      const tx = {
        order: {
          update: jest.fn().mockResolvedValue(undefined),
        },
        orderStatusHistory: {
          create: jest.fn().mockResolvedValue(undefined),
        },
        payment: {
          findFirst: jest.fn().mockResolvedValue({
            paymentId: 101,
            status: settledStatus,
            paymentMethod: 'COD',
          }),
          update: jest.fn(),
          create: jest.fn(),
        },
        returnRequest: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        returnRequestStatusLog: {
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      };

      prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

      const req: any = {
        user: { userId: 7 },
        params: { id: '79' },
      };
      const res = createResponse();

      await confirmReceipt(req, res);

      expect(tx.order.update).toHaveBeenCalledWith({
        where: { orderId: 79 },
        data: { status: 'Delivered' },
      });
      expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 79,
          oldStatus: 'Shipping',
          status: 'Delivered',
          changedBy: 7,
        }),
      });
      expect(tx.payment.findFirst).toHaveBeenCalledWith({
        where: { orderId: 79, paymentMethod: 'COD' },
        orderBy: { paymentId: 'desc' },
      });
      expect(tx.payment.update).not.toHaveBeenCalled();
      expect(tx.payment.create).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          orderId: 79,
          newStatus: 'Delivered',
        }),
      );
    },
  );

  it('unlocks COD return requests that were waiting for payment confirmation', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 80,
      userId: 8,
      status: 'Shipping',
      paymentMethod: 'COD',
      totalAmount: 315000,
    });

    const tx = {
      order: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue({
          paymentId: 102,
          status: 'PENDING',
          paymentMethod: 'COD',
        }),
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn(),
      },
      returnRequest: {
        findMany: jest.fn().mockResolvedValue([
          { returnRequestId: 301 },
          { returnRequestId: 302 },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      returnRequestStatusLog: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const req: any = {
      user: { userId: 8 },
      params: { id: '80' },
    };
    const res = createResponse();

    await confirmReceipt(req, res);

    expect(tx.returnRequest.findMany).toHaveBeenCalledWith({
      where: {
        orderId: 80,
        status: 'PENDING_PAYMENT_CONFIRMATION',
      },
      select: {
        returnRequestId: true,
      },
    });
    expect(tx.returnRequest.updateMany).toHaveBeenCalledWith({
      where: {
        returnRequestId: { in: [301, 302] },
      },
      data: expect.objectContaining({
        status: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'NOT_APPLICABLE',
      }),
    });
    expect(tx.returnRequestStatusLog.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          returnRequestId: 301,
          fromStatus: 'PENDING_PAYMENT_CONFIRMATION',
          toStatus: 'PENDING_ADMIN_REVIEW',
          changedBy: 8,
          comment: 'COD payment confirmed. Return request moved to admin review.',
        }),
        expect.objectContaining({
          returnRequestId: 302,
          fromStatus: 'PENDING_PAYMENT_CONFIRMATION',
          toStatus: 'PENDING_ADMIN_REVIEW',
          changedBy: 8,
          comment: 'COD payment confirmed. Return request moved to admin review.',
        }),
      ],
    });
  });

  it('still unlocks COD return requests when the latest COD payment is already settled', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 81,
      userId: 9,
      status: 'Shipping',
      paymentMethod: 'COD',
      totalAmount: 285000,
    });

    const tx = {
      order: {
        update: jest.fn().mockResolvedValue(undefined),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue({
          paymentId: 103,
          status: 'PAID',
          paymentMethod: 'COD',
        }),
        update: jest.fn(),
        create: jest.fn(),
      },
      returnRequest: {
        findMany: jest.fn().mockResolvedValue([{ returnRequestId: 401 }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      returnRequestStatusLog: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const req: any = {
      user: { userId: 9 },
      params: { id: '81' },
    };
    const res = createResponse();

    await confirmReceipt(req, res);

    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.returnRequest.updateMany).toHaveBeenCalledWith({
      where: {
        returnRequestId: { in: [401] },
      },
      data: expect.objectContaining({
        status: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'NOT_APPLICABLE',
      }),
    });
    expect(tx.returnRequestStatusLog.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          returnRequestId: 401,
          fromStatus: 'PENDING_PAYMENT_CONFIRMATION',
          toStatus: 'PENDING_ADMIN_REVIEW',
          changedBy: 9,
          comment: 'COD payment confirmed. Return request moved to admin review.',
        }),
      ],
    });
  });

  it('includes refund summary bootstrap data in admin order detail responses', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 101,
      orderNumber: 'ORD-101',
      status: 'Pending',
      paymentMethod: 'VNPAY',
      totalAmount: { toString: () => '450000' },
      discountAmount: { toString: () => '0' },
      shippingFee: { toString: () => '15000' },
      shippingMethod: 'STANDARD',
      shippingCityCode: '79',
      note: null,
      createdAt: new Date('2026-03-25T10:00:00.000Z'),
      customerName: 'Nguyen Van A',
      customerPhone: '0900000000',
      shippingCity: 'Ho Chi Minh',
      shippingDistrict: 'District 1',
      shippingAddressDetail: '123 Nguyen Hue',
      user: null,
      items: [],
      payments: [
        {
          paymentId: 1,
          paymentMethod: 'VNPAY',
          amount: { toString: () => '300000' },
          status: 'PAID',
          paymentDate: new Date('2026-03-25T10:05:00.000Z'),
        },
      ],
      shipment: null,
      statusHistory: [],
    });
    getRefundsForOrderMock.mockResolvedValueOnce({
      refunds: [],
      summary: {
        totalCollected: 300000,
        totalRefunded: 50000,
        remainingRefundable: 250000,
      },
    });

    const req: any = {
      params: { id: '101' },
      originalUrl: '/api/orders/admin/101',
    };
    const res = createResponse();

    await getAdminOrderDetail(req, res);

    expect(getRefundsForOrderMock).toHaveBeenCalledWith(101);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 101,
        refundSummary: {
          totalCollected: 300000,
          totalRefunded: 50000,
          remainingRefundable: 250000,
        },
      }),
    );
  });

  it('keeps admin order detail responses alive when refund summary bootstrap fails', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 102,
      orderNumber: 'ORD-102',
      status: 'Pending',
      paymentMethod: 'COD',
      totalAmount: { toString: () => '250000' },
      discountAmount: { toString: () => '0' },
      shippingFee: { toString: () => '15000' },
      shippingMethod: 'STANDARD',
      shippingCityCode: '79',
      note: null,
      createdAt: new Date('2026-03-25T10:00:00.000Z'),
      customerName: 'Nguyen Van B',
      customerPhone: '0900000001',
      shippingCity: 'Ho Chi Minh',
      shippingDistrict: 'District 3',
      shippingAddressDetail: '456 Cach Mang Thang 8',
      user: null,
      items: [],
      payments: [],
      shipment: null,
      statusHistory: [],
    });
    getRefundsForOrderMock.mockRejectedValueOnce(new Error('refund history unavailable'));

    const req: any = {
      params: { id: '102' },
      originalUrl: '/api/orders/admin/102',
    };
    const res = createResponse();

    await getAdminOrderDetail(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 102,
        refundSummary: null,
      }),
    );
  });

  it('exposes canonical needs-review payment status in admin order detail responses', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 103,
      orderNumber: 'ORD-103',
      status: 'Pending',
      paymentMethod: 'VNPAY',
      totalAmount: { toString: () => '250000' },
      discountAmount: { toString: () => '0' },
      shippingFee: { toString: () => '15000' },
      shippingMethod: 'STANDARD',
      shippingCityCode: '79',
      note: null,
      createdAt: new Date('2026-03-25T10:00:00.000Z'),
      customerName: 'Nguyen Van C',
      customerPhone: '0900000002',
      shippingCity: 'Ho Chi Minh',
      shippingDistrict: 'District 5',
      shippingAddressDetail: '789 Tran Hung Dao',
      user: null,
      items: [],
      payments: [
        {
          paymentId: 3,
          paymentMethod: 'VNPAY',
          amount: { toString: () => '250000' },
          status: 'needs_review',
          paymentDate: new Date('2026-03-25T10:05:00.000Z'),
        },
      ],
      shipment: null,
      statusHistory: [],
    });

    const req: any = {
      params: { id: '103' },
      originalUrl: '/api/orders/admin/103',
    };
    const res = createResponse();

    await getAdminOrderDetail(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 103,
        paymentStatus: 'NEEDS_REVIEW',
      }),
    );
  });
});

describe('order.controller uploadReturnProofImages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns UNAUTHORIZED when the request has no authenticated user', async () => {
    const req: any = {
      user: undefined,
      params: { id: '88' },
      files: [],
    };
    const res = createResponse();

    await uploadReturnProofImages(req, res);

    expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      errorCode: 'UNAUTHORIZED',
    });
  });

  it('returns NOT_ORDER_OWNER when another user tries to upload proof images', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 88,
      userId: 99,
    });

    const req: any = {
      user: { userId: 5 },
      params: { id: '88' },
      files: [{ buffer: Buffer.from('proof'), mimetype: 'image/jpeg' }],
    };
    const res = createResponse();

    await uploadReturnProofImages(req, res);

    expect(uploadBase64Mock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      errorCode: 'NOT_ORDER_OWNER',
    });
  });

  it('uploads proof images for the owning customer and returns Cloudinary urls', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 88,
      userId: 5,
    });
    uploadBase64Mock.mockResolvedValue({
      secureUrl: 'https://cdn.example.com/proof-88.jpg',
      width: 1600,
      height: 1200,
    });

    const req: any = {
      user: { userId: 5 },
      params: { id: '88' },
      files: [{ buffer: Buffer.from('proof'), mimetype: 'image/jpeg' }],
    };
    const res = createResponse();

    await uploadReturnProofImages(req, res);

    expect(uploadBase64Mock).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      code: 'RETURN_PROOF_UPLOADED',
      data: {
        images: [
          {
            url: 'https://cdn.example.com/proof-88.jpg',
            width: 1600,
            height: 1200,
          },
        ],
      },
    });
  });
});
