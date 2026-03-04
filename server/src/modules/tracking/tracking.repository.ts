import { prisma } from '../../utils/prisma';

export const trackingRepository = {
  async findOrderByCodeAndContact(orderCode: string, contact: string) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT TOP 1
        o.OrderId as orderId,
        o.UserId as userId,
        o.OrderNumber as orderNumber,
        o.CustomerName as customerName,
        o.CustomerPhone as customerPhone,
        o.Status as status,
        o.TrackingNumber as trackingNumber,
        o.Carrier as carrier,
        o.CreatedAt as createdAt
      FROM Orders o
      WHERE o.OrderNumber = @P1 AND o.CustomerPhone = @P2
      ORDER BY o.CreatedAt DESC`,
      orderCode,
      contact,
    );

    const order = rows?.[0];
    if (!order) return null;

    const [items, statusHistory] = await Promise.all([
      prisma.orderItem.findMany({
        where: { orderId: order.orderId },
        orderBy: { orderItemId: 'asc' },
      }),
      prisma.orderStatusHistory.findMany({
        where: { orderId: order.orderId },
        orderBy: { changedAt: 'asc' },
      }),
    ]);

    return {
      ...order,
      items,
      statusHistory,
      shipment: null,
      orderCode: order.orderNumber,
      customerEmail: null,
    };
  },

  async findMyOrders(userId: number) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
        o.OrderId as orderId,
        o.UserId as userId,
        o.OrderNumber as orderNumber,
        o.CustomerName as customerName,
        o.CustomerPhone as customerPhone,
        o.Status as status,
        o.TrackingNumber as trackingNumber,
        o.Carrier as carrier,
        o.CreatedAt as createdAt
      FROM Orders o
      WHERE o.UserId = @P1
      ORDER BY o.CreatedAt DESC`,
      userId,
    );

    return Promise.all(
      rows.map(async (order) => {
        const items = await prisma.orderItem.findMany({ where: { orderId: order.orderId } });
        return {
          ...order,
          items,
          shipment: null,
          orderCode: order.orderNumber,
        };
      }),
    );
  },

  async findOrderTrackingById(orderId: number) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT TOP 1
        o.OrderId as orderId,
        o.UserId as userId,
        o.OrderNumber as orderNumber,
        o.CustomerName as customerName,
        o.CustomerPhone as customerPhone,
        o.Status as status,
        o.TrackingNumber as trackingNumber,
        o.Carrier as carrier,
        o.CreatedAt as createdAt
      FROM Orders o
      WHERE o.OrderId = @P1`,
      orderId,
    );

    const order = rows?.[0];
    if (!order) return null;

    const [items, statusHistory] = await Promise.all([
      prisma.orderItem.findMany({
        where: { orderId },
        orderBy: { orderItemId: 'asc' },
      }),
      prisma.orderStatusHistory.findMany({
        where: { orderId },
        orderBy: { changedAt: 'asc' },
      }),
    ]);

    return {
      ...order,
      items,
      statusHistory,
      shipment: null,
      orderCode: order.orderNumber,
      customerEmail: null,
    };
  },
};
