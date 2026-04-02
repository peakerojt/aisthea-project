const prismaMock = {
  $transaction: jest.fn(),
  order: {
    findUnique: jest.fn(),
  },
};

const repositoryMock = {
  findOrderByIdWithRelations: jest.fn(),
};

const inventoryMock = {
  atomicCancelRestore: jest.fn(),
  atomicCheckoutDeduction: jest.fn(),
};

const quoteOrderPricingMock = jest.fn();
const emitOrderStatusUpdatedMock = jest.fn();
const initiateRefundMock = jest.fn();

jest.mock('../../../utils/prisma', () => ({
  prisma: prismaMock,
}));

jest.mock('../order.repository', () => repositoryMock);

jest.mock('../../../services/inventory.service', () => inventoryMock);

jest.mock('../order-pricing.service', () => ({
  quoteOrderPricing: (...args: unknown[]) => quoteOrderPricingMock(...args),
}));

jest.mock('../../../socket', () => ({
  emitOrderStatusUpdated: (...args: unknown[]) => emitOrderStatusUpdatedMock(...args),
}));

jest.mock('../../../services/refund.service', () => ({
  initiateRefund: (...args: unknown[]) => initiateRefundMock(...args),
}));

jest.mock('../../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { ORDER_STATUS } from '../../../config/orderStatus.config';
import { cancelOrderForUser, createOrder, updateOrderStatusAdmin } from '../order.service';

describe('order.service integration guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels processing paid orders and refunds them before fulfillment', async () => {
    const returnRequestFindFirst = jest.fn().mockResolvedValue(null);
    const returnRequestCreate = jest.fn().mockResolvedValue({
      returnRequestId: 321,
      orderId: 610,
      status: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'PENDING',
    });
    const tx = {
      order: {
        update: jest.fn().mockResolvedValue({
          orderId: 610,
          userId: 7,
          orderNumber: 'ORD-610',
          customerName: 'Khach Hang',
          customerEmail: 'khach@example.com',
          customerPhone: '0900000000',
          shippingCity: 'Da Nang',
          shippingDistrict: 'Hai Chau',
          shippingWard: null,
          shippingAddressDetail: '123 Test',
          shippingFee: 0,
          shippingMethod: 'STANDARD',
          shippingCityCode: '48',
          totalAmount: 1492000,
          discountAmount: 0,
          status: 'Cancelled',
          paymentMethod: 'VNPAY',
          createdAt: new Date('2026-04-01T12:54:40.000Z'),
          note: null,
          items: [
            {
              orderItemId: 1,
              orderId: 610,
              variantId: 42,
              productName: 'Sandal Vintage',
              sku: 'SKU-42-463',
              variantName: 'Trắng / 36',
              unitPrice: 1492000,
              quantity: 1,
              variant: null,
            },
          ],
          user: null,
          payments: [
            {
              paymentId: 991,
              orderId: 610,
              paymentMethod: 'VNPAY',
              amount: 1492000,
              status: 'PAID',
              paymentDate: new Date('2026-04-01T12:54:40.000Z'),
              transactionCode: '15478692',
              note: 'Collected via VNPay',
            },
          ],
          shipment: null,
          statusHistory: [],
        }),
      },
      returnRequest: {
        findFirst: returnRequestFindFirst,
        create: returnRequestCreate,
      },
      orderStatusHistory: { create: jest.fn().mockResolvedValue(undefined) },
    };

    repositoryMock.findOrderByIdWithRelations.mockResolvedValue({
      orderId: 610,
      userId: 7,
      orderNumber: 'ORD-610',
      customerName: 'Khach Hang',
      customerEmail: 'khach@example.com',
      customerPhone: '0900000000',
      shippingCity: 'Da Nang',
      shippingDistrict: 'Hai Chau',
      shippingWard: null,
      shippingAddressDetail: '123 Test',
      shippingFee: 0,
      shippingMethod: 'STANDARD',
      shippingCityCode: '48',
      totalAmount: 1492000,
      discountAmount: 0,
      status: 'Processing',
      paymentMethod: 'VNPAY',
      createdAt: new Date('2026-04-01T12:54:40.000Z'),
      note: null,
      items: [
        {
          orderItemId: 1,
          orderId: 610,
          variantId: 42,
          productName: 'Sandal Vintage',
          sku: 'SKU-42-463',
          variantName: 'Trắng / 36',
          unitPrice: 1492000,
          quantity: 1,
          variant: null,
        },
      ],
      user: null,
      payments: [
        {
          paymentId: 991,
          orderId: 610,
          paymentMethod: 'VNPAY',
          amount: 1492000,
          status: 'PAID',
          paymentDate: new Date('2026-04-01T12:54:40.000Z'),
          transactionCode: '15478692',
          note: 'Collected via VNPay',
        },
      ],
      shipment: null,
      statusHistory: [],
    });

    inventoryMock.atomicCancelRestore.mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await cancelOrderForUser(610, { userId: 7, roles: ['Customer'] });

    expect(initiateRefundMock).not.toHaveBeenCalled();
    expect(returnRequestFindFirst).toHaveBeenCalledWith({
      where: {
        orderId: 610,
        status: { in: expect.any(Array) },
      },
      select: {
        returnRequestId: true,
        orderId: true,
        status: true,
      },
    });
    expect(returnRequestCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reason: 'PRE_DELIVERY_CANCELLATION',
        note: 'Customer cancelled a paid VNPAY order before fulfillment. Awaiting admin refund review.',
        status: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'PENDING',
        totalRefundAmount: 1492000,
        items: {
          create: [
            expect.objectContaining({
              quantity: 1,
              unitPrice: 1492000,
              reason: 'PRE_DELIVERY_CANCELLATION',
              reasonText: 'Cancelled before fulfillment after successful VNPay payment',
            }),
          ],
        },
        statusLogs: {
          create: expect.objectContaining({
            toStatus: 'PENDING_ADMIN_REVIEW',
            changedBy: 7,
          }),
        },
      }),
    });
    expect(inventoryMock.atomicCancelRestore).toHaveBeenCalledWith(
      610,
      7,
      [{ variantId: 42, quantity: 1 }],
      tx,
    );
    expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 610,
        oldStatus: 'Processing',
        status: 'Cancelled',
        changedBy: 7,
        note: 'Order cancelled by customer; refund request submitted for admin review',
      }),
    });
    expect(result.status).toBe('cancelled');
    expect(result.paymentStatus).toBe('PAID');
  });

  it('keeps unpaid customer cancellations as a plain cancel action', async () => {
    const tx = {
      order: {
        update: jest.fn().mockResolvedValue({
          orderId: 611,
          userId: 7,
          orderNumber: 'ORD-611',
          customerName: 'Khach Hang',
          customerEmail: 'khach@example.com',
          customerPhone: '0900000000',
          shippingCity: 'Da Nang',
          shippingDistrict: 'Hai Chau',
          shippingWard: null,
          shippingAddressDetail: '123 Test',
          shippingFee: 0,
          shippingMethod: 'STANDARD',
          shippingCityCode: '48',
          totalAmount: 431000,
          discountAmount: 0,
          status: 'Cancelled',
          paymentMethod: 'COD',
          createdAt: new Date('2026-04-01T12:45:14.000Z'),
          note: null,
          items: [
            {
              orderItemId: 1,
              orderId: 611,
              variantId: 52,
              productName: 'Loafer',
              sku: 'SKU-52-001',
              variantName: 'Nâu / 41',
              unitPrice: 431000,
              quantity: 1,
              variant: null,
            },
          ],
          user: null,
          payments: [],
          shipment: null,
          statusHistory: [],
        }),
      },
      orderStatusHistory: { create: jest.fn().mockResolvedValue(undefined) },
    };

    repositoryMock.findOrderByIdWithRelations.mockResolvedValue({
      orderId: 611,
      userId: 7,
      orderNumber: 'ORD-611',
      customerName: 'Khach Hang',
      customerEmail: 'khach@example.com',
      customerPhone: '0900000000',
      shippingCity: 'Da Nang',
      shippingDistrict: 'Hai Chau',
      shippingWard: null,
      shippingAddressDetail: '123 Test',
      shippingFee: 0,
      shippingMethod: 'STANDARD',
      shippingCityCode: '48',
      totalAmount: 431000,
      discountAmount: 0,
      status: 'Pending',
      paymentMethod: 'COD',
      createdAt: new Date('2026-04-01T12:45:14.000Z'),
      note: null,
      items: [
        {
          orderItemId: 1,
          orderId: 611,
          variantId: 52,
          productName: 'Loafer',
          sku: 'SKU-52-001',
          variantName: 'Nâu / 41',
          unitPrice: 431000,
          quantity: 1,
          variant: null,
        },
      ],
      user: null,
      payments: [],
      shipment: null,
      statusHistory: [],
    });

    inventoryMock.atomicCancelRestore.mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const result = await cancelOrderForUser(611, { userId: 7, roles: ['Customer'] });

    expect(initiateRefundMock).not.toHaveBeenCalled();
    expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 611,
        oldStatus: 'Pending',
        status: 'Cancelled',
        changedBy: 7,
        note: 'Order cancelled by customer',
      }),
    });
    expect(result.status).toBe('cancelled');
    expect(result.paymentStatus).toBe('PENDING_COD');
  });

  it('persists a custom cancellation note when the customer selects a refund-review reason', async () => {
    const returnRequestFindFirst = jest.fn().mockResolvedValue(null);
    const returnRequestCreate = jest.fn().mockResolvedValue({
      returnRequestId: 322,
      orderId: 613,
      status: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'PENDING',
    });
    const orderStatusHistoryCreate = jest.fn().mockResolvedValue(undefined);
    const customNote =
      'Khách hàng hủy đơn và yêu cầu hoàn tiền trước khi xử lý. Lý do: Đổi ý, không còn nhu cầu.';
    const tx = {
      order: {
        update: jest.fn().mockResolvedValue({
          orderId: 613,
          userId: 7,
          orderNumber: 'ORD-613',
          customerName: 'Khach Hang',
          customerEmail: 'khach@example.com',
          customerPhone: '0900000000',
          shippingCity: 'Da Nang',
          shippingDistrict: 'Hai Chau',
          shippingWard: null,
          shippingAddressDetail: '123 Test',
          shippingFee: 0,
          shippingMethod: 'STANDARD',
          shippingCityCode: '48',
          totalAmount: 1492000,
          discountAmount: 0,
          status: 'Cancelled',
          paymentMethod: 'VNPAY',
          createdAt: new Date('2026-04-01T12:54:40.000Z'),
          note: null,
          items: [
            {
              orderItemId: 1,
              orderId: 613,
              variantId: 42,
              productName: 'Sandal Vintage',
              sku: 'SKU-42-463',
              variantName: 'Trắng / 36',
              unitPrice: 1492000,
              quantity: 1,
              variant: null,
            },
          ],
          user: null,
          payments: [
            {
              paymentId: 993,
              orderId: 613,
              paymentMethod: 'VNPAY',
              amount: 1492000,
              status: 'PAID',
              paymentDate: new Date('2026-04-01T12:54:40.000Z'),
              transactionCode: '15478694',
              note: 'Collected via VNPay',
            },
          ],
          shipment: null,
          statusHistory: [],
        }),
      },
      returnRequest: {
        findFirst: returnRequestFindFirst,
        create: returnRequestCreate,
      },
      orderStatusHistory: { create: orderStatusHistoryCreate },
    };

    repositoryMock.findOrderByIdWithRelations.mockResolvedValue({
      orderId: 613,
      userId: 7,
      orderNumber: 'ORD-613',
      customerName: 'Khach Hang',
      customerEmail: 'khach@example.com',
      customerPhone: '0900000000',
      shippingCity: 'Da Nang',
      shippingDistrict: 'Hai Chau',
      shippingWard: null,
      shippingAddressDetail: '123 Test',
      shippingFee: 0,
      shippingMethod: 'STANDARD',
      shippingCityCode: '48',
      totalAmount: 1492000,
      discountAmount: 0,
      status: 'Processing',
      paymentMethod: 'VNPAY',
      createdAt: new Date('2026-04-01T12:54:40.000Z'),
      note: null,
      items: [
        {
          orderItemId: 1,
          orderId: 613,
          variantId: 42,
          productName: 'Sandal Vintage',
          sku: 'SKU-42-463',
          variantName: 'Trắng / 36',
          unitPrice: 1492000,
          quantity: 1,
          variant: null,
        },
      ],
      user: null,
      payments: [
        {
          paymentId: 993,
          orderId: 613,
          paymentMethod: 'VNPAY',
          amount: 1492000,
          status: 'PAID',
          paymentDate: new Date('2026-04-01T12:54:40.000Z'),
          transactionCode: '15478694',
          note: 'Collected via VNPay',
        },
      ],
      shipment: null,
      statusHistory: [],
    });

    inventoryMock.atomicCancelRestore.mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await cancelOrderForUser(
      613,
      { userId: 7, roles: ['Customer'] },
      {
        reason: 'CHANGED_MIND',
        note: customNote,
      },
    );

    expect(returnRequestFindFirst).toHaveBeenCalled();
    expect(returnRequestCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reason: 'PRE_DELIVERY_CANCELLATION',
        note: customNote,
        refundStatus: 'PENDING',
      }),
    });
    expect(orderStatusHistoryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 613,
        status: 'Cancelled',
        changedBy: 7,
        note: customNote,
      }),
    });
  });

  it('blocks duplicate active refund-review requests when cancelling a paid VNPay order', async () => {
    const tx = {
      order: {
        update: jest.fn().mockResolvedValue({}),
      },
      returnRequest: {
        findFirst: jest.fn().mockResolvedValue({
          returnRequestId: 501,
          orderId: 612,
          status: 'PENDING_ADMIN_REVIEW',
        }),
        create: jest.fn(),
      },
      orderStatusHistory: { create: jest.fn().mockResolvedValue(undefined) },
    };

    repositoryMock.findOrderByIdWithRelations.mockResolvedValue({
      orderId: 612,
      userId: 7,
      orderNumber: 'ORD-612',
      customerName: 'Khach Hang',
      customerEmail: 'khach@example.com',
      customerPhone: '0900000000',
      shippingCity: 'Da Nang',
      shippingDistrict: 'Hai Chau',
      shippingWard: null,
      shippingAddressDetail: '123 Test',
      shippingFee: 0,
      shippingMethod: 'STANDARD',
      shippingCityCode: '48',
      totalAmount: 1492000,
      discountAmount: 0,
      status: 'Processing',
      paymentMethod: 'VNPAY',
      createdAt: new Date('2026-04-01T12:54:40.000Z'),
      note: null,
      items: [
        {
          orderItemId: 1,
          orderId: 612,
          variantId: 42,
          productName: 'Sandal Vintage',
          sku: 'SKU-42-463',
          variantName: 'Trắng / 36',
          unitPrice: 1492000,
          quantity: 1,
          variant: null,
        },
      ],
      user: null,
      payments: [
        {
          paymentId: 992,
          orderId: 612,
          paymentMethod: 'VNPAY',
          amount: 1492000,
          status: 'PAID',
          paymentDate: new Date('2026-04-01T12:54:40.000Z'),
          transactionCode: '15478693',
          note: 'Collected via VNPay',
        },
      ],
      shipment: null,
      statusHistory: [],
    });

    inventoryMock.atomicCancelRestore.mockResolvedValue(undefined);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await expect(
      cancelOrderForUser(612, { userId: 7, roles: ['Customer'] }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'RETURN_ALREADY_EXISTS',
      details: {
        returnRequestId: 501,
        orderId: 612,
        workflowStatus: 'PENDING_ADMIN_REVIEW',
      },
    });

    expect(tx.returnRequest.create).not.toHaveBeenCalled();
    expect(tx.orderStatusHistory.create).not.toHaveBeenCalled();
  });

  it('creates a pending VNPay payment during checkout', async () => {
    const tx = {
      order: { create: jest.fn().mockResolvedValue({ orderId: 321 }) },
      orderItem: { createMany: jest.fn().mockResolvedValue(undefined) },
      payment: { create: jest.fn().mockResolvedValue({ paymentId: 88 }) },
      orderStatusHistory: { create: jest.fn().mockResolvedValue(undefined) },
      coupon: { update: jest.fn().mockResolvedValue(undefined) },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));
    quoteOrderPricingMock.mockResolvedValue({
      itemsSubtotal: 450000,
      shippingFee: 15000,
      discountAmount: 0,
      totalAmount: 465000,
      shippingMethod: 'STANDARD',
      shippingCityCode: '48',
      appliedCouponCode: null,
      coupon: null,
      enrichedItems: [
        {
          variantId: 11,
          quantity: 1,
          unitPrice: 450000,
          sku: 'SKU-11',
          productName: 'Silk Dress',
          variantName: 'Black / M',
        },
      ],
    });

    inventoryMock.atomicCheckoutDeduction.mockResolvedValue(undefined);
    repositoryMock.findOrderByIdWithRelations.mockResolvedValue({
      orderId: 321,
      userId: 7,
      orderNumber: 'ORD-321',
      customerName: 'Khach Hang',
      customerEmail: 'khach@example.com',
      customerPhone: '0900000000',
      shippingCity: 'Da Nang',
      shippingDistrict: 'Hai Chau',
      shippingWard: null,
      shippingAddressDetail: '123 Test',
      shippingFee: 15000,
      shippingMethod: 'STANDARD',
      shippingCityCode: '48',
      totalAmount: 465000,
      discountAmount: 0,
      status: 'Pending',
      paymentMethod: 'VNPAY',
      createdAt: new Date('2026-03-16T00:00:00.000Z'),
      note: null,
      items: [
        {
          orderItemId: 1,
          orderId: 321,
          variantId: 11,
          productName: 'Silk Dress',
          sku: 'SKU-11',
          variantName: 'Black / M',
          unitPrice: 450000,
          quantity: 1,
          variant: null,
        },
      ],
      user: null,
      payments: [
        {
          paymentId: 88,
          orderId: 321,
          paymentMethod: 'VNPAY',
          amount: 465000,
          status: 'PENDING',
          paymentDate: new Date('2026-03-16T00:00:00.000Z'),
          transactionCode: null,
          note: 'Awaiting VNPay confirmation',
        },
      ],
      shipment: null,
      statusHistory: [
        {
          orderStatusHistoryId: 1,
          orderId: 321,
          status: 'Pending',
          changedAt: new Date('2026-03-16T00:00:00.000Z'),
        },
      ],
    });

    const result = await createOrder(
      { userId: 7, roles: ['Customer'] },
      {
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
      },
    );

    expect(tx.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: 321,
        paymentMethod: 'VNPAY',
        amount: 465000,
        status: 'PENDING',
        transactionCode: null,
        note: 'Awaiting VNPay confirmation',
      },
    });
    expect(result.id).toBe('321');
    expect(result.paymentStatus).toBe('PENDING_VNPAY');
  });

  it('persists order-time item economics for later refund calculations', async () => {
    const tx = {
      order: { create: jest.fn().mockResolvedValue({ orderId: 322 }) },
      orderItem: { createMany: jest.fn().mockResolvedValue(undefined) },
      payment: { create: jest.fn() },
      orderStatusHistory: { create: jest.fn().mockResolvedValue(undefined) },
      coupon: { update: jest.fn().mockResolvedValue(undefined) },
    };

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));
    quoteOrderPricingMock.mockResolvedValue({
      itemsSubtotal: 250000,
      shippingFee: 15000,
      discountAmount: 30000,
      totalAmount: 235000,
      shippingMethod: 'STANDARD',
      shippingCityCode: '48',
      appliedCouponCode: 'SAVE30',
      coupon: { couponId: 15, code: 'SAVE30' },
      enrichedItems: [
        {
          variantId: 11,
          quantity: 2,
          unitPrice: 100000,
          sku: 'SKU-11',
          productName: 'Silk Dress',
          variantName: 'Black / M',
        },
        {
          variantId: 12,
          quantity: 1,
          unitPrice: 50000,
          sku: 'SKU-12',
          productName: 'Silk Scarf',
          variantName: 'Red',
        },
      ],
    });

    inventoryMock.atomicCheckoutDeduction.mockResolvedValue(undefined);
    repositoryMock.findOrderByIdWithRelations.mockResolvedValue({
      orderId: 322,
      userId: 7,
      orderNumber: 'ORD-322',
      customerName: 'Khach Hang',
      customerEmail: 'khach@example.com',
      customerPhone: '0900000000',
      shippingCity: 'Da Nang',
      shippingDistrict: 'Hai Chau',
      shippingWard: null,
      shippingAddressDetail: '123 Test',
      shippingFee: 15000,
      shippingMethod: 'STANDARD',
      shippingCityCode: '48',
      totalAmount: 235000,
      discountAmount: 30000,
      status: 'Pending',
      paymentMethod: 'COD',
      createdAt: new Date('2026-03-16T00:00:00.000Z'),
      note: null,
      items: [],
      user: null,
      payments: [],
      shipment: null,
      statusHistory: [],
    });

    await createOrder(
      { userId: 7, roles: ['Customer'] },
      {
        items: [
          { variantId: 11, quantity: 2 },
          { variantId: 12, quantity: 1 },
        ],
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
        couponCode: 'SAVE30',
      },
    );

    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.orderItem.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          variantId: 11,
          quantity: 2,
          unitPrice: 100000,
          grossItemAmount: 200000,
          allocatedDiscountAmount: 24000,
          netItemPaidAmount: 176000,
        }),
        expect.objectContaining({
          variantId: 12,
          quantity: 1,
          unitPrice: 50000,
          grossItemAmount: 50000,
          allocatedDiscountAmount: 6000,
          netItemPaidAmount: 44000,
        }),
      ],
    });
  });

  it('allows moving an order to shipping without carrier or tracking number', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 1,
      status: ORDER_STATUS.PROCESSING,
      userId: 77,
      items: [],
    });

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn({
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      orderStatusHistory: { create: jest.fn().mockResolvedValue(undefined) },
    }));

    prismaMock.order.findUnique
      .mockResolvedValueOnce({
        orderId: 1,
        status: ORDER_STATUS.PROCESSING,
        userId: 77,
        items: [],
      })
      .mockResolvedValueOnce({
        orderId: 1,
        orderNumber: 'ORD-0001',
        userId: 77,
        shipment: null,
        statusHistory: [
          {
            status: ORDER_STATUS.PROCESSING,
            changedAt: new Date('2026-03-16T08:00:00.000Z'),
            note: null,
          },
          {
            status: ORDER_STATUS.SHIPPING,
            changedAt: new Date('2026-03-16T09:00:00.000Z'),
            note: null,
          },
        ],
      });

    const result = await updateOrderStatusAdmin(
      '1',
      { userId: 99, roles: ['Admin'] },
      { status: ORDER_STATUS.SHIPPING },
    );

    expect(result).toMatchObject({
      orderId: 1,
      previousStatus: ORDER_STATUS.PROCESSING,
      newStatus: ORDER_STATUS.SHIPPING,
    });

    expect(emitOrderStatusUpdatedMock).toHaveBeenCalledWith({
      orderId: 1,
      userId: 77,
      orderCode: 'ORD-0001',
      status: ORDER_STATUS.SHIPPING,
      timeline: [
        {
          status: ORDER_STATUS.PROCESSING,
          timestamp: '2026-03-16T08:00:00.000Z',
          note: null,
        },
        {
          status: ORDER_STATUS.SHIPPING,
          timestamp: '2026-03-16T09:00:00.000Z',
          note: null,
        },
      ],
      shippingMode: 'manual',
      provider: null,
      providerOrderCode: null,
      providerStatus: null,
      carrier: null,
      trackingNumber: null,
      estimatedDeliveryDate: null,
    });
  });

  it('fails safely when another admin changes the order state first', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 2,
      status: ORDER_STATUS.PROCESSING,
      userId: 7,
      items: [],
    });

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn({
      order: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      orderStatusHistory: { create: jest.fn() },
    }));

    await expect(
      updateOrderStatusAdmin(
        '2',
        { userId: 100, roles: ['Admin'] },
        { status: ORDER_STATUS.SHIPPING },
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'ORDER_STATE_CONFLICT',
    });

    expect(emitOrderStatusUpdatedMock).not.toHaveBeenCalled();
  });

  it('requires delivery proof images and review confirmation before marking delivered', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      orderId: 3,
      orderNumber: 'ORD-0003',
      status: ORDER_STATUS.SHIPPING,
      userId: 88,
      items: [],
    });

    await expect(
      updateOrderStatusAdmin(
        '3',
        { userId: 100, roles: ['Admin'] },
        { status: ORDER_STATUS.DELIVERED },
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'DELIVERY_PROOF_REQUIRED',
    });

    await expect(
      updateOrderStatusAdmin(
        '3',
        { userId: 100, roles: ['Admin'] },
        {
          status: ORDER_STATUS.DELIVERED,
          deliveryProofImages: ['https://example.com/proof-1.jpg'],
          deliveryProofReviewed: false,
        },
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'DELIVERY_PROOF_REVIEW_REQUIRED',
    });
  });

  it('creates delivery proof shipment data with legacy-compatible manual tracking fields', async () => {
    const shipmentUpsert = jest.fn().mockResolvedValue(undefined);
    const paymentFindFirst = jest.fn().mockResolvedValue(null);
    const paymentCreate = jest.fn().mockResolvedValue({ paymentId: 401 });
    const returnRequestFindMany = jest.fn().mockResolvedValue([
      { returnRequestId: 701 },
      { returnRequestId: 702 },
    ]);
    const returnRequestUpdateMany = jest.fn().mockResolvedValue({ count: 2 });
    const returnRequestStatusLogCreateMany = jest.fn().mockResolvedValue({ count: 2 });

    prismaMock.order.findUnique
      .mockResolvedValueOnce({
        orderId: 4,
        orderNumber: 'ORD-0004',
        status: ORDER_STATUS.SHIPPING,
        userId: 44,
        paymentMethod: 'COD',
        totalAmount: 208000,
        items: [],
      })
      .mockResolvedValueOnce({
        orderId: 4,
        orderNumber: 'ORD-0004',
        userId: 44,
        shipment: null,
        statusHistory: [
          {
            status: ORDER_STATUS.SHIPPING,
            changedAt: new Date('2026-03-16T10:00:00.000Z'),
            note: null,
          },
          {
            status: ORDER_STATUS.DELIVERED,
            changedAt: new Date('2026-03-16T11:00:00.000Z'),
            note: null,
          },
        ],
      });

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn({
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      orderStatusHistory: { create: jest.fn().mockResolvedValue(undefined) },
      shipment: { upsert: shipmentUpsert },
      payment: {
        findFirst: paymentFindFirst,
        update: jest.fn(),
        create: paymentCreate,
      },
      returnRequest: {
        findMany: returnRequestFindMany,
        updateMany: returnRequestUpdateMany,
      },
      returnRequestStatusLog: {
        createMany: returnRequestStatusLogCreateMany,
      },
    }));

    const result = await updateOrderStatusAdmin(
      '4',
      { userId: 100, roles: ['Admin'] },
      {
        status: ORDER_STATUS.DELIVERED,
        deliveryProofImages: ['https://example.com/proof-1.jpg'],
        deliveryProofReviewed: true,
      },
    );

    expect(shipmentUpsert).toHaveBeenCalledWith({
      where: { orderId: 4 },
      update: {
        deliveryProofImages: JSON.stringify(['https://example.com/proof-1.jpg']),
        deliveryProofReviewed: true,
      },
      create: {
        orderId: 4,
        shippingMode: 'manual',
        carrier: 'AISTHEA Manual Delivery',
        trackingNumber: 'ORD-0004',
        deliveryProofImages: JSON.stringify(['https://example.com/proof-1.jpg']),
        deliveryProofReviewed: true,
      },
    });
    expect(paymentFindFirst).toHaveBeenCalledWith({
      where: { orderId: 4, paymentMethod: 'COD' },
      orderBy: { paymentId: 'desc' },
    });
    expect(paymentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 4,
        paymentMethod: 'COD',
        amount: 208000,
        status: 'COMPLETED',
        note: 'Quản trị viên đã xác nhận giao hàng. Thanh toán COD được đánh dấu là đã thu.',
      }),
    });
    expect(returnRequestFindMany).toHaveBeenCalledWith({
      where: {
        orderId: 4,
        status: 'PENDING_PAYMENT_CONFIRMATION',
      },
      select: {
        returnRequestId: true,
      },
    });
    expect(returnRequestUpdateMany).toHaveBeenCalledWith({
      where: {
        returnRequestId: { in: [701, 702] },
      },
      data: expect.objectContaining({
        status: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'NOT_APPLICABLE',
      }),
    });
    expect(returnRequestStatusLogCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          returnRequestId: 701,
          fromStatus: 'PENDING_PAYMENT_CONFIRMATION',
          toStatus: 'PENDING_ADMIN_REVIEW',
          changedBy: 100,
          comment: 'COD payment confirmed. Return request moved to admin review.',
        }),
        expect.objectContaining({
          returnRequestId: 702,
          fromStatus: 'PENDING_PAYMENT_CONFIRMATION',
          toStatus: 'PENDING_ADMIN_REVIEW',
          changedBy: 100,
          comment: 'COD payment confirmed. Return request moved to admin review.',
        }),
      ],
    });

    expect(result).toMatchObject({
      orderId: 4,
      previousStatus: ORDER_STATUS.SHIPPING,
      newStatus: ORDER_STATUS.DELIVERED,
    });
  });

  it('does not rewrite settled COD payments when admin marks an order delivered', async () => {
    const shipmentUpsert = jest.fn().mockResolvedValue(undefined);
    const paymentUpdate = jest.fn();
    const paymentCreate = jest.fn();
    const returnRequestUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const returnRequestStatusLogCreateMany = jest.fn().mockResolvedValue({ count: 1 });

    prismaMock.order.findUnique
      .mockResolvedValueOnce({
        orderId: 5,
        orderNumber: 'ORD-0005',
        status: ORDER_STATUS.SHIPPING,
        userId: 55,
        paymentMethod: 'COD',
        totalAmount: 325000,
        items: [],
      })
      .mockResolvedValueOnce({
        orderId: 5,
        orderNumber: 'ORD-0005',
        userId: 55,
        shipment: null,
        statusHistory: [
          {
            status: ORDER_STATUS.SHIPPING,
            changedAt: new Date('2026-03-16T10:00:00.000Z'),
            note: null,
          },
          {
            status: ORDER_STATUS.DELIVERED,
            changedAt: new Date('2026-03-16T11:00:00.000Z'),
            note: null,
          },
        ],
      });

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn({
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      orderStatusHistory: { create: jest.fn().mockResolvedValue(undefined) },
      shipment: { upsert: shipmentUpsert },
      payment: {
        findFirst: jest.fn().mockResolvedValue({
          paymentId: 501,
          status: 'PAID',
          paymentMethod: 'COD',
        }),
        update: paymentUpdate,
        create: paymentCreate,
      },
      returnRequest: {
        findMany: jest.fn().mockResolvedValue([{ returnRequestId: 703 }]),
        updateMany: returnRequestUpdateMany,
      },
      returnRequestStatusLog: {
        createMany: returnRequestStatusLogCreateMany,
      },
    }));

    await updateOrderStatusAdmin(
      '5',
      { userId: 100, roles: ['Admin'] },
      {
        status: ORDER_STATUS.DELIVERED,
        deliveryProofImages: ['https://example.com/proof-5.jpg'],
        deliveryProofReviewed: true,
      },
    );

    expect(paymentUpdate).not.toHaveBeenCalled();
    expect(paymentCreate).not.toHaveBeenCalled();
    expect(returnRequestUpdateMany).toHaveBeenCalledWith({
      where: {
        returnRequestId: { in: [703] },
      },
      data: expect.objectContaining({
        status: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'NOT_APPLICABLE',
      }),
    });
    expect(returnRequestStatusLogCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          returnRequestId: 703,
          fromStatus: 'PENDING_PAYMENT_CONFIRMATION',
          toStatus: 'PENDING_ADMIN_REVIEW',
          changedBy: 100,
          comment: 'COD payment confirmed. Return request moved to admin review.',
        }),
      ],
    });
  });

  it('rejects ops-only Returned transitions on the default admin order policy', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 7,
      status: ORDER_STATUS.SHIPPING,
      userId: 77,
      paymentMethod: 'COD',
      totalAmount: 100000,
      items: [{ orderItemId: 1, variantId: 41, quantity: 1 }],
    });

    await expect(
      updateOrderStatusAdmin(
        '7',
        { userId: 99, roles: ['Admin'] },
        { status: ORDER_STATUS.RETURNED },
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'INVALID_STATUS_TRANSITION',
      details: expect.objectContaining({
        from: ORDER_STATUS.SHIPPING,
        to: ORDER_STATUS.RETURNED,
        transitionSource: 'admin_order',
      }),
    });

    expect(inventoryMock.atomicCancelRestore).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects customer-return statuses on the default admin order policy', async () => {
    prismaMock.order.findUnique.mockResolvedValueOnce({
      orderId: 8,
      status: ORDER_STATUS.DELIVERED,
      userId: 77,
      paymentMethod: 'COD',
      totalAmount: 100000,
      items: [{ orderItemId: 1, variantId: 42, quantity: 1 }],
    });

    await expect(
      updateOrderStatusAdmin(
        '8',
        { userId: 99, roles: ['Admin'] },
        { status: ORDER_STATUS.RETURN_REQUESTED },
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'INVALID_STATUS_TRANSITION',
      details: expect.objectContaining({
        from: ORDER_STATUS.DELIVERED,
        to: ORDER_STATUS.RETURN_REQUESTED,
        transitionSource: 'admin_order',
      }),
    });

    expect(inventoryMock.atomicCancelRestore).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('allows tracking ops to move shipping orders to Returned and restore inventory', async () => {
    const orderStatusHistoryCreate = jest.fn().mockResolvedValue(undefined);
    const orderUpdateMany = jest.fn().mockResolvedValue({ count: 1 });

    prismaMock.order.findUnique
      .mockResolvedValueOnce({
        orderId: 9,
        orderNumber: 'ORD-0009',
        status: ORDER_STATUS.SHIPPING,
        userId: 77,
        paymentMethod: 'COD',
        totalAmount: 100000,
        items: [{ orderItemId: 1, variantId: 43, quantity: 2 }],
      })
      .mockResolvedValueOnce({
        orderId: 9,
        orderNumber: 'ORD-0009',
        userId: 77,
        shipment: null,
        statusHistory: [
          {
            status: ORDER_STATUS.SHIPPING,
            changedAt: new Date('2026-03-16T08:00:00.000Z'),
            note: null,
          },
          {
            status: ORDER_STATUS.RETURNED,
            changedAt: new Date('2026-03-16T09:00:00.000Z'),
            note: 'Carrier returned shipment to sender',
          },
        ],
      });

    prismaMock.$transaction.mockImplementation(async (fn: any) =>
      fn({
        order: { updateMany: orderUpdateMany },
        orderStatusHistory: { create: orderStatusHistoryCreate },
      }),
    );
    inventoryMock.atomicCancelRestore.mockResolvedValue(undefined);

    const result = await updateOrderStatusAdmin(
      '9',
      { userId: 99, roles: ['Admin'] },
      {
        status: ORDER_STATUS.RETURNED,
        note: 'Carrier returned shipment to sender',
        transitionSource: 'tracking_ops',
      },
    );

    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { orderId: 9, status: ORDER_STATUS.SHIPPING },
      data: {
        status: ORDER_STATUS.RETURNED,
        note: 'Carrier returned shipment to sender',
      },
    });
    expect(orderStatusHistoryCreate).toHaveBeenCalledWith({
      data: {
        orderId: 9,
        oldStatus: ORDER_STATUS.SHIPPING,
        status: ORDER_STATUS.RETURNED,
        changedBy: 99,
        note: 'Carrier returned shipment to sender',
      },
    });
    expect(inventoryMock.atomicCancelRestore).toHaveBeenCalledWith(
      9,
      99,
      [{ variantId: 43, quantity: 2 }],
      expect.any(Object),
    );
    expect(result).toEqual({
      orderId: 9,
      previousStatus: ORDER_STATUS.SHIPPING,
      newStatus: ORDER_STATUS.RETURNED,
      stockRestored: true,
    });
  });
});
