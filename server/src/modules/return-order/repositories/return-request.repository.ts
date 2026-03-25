import { prisma } from '../../../utils/prisma';
import {
  ACTIVE_RETURN_REQUEST_STATUSES,
  ReturnRequestStatus,
} from '../return-request.types';

export type TxClient = any;
type AdminFilters = {
  status?: ReturnRequestStatus;
  orderId?: number;
  customerId?: number;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
};

const buildPagination = (page: number, limit: number) => ({
  skip: (page - 1) * limit,
  take: limit,
});

const buildPagedResult = <T>(data: T[], total: number, page: number, limit: number) => ({
  data,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

export class ReturnRequestRepository {
  private readonly db: any = prisma;

  private buildAdminWhere(filters: Omit<AdminFilters, 'page' | 'limit'>) {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.orderId) where.orderId = filters.orderId;
    if (filters.customerId) where.userId = filters.customerId;
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters.toDate) where.createdAt.lte = filters.toDate;
    }

    return where;
  }

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
        returnRequest: { status: { in: ACTIVE_RETURN_REQUEST_STATUSES } },
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

  findByOrderId(orderId: number) {
    return this.db.returnRequest.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
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
    const where = { userId };
    const { skip, take } = buildPagination(page, limit);
    const [data, total] = await Promise.all([
      this.db.returnRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { orderId: true, orderNumber: true, totalAmount: true } },
          items: { include: { orderItem: true } },
          attachments: true,
        },
      }),
      this.db.returnRequest.count({ where }),
    ]);

    return buildPagedResult(data, total, page, limit);
  }

  async findAllAdmin(filters: AdminFilters) {
    const { page, limit, ...rest } = filters;
    const { skip, take } = buildPagination(page, limit);
    const where = this.buildAdminWhere(rest);

    const [data, total] = await Promise.all([
      this.db.returnRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { userId: true, fullName: true, email: true, avatarUrl: true } },
          order: {
            select: {
              orderId: true,
              orderNumber: true,
              totalAmount: true,
              customerName: true,
              customerPhone: true,
            },
          },
          items: true,
          attachments: true,
        },
      }),
      this.db.returnRequest.count({ where }),
    ]);

    return buildPagedResult(data, total, page, limit);
  }
}
