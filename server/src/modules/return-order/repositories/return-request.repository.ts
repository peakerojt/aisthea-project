import { prisma } from '../../../utils/prisma';

type ReturnRequestStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED';
export type TxClient = any;

export class ReturnRequestRepository {
  private readonly db: any = prisma;

  findOrderForReturn(orderId: number) {
    return this.db.order.findUnique({
      where: { orderId },
      include: {
        items: true,
        // Status lưu tiếng Việt: "Đã giao" / "Da Giao" / hoặc "DELIVERED"
        // Lấy toàn bộ history, service sẽ tự filter
        statusHistory: {
          orderBy: { changedAt: 'desc' },
        },
      },
    });
  }

  async getAlreadyReturnedQtyByOrderItem(orderItemIds: number[], tx: TxClient) {
    // Fallback an toàn khi Prisma client chưa generate model ReturnRequestItem
    if (!tx?.returnRequestItem?.groupBy) {
      return {};
    }

    const rows = await tx.returnRequestItem.groupBy({
      by: ['orderItemId'],
      where: {
        orderItemId: { in: orderItemIds },
        returnRequest: { status: { in: ['REQUESTED', 'APPROVED', 'RECEIVED', 'REFUNDED'] } },
      },
      _sum: { quantity: true },
    });

    return (rows as any[]).reduce((acc: Record<number, number>, item: any) => {
      acc[item.orderItemId] = item._sum.quantity ?? 0;
      return acc;
    }, {});
  }

  createReturnRequest(data: any, tx: TxClient) {
    return tx.returnRequest.create({
      data,
      include: {
        items: { include: { orderItem: true } },
        attachments: true,
        statusLogs: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  findById(id: number) {
    return this.db.returnRequest.findUnique({
      where: { returnRequestId: id },
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
  }

  async findByUser(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { userId };
    const [data, total] = await Promise.all([
      this.db.returnRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { orderItem: true } } },
      }),
      this.db.returnRequest.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllAdmin(filters: {
    status?: ReturnRequestStatus;
    orderId?: number;
    customerId?: number;
    fromDate?: Date;
    toDate?: Date;
    page: number;
    limit: number;
  }) {
    const { page, limit, ...rest } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (rest.status) where.status = rest.status;
    if (rest.orderId) where.orderId = rest.orderId;
    if (rest.customerId) where.userId = rest.customerId;
    if (rest.fromDate || rest.toDate) {
      where.createdAt = {};
      if (rest.fromDate) where.createdAt.gte = rest.fromDate;
      if (rest.toDate) where.createdAt.lte = rest.toDate;
    }

    const [data, total] = await Promise.all([
      this.db.returnRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { userId: true, fullName: true, email: true } },
          order: { select: { orderId: true, orderNumber: true, totalAmount: true } },
          items: true,
        },
      }),
      this.db.returnRequest.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
