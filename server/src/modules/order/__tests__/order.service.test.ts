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

jest.mock('../../../lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { ORDER_STATUS } from '../../../config/orderStatus.config';
import { createOrder, updateOrderStatusAdmin } from '../order.service';

describe('order.service integration guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(result.paymentStatus).toBe('pending');
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

    prismaMock.order.findUnique
      .mockResolvedValueOnce({
        orderId: 4,
        orderNumber: 'ORD-0004',
        status: ORDER_STATUS.SHIPPING,
        userId: 44,
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

    expect(result).toMatchObject({
      orderId: 4,
      previousStatus: ORDER_STATUS.SHIPPING,
      newStatus: ORDER_STATUS.DELIVERED,
    });
  });
});
