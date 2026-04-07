import { prisma } from '../../utils/prisma';

// ─── Sub-types (manual, based on Prisma schema) ───────────────────────────────

export interface OrderProductImage {
  imageId: number;
  productId: number;
  variantId: number | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  isPrimary: boolean | null;
}

export interface OrderProductVariant {
  variantId: number;
  productId: number;
  sku: string;
  product: {
    productId: number;
    name: string;
    images: OrderProductImage[];
  } | null;
}

export interface OrderItem {
  orderItemId: number;
  orderId: number;
  variantId: number | null;
  productName: string;
  sku: string;
  variantName: string;
  unitPrice: { toNumber(): number } | number;
  quantity: number;
  variant: OrderProductVariant | null;
}

export interface OrderStatusHistoryEntry {
  orderStatusHistoryId: number;
  orderId: number;
  status: string;
  changedAt: Date;
}

export interface OrderPayment {
  paymentId: number;
  orderId: number;
  paymentMethod: string;
  amount: { toNumber(): number } | number;
  status: string;
  paymentDate: Date | null;
  transactionCode: string | null;
  note: string | null;
}

export interface OrderShipment {
  shipmentId: number;
  orderId: number;
  shippingMode: string | null;
  provider: string | null;
  providerOrderCode: string | null;
  providerStatus: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  eta: Date | null;
  lastKnownLocation: string | null;
  deliveryProofImages: string;
  deliveryProofReviewed: boolean;
}

export interface OrderUser {
  userId: number;
  email: string;
  fullName: string;
  phone: string | null;
}

// ─── Main type ────────────────────────────────────────────────────────────────

export interface OrderWithRelations {
  orderId: number;
  userId: number | null;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingWard: string | null;
  shippingAddressDetail: string;
  shippingFee: { toNumber(): number } | number;
  shippingMethod: string;
  shippingCityCode: string | null;
  totalAmount: { toNumber(): number } | number;
  discountAmount: { toNumber(): number } | number | null;
  status: string | null;
  paymentMethod: string | null;
  createdAt: Date | null;
  note: string | null;
  items: OrderItem[];
  user: OrderUser | null;
  payments: OrderPayment[];
  shipment: OrderShipment | null;
  statusHistory: OrderStatusHistoryEntry[];
}

// ─── Repository functions ─────────────────────────────────────────────────────

const orderInclude = {
  user: true,
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: {
                orderBy: [{ isPrimary: 'desc' as const }, { imageId: 'asc' as const }],
              },
            },
          },
        },
      },
    },
  },
  payments: true,
  shipment: true,
  statusHistory: true,
};

export async function findOrderByIdWithRelations(orderId: number): Promise<OrderWithRelations | null> {
  const result = await prisma.order.findUnique({
    where: { orderId },
    include: orderInclude,
  });
  return result as unknown as OrderWithRelations | null;
}

export async function appendOrderStatusHistory(orderId: number, status: string, changedAt?: Date) {
  return prisma.orderStatusHistory.create({
    data: {
      orderId,
      status,
      changedAt: changedAt ?? new Date(),
    },
  });
}

export async function updateOrderStatus(orderId: number, status: string): Promise<OrderWithRelations> {
  const result = await prisma.order.update({
    where: { orderId },
    data: { status },
    include: orderInclude,
  });
  return result as unknown as OrderWithRelations;
}

export interface OrderFilter {
  userId?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

const buildOrderWhere = (filters: Pick<OrderFilter, 'userId' | 'status' | 'search' | 'startDate' | 'endDate'>) => {
  const {
    userId,
    status,
    search,
    startDate,
    endDate,
  } = filters;

  const where: any = {};

  if (userId !== undefined) {
    where.userId = userId;
  }

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { customerName: { contains: search } },
      { customerPhone: { contains: search } },
      { orderNumber: { contains: search } },
    ];
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  return where;
};

export async function countOrdersByStatus(filters: Pick<OrderFilter, 'userId' | 'search' | 'startDate' | 'endDate'>) {
  const where = buildOrderWhere(filters);

  const [total, groupedCounts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ['status'],
      where,
      _count: {
        _all: true,
      },
    }),
  ]);

  return {
    total,
    counts: Object.fromEntries(
      groupedCounts
        .filter((item) => typeof item.status === 'string' && item.status.length > 0)
        .map((item) => [item.status as string, item._count._all]),
    ) as Record<string, number>,
  };
}

export async function findManyOrders(filters: OrderFilter) {
  const {
    page = 1,
    limit = 15,
    sort = 'createdAt_desc',
  } = filters;

  const skip = (page - 1) * limit;
  const size = Math.min(limit, 100);

  const where = buildOrderWhere(filters);

  const orderBy: any = {};
  const [sortField, sortDir] = sort.split('_');
  orderBy[sortField || 'createdAt'] = sortDir === 'asc' ? 'asc' : 'desc';

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy,
      skip,
      take: size,
      include: {
        user: {
          select: {
            userId: true,
            email: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        payments: {
          select: {
            status: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: orders,
    meta: {
      total,
      page,
      limit: size,
      totalPages: Math.ceil(total / size),
    },
  };
}
