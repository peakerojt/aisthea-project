import { Prisma, PrismaClient } from '../../../generated/client';
import { prisma } from '../../../utils/prisma';
import {
  ACTIVE_RETURN_REQUEST_STATUSES,
  ReturnRequestStatus,
} from '../types';

export type TxClient = Prisma.TransactionClient | PrismaClient;
type CustomerFilters = {
  orderIds?: number[];
  updatedSince?: Date;
};
type AdminFilters = {
  status?: ReturnRequestStatus;
  orderId?: number;
  customerId?: number;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
};

const ADMIN_STATUS_FILTER_GROUPS: Partial<Record<ReturnRequestStatus, ReturnRequestStatus[]>> = {
  REQUESTED: ['REQUESTED', 'SUBMITTED', 'PENDING_PAYMENT_CONFIRMATION', 'PENDING_ADMIN_REVIEW'],
  APPROVED: ['APPROVED', 'IN_RETURN_TRANSIT'],
  RECEIVED: ['RECEIVED', 'RECEIVED_AND_INSPECTING', 'ACCEPTED_FOR_REFUND'],
  REFUNDED: ['REFUNDED', 'CLOSED'],
  REJECTED: ['REJECTED'],
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

const returnRequestItemInclude = {
  orderItem: {
    include: {
      variant: {
        select: {
          images: {
            select: { imageUrl: true, thumbnailUrl: true },
            orderBy: [{ isPrimary: 'desc' }, { imageId: 'asc' }],
            take: 1,
          },
          product: {
            select: {
              images: {
                select: { imageUrl: true, thumbnailUrl: true },
                orderBy: [{ isPrimary: 'desc' }, { imageId: 'asc' }],
                take: 1,
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ReturnRequestItemInclude;

export class ReturnRequestRepository {
  private readonly db: PrismaClient = prisma;

  private buildAdminWhere(filters: Omit<AdminFilters, 'page' | 'limit'>) {
    const where: Prisma.ReturnRequestWhereInput = {};

    if (filters.status) {
      const groupedStatuses = ADMIN_STATUS_FILTER_GROUPS[filters.status];
      where.status = groupedStatuses ? { in: groupedStatuses } : filters.status;
    }
    if (filters.orderId) where.orderId = filters.orderId;
    if (filters.customerId) where.userId = filters.customerId;
    if (filters.fromDate || filters.toDate) {
      const createdAt: Prisma.DateTimeFilter<'ReturnRequest'> = {};
      if (filters.fromDate) createdAt.gte = filters.fromDate;
      if (filters.toDate) createdAt.lte = filters.toDate;
      where.createdAt = createdAt;
    }

    return where;
  }

  findOrderForReturn(orderId: number) {
    return this.db.order.findUnique({
      where: { orderId },
      include: {
        items: true,
        payments: {
          select: {
            status: true,
          },
        },
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

    return rows.reduce((acc: Record<number, number>, item) => {
      acc[item.orderItemId] = item._sum.quantity ?? 0;
      return acc;
    }, {});
  }

  createReturnRequest(data: Prisma.ReturnRequestCreateArgs['data'], tx: TxClient) {
    return tx.returnRequest.create({
      data,
      include: {
        items: { include: returnRequestItemInclude },
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
        items: { include: returnRequestItemInclude },
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
        items: { include: returnRequestItemInclude },
        attachments: true,
        statusLogs: {
          include: { changedByUser: { select: { userId: true, fullName: true } } },
          orderBy: { createdAt: 'asc' },
        },
        refundTransactions: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  findActiveByOrderId(orderId: number) {
    return this.db.returnRequest.findFirst({
      where: {
        orderId,
        status: { in: ACTIVE_RETURN_REQUEST_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        returnRequestId: true,
        orderId: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async findByUser(userId: number, page: number, limit: number, filters: CustomerFilters = {}) {
    const where: Prisma.ReturnRequestWhereInput = { userId };
    if (filters.orderIds?.length) {
      where.orderId = { in: filters.orderIds };
    }
    if (filters.updatedSince) {
      where.updatedAt = { gte: filters.updatedSince };
    }
    const { skip, take } = buildPagination(page, limit);
    const [data, total] = await Promise.all([
      this.db.returnRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { orderId: true, orderNumber: true, totalAmount: true } },
          items: { include: returnRequestItemInclude },
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
