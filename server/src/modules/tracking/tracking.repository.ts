import { prisma } from '../../utils/prisma';

export const trackingRepository = {
  async findOrderByCodeAndContact(orderCode: string, contact: string) {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber: orderCode,
        customerPhone: contact,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { orderBy: { orderItemId: 'asc' } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
        shipment: true,
      },
    });

    if (!order) return null;

    return {
      ...order,
      orderCode: order.orderNumber,
      customerEmail: order.customerEmail || null,
    };
  },

  async findMyOrders(userId: number) {
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { orderBy: { orderItemId: 'asc' } },
      },
    });

    return orders.map((order) => ({
      ...order,
      shipment: null,
      orderCode: order.orderNumber,
    }));
  },

  async findOrderTrackingById(orderId: number) {
    const order = await prisma.order.findUnique({
      where: { orderId },
      include: {
        items: { orderBy: { orderItemId: 'asc' } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
        shipment: true,
      },
    });

    if (!order) return null;

    return {
      ...order,
      orderCode: order.orderNumber,
      customerEmail: order.customerEmail || null,
    };
  },
};
