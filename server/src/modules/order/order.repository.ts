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
  images: OrderProductImage[];
  product: {
    productId: number;
    name: string;
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
  carrier: string | null;
  trackingNumber: string | null;
  eta: Date | null;
  lastKnownLocation: string | null;
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
  customerPhone: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingWard: string | null;
  shippingAddressDetail: string;
  totalAmount: { toNumber(): number } | number;
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
          images: true,
          product: true,
        },
      },
    },
  },
  payments: true,
  shipment: true,
  statusHistory: true,
} as const;

export async function findOrderByIdWithRelations(orderId: number): Promise<OrderWithRelations | null> {
  const result = await prisma.order.findUnique({
    where: { orderId },
    include: orderInclude,
  });
  return result as OrderWithRelations | null;
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
  return result as OrderWithRelations;
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

export async function findManyOrders(filters: OrderFilter) {
  const {
    userId,
    status,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 15,
    sort = 'createdAt_desc',
  } = filters;

  const skip = (page - 1) * limit;
  const size = Math.min(limit, 100);

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
