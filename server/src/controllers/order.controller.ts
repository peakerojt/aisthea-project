import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const firstQueryValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const v0 = value[0];
    return typeof v0 === 'string' ? v0 : undefined;
  }
  return undefined;
};

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status, page = '1', pageSize = '10', sort = 'createdAt_desc' } = req.query;

    const pageNum = parseInt(firstQueryValue(page) || '1', 10) || 1;
    const size = Math.min(parseInt(firstQueryValue(pageSize) || '10', 10) || 10, 50);
    const skip = (pageNum - 1) * size;

    const where: any = { userId };
    const statusStr = firstQueryValue(status);
    if (statusStr) {
      where.status = statusStr;
    }

    const sortStr = firstQueryValue(sort) || 'createdAt_desc';

    const orderBy: any = {};
    const [sortField, sortDir] = sortStr.split('_');
    orderBy[sortField || 'createdAt'] = sortDir === 'asc' ? 'asc' : 'desc';

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy,
        skip,
        take: size,
        select: {
          orderId: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          createdAt: true,
          trackingNumber: true,
          carrier: true,
          _count: {
            select: { items: true }
          }
        }
      }),
      prisma.order.count({ where })
    ]);

    const formattedOrders = orders.map((order) => ({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount.toString(),
      createdAt: order.createdAt?.toISOString(),
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      itemCount: order._count.items
    }));

    res.json({
      orders: formattedOrders,
      pagination: {
        page: pageNum,
        pageSize: size,
        total,
        totalPages: Math.ceil(total / size)
      }
    });
  } catch (error: any) {
    console.error('Error fetching my orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyOrderDetail = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const orderIdParam = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
    const orderId = parseInt(orderIdParam, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await prisma.order.findFirst({
      where: {
        orderId,
        userId
      },
      include: {
        items: true,
        payments: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const formattedOrder = {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount.toString(),
      createdAt: order.createdAt?.toISOString(),
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      shippingAddress: {
        recipientName: order.customerName,
        phone: order.customerPhone,
        city: order.shippingCity,
        district: order.shippingDistrict,
        addressDetail: order.shippingAddressDetail
      },
      items: order.items.map((item) => ({
        orderItemId: item.orderItemId,
        productName: item.productName,
        sku: item.sku,
        variantName: item.variantName,
        unitPrice: item.unitPrice.toString(),
        quantity: item.quantity,
        lineTotal: (parseFloat(item.unitPrice.toString()) * item.quantity).toString()
      }))
    };

    res.json(formattedOrder);
  } catch (error: any) {
    console.error('Error fetching order detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};