const trackingRepositoryMock = {
  findOrderByCodeAndContact: jest.fn(),
  findOrderTrackingById: jest.fn(),
};

const updateOrderStatusAdminMock = jest.fn();

jest.mock('../tracking.repository', () => ({
  trackingRepository: trackingRepositoryMock,
}));

jest.mock('../../order/order.service', () => ({
  updateOrderStatusAdmin: (...args: unknown[]) => updateOrderStatusAdminMock(...args),
}));

import { trackingService } from '../tracking.service';

describe('tracking.service payment contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes canonical NEEDS_REVIEW payment status for public tracking payloads', async () => {
    trackingRepositoryMock.findOrderByCodeAndContact.mockResolvedValueOnce({
      orderId: 15,
      userId: 7,
      orderNumber: 'ORD-15',
      status: 'Shipping',
      paymentMethod: 'VNPAY',
      customerPhone: '0901234567',
      customerEmail: 'customer@example.com',
      payments: [{ status: 'needs_review' }],
      shipment: null,
      items: [],
      statusHistory: [],
      createdAt: new Date('2026-03-25T10:00:00.000Z'),
    });

    const result = await trackingService.getPublicTracking('ORD-15', '0901234567');

    expect(result).toMatchObject(
      expect.objectContaining({
        orderId: 15,
        paymentStatus: 'NEEDS_REVIEW',
        contact: {
          customerPhone: '******4567',
          customerEmail: 'cu******@example.com',
        },
      }),
    );
  });

  it('exposes canonical PENDING_VNPAY payment status for admin tracking payloads', async () => {
    trackingRepositoryMock.findOrderTrackingById.mockResolvedValueOnce({
      orderId: 22,
      userId: 7,
      orderNumber: 'ORD-22',
      status: 'Pending',
      paymentMethod: 'VNPAY',
      customerPhone: '0901234567',
      customerEmail: 'customer@example.com',
      payments: [{ status: 'pending_vnpay' }],
      shipment: null,
      items: [],
      statusHistory: [],
      createdAt: new Date('2026-03-25T10:00:00.000Z'),
    });

    const result = await trackingService.getOrderTrackingById(22, {
      userId: 7,
      isAdmin: true,
    });

    expect(result).toMatchObject(
      expect.objectContaining({
        orderId: 22,
        paymentStatus: 'PENDING_VNPAY',
        contact: {
          customerPhone: '0901234567',
          customerEmail: 'customer@example.com',
        },
      }),
    );
  });

  it('routes tracking status updates through the tracking_ops transition policy', async () => {
    trackingRepositoryMock.findOrderTrackingById
      .mockResolvedValueOnce({
        orderId: 44,
        userId: 7,
        orderNumber: 'ORD-44',
        status: 'Shipping',
        paymentMethod: 'COD',
        customerPhone: '0901234567',
        customerEmail: 'customer@example.com',
        payments: [],
        shipment: null,
        items: [],
        statusHistory: [],
        createdAt: new Date('2026-03-25T10:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        orderId: 44,
        userId: 7,
        orderNumber: 'ORD-44',
        status: 'Returned',
        paymentMethod: 'COD',
        customerPhone: '0901234567',
        customerEmail: 'customer@example.com',
        payments: [],
        shipment: null,
        items: [],
        statusHistory: [],
        createdAt: new Date('2026-03-25T10:00:00.000Z'),
      });
    updateOrderStatusAdminMock.mockResolvedValueOnce({
      orderId: 44,
      previousStatus: 'Shipping',
      newStatus: 'Returned',
      stockRestored: true,
    });

    const result = await trackingService.updateOrderStatus(
      44,
      {
        status: 'RETURNED',
        note: 'Carrier returned shipment to sender',
        deliveryProofImages: ['https://example.com/proof-44.jpg'],
        deliveryProofReviewed: true,
      },
      11,
    );

    expect(updateOrderStatusAdminMock).toHaveBeenCalledWith(
      '44',
      { userId: 11, roles: ['Admin'] },
      {
        status: 'Returned',
        note: 'Carrier returned shipment to sender',
        deliveryProofImages: ['https://example.com/proof-44.jpg'],
        deliveryProofReviewed: true,
        transitionSource: 'tracking_ops',
      },
    );
    expect(result).toMatchObject(
      expect.objectContaining({
        orderId: 44,
        currentStatus: 'RETURNED',
      }),
    );
  });

  it('returns ORDER_NOT_FOUND before attempting a tracking update when the order is missing', async () => {
    trackingRepositoryMock.findOrderTrackingById.mockResolvedValueOnce(null);

    await expect(
      trackingService.updateOrderStatus(
        404,
        { status: 'DELIVERED' },
        11,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'ORDER_NOT_FOUND',
    });

    expect(updateOrderStatusAdminMock).not.toHaveBeenCalled();
  });
});
