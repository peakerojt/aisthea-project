import { prisma } from '../../utils/prisma';

const ORDER_INCLUDE = {
  items: { orderBy: { orderItemId: 'asc' as const } },
  statusHistory: { orderBy: { changedAt: 'asc' as const } },
  shipment: true,
};

export const trackingRepository = {
  /**
   * Public lookup: match by orderNumber AND phone or email.
   * Security: Both order number and contact must match exactly.
   */
  async findOrderByCodeAndContact(orderCode: string, contact: string) {
    const isEmail = contact.includes('@');

    const order = await prisma.order.findFirst({
      where: {
        orderNumber: orderCode,
        AND: isEmail
          ? { customerEmail: contact }
          : { customerPhone: contact },
      },
      orderBy: { createdAt: 'desc' },
      include: ORDER_INCLUDE,
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
      // Cap at 50 most recent orders — sufficient for a tracking view.
      take: 50,
      include: {
        items: { orderBy: { orderItemId: 'asc' } },
        shipment: true,
      },
    });

    return orders.map((order) => ({
      ...order,
      orderCode: order.orderNumber,
    }));
  },

  async findOrderTrackingById(orderId: number) {
    const order = await prisma.order.findUnique({
      where: { orderId },
      include: ORDER_INCLUDE,
    });

    if (!order) return null;

    return {
      ...order,
      orderCode: order.orderNumber,
      customerEmail: order.customerEmail || null,
    };
  },
};
