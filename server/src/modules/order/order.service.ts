import { findOrderByIdWithRelations, OrderWithRelations } from './order.repository';
import { prisma } from '../../utils/prisma';
import { atomicCancelRestore } from '../../services/inventory.service';

export type Role = 'Admin' | 'Customer' | string;

export interface CurrentUser {
  userId: number;
  roles: Role[];
}

export interface OrderTimelineItem {
  status: string;
  at: string;
}

export interface OrderItemDto {
  productId: string | null;
  sku: string;
  productName: string;
  variant: string;
  price: number;
  quantity: number;
  subtotal: number;
  thumbnail: string | null;
}

export interface OrderPricingDto {
  itemsTotal: number;
  shippingFee: number;
  discount: number;
  tax: number;
  grandTotal: number;
}

export interface OrderDetailDto {
  id: string;
  orderCode: string;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  createdAt: string | null;
  customer: {
    name: string;
    phone: string;
    email: string | null;
  };
  shippingAddress: {
    recipientName: string;
    recipientPhone: string;
    addressLine: string;
    ward: string | null;
    district: string | null;
    city: string;
  };
  items: OrderItemDto[];
  pricing: OrderPricingDto;
  timeline: OrderTimelineItem[];
  note: string | null;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const isAdmin = (user: CurrentUser) => user.roles.includes('Admin');

const normalizeStatus = (status: string | null | undefined) =>
  (status || '').toLowerCase();

const mapOrderToDto = (order: NonNullable<OrderWithRelations>): OrderDetailDto => {
  const itemsTotal = order.items.reduce((sum, item) => {
    const unit = Number(item.unitPrice);
    return sum + unit * item.quantity;
  }, 0);

  const shippingFee = 0;
  const discount = 0;
  const tax = 0;
  const grandTotal = Number(order.totalAmount);

  const timeline = (order.statusHistory ?? [])
    .slice()
    .sort((a, b) => (a.changedAt?.getTime() ?? 0) - (b.changedAt?.getTime() ?? 0))
    .map((h) => ({
      status: normalizeStatus(h.status),
      at: h.changedAt ? h.changedAt.toISOString() : new Date().toISOString(),
    }));

  if (timeline.length === 0 && order.createdAt && order.status) {
    timeline.push({
      status: normalizeStatus(order.status),
      at: order.createdAt.toISOString(),
    });
  }

  const items: OrderItemDto[] = order.items.map((item) => {
    const unit = Number(item.unitPrice);
    const subtotal = unit * item.quantity;

    let thumbnail: string | null = null;
    const variant = item.variant;
    if (variant && variant.images && variant.images.length > 0) {
      const primary = variant.images.find((img) => Boolean(img.isPrimary)) ?? variant.images[0];
      thumbnail = primary.thumbnailUrl || primary.imageUrl || null;
    }

    return {
      productId: item.variant?.productId ? String(item.variant.productId) : null,
      sku: item.sku,
      productName: item.productName,
      variant: item.variantName,
      price: unit,
      quantity: item.quantity,
      subtotal,
      thumbnail,
    };
  });

  return {
    id: String(order.orderId),
    orderCode: order.orderNumber,
    status: normalizeStatus(order.status),
    paymentMethod: order.paymentMethod,
    paymentStatus: normalizeStatus(order.paymentStatus),
    createdAt: order.createdAt ? order.createdAt.toISOString() : null,
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      email: order.user?.email ?? null,
    },
    shippingAddress: {
      recipientName: order.customerName,
      recipientPhone: order.customerPhone,
      addressLine: order.shippingAddressDetail,
      ward: order.shippingWard ?? null,
      district: order.shippingDistrict ?? null,
      city: order.shippingCity,
    },
    items,
    pricing: {
      itemsTotal,
      shippingFee,
      discount,
      tax,
      grandTotal,
    },
    timeline,
    note: order.note ?? null,
  };
};

export async function getOrderDetailForUser(orderIdRaw: string, currentUser: CurrentUser): Promise<OrderDetailDto> {
  const parsedId = Number(orderIdRaw);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    throw new AppError('BAD_REQUEST', 'Invalid order id', 400);
  }

  const order = await findOrderByIdWithRelations(parsedId);
  if (!order) {
    throw new AppError('NOT_FOUND', 'Order not found', 404);
  }

  if (!isAdmin(currentUser) && order.userId !== currentUser.userId) {
    throw new AppError('FORBIDDEN', 'You are not allowed to access this order', 403);
  }

  return mapOrderToDto(order);
}

export async function cancelOrderForUser(orderIdRaw: string, currentUser: CurrentUser): Promise<OrderDetailDto> {
  const parsedId = Number(orderIdRaw);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    throw new AppError('BAD_REQUEST', 'Invalid order id', 400);
  }

  const existing = await findOrderByIdWithRelations(parsedId);
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Order not found', 404);
  }

  if (!isAdmin(currentUser) && existing.userId !== currentUser.userId) {
    throw new AppError('FORBIDDEN', 'You are not allowed to modify this order', 403);
  }

  const currentStatus = normalizeStatus(existing.status);
  if (currentStatus !== 'pending') {
    throw new AppError(
      'ORDER_CANNOT_BE_CANCELLED',
      'Order can only be cancelled when status is pending',
      400,
    );
  }

  // ─── Atomic cancel + stock restore transaction ────────────────────────────
  // All three operations (status update, history append, stock restore + logs)
  // run in a single DB transaction — any failure rolls everything back.
  const updated = await prisma.$transaction(async (tx) => {
    // 1. Update order status
    const updatedOrder = await (tx.order.update as any)({
      where: { orderId: parsedId },
      data: { status: 'Cancelled' },
      include: {
        user: true,
        items: {
          include: {
            variant: {
              include: { images: true, product: true },
            },
          },
        },
        payments: true,
        statusHistory: true,
      },
    });

    // 2. Append status history
    await (tx.orderStatusHistory.create as any)({
      data: {
        orderId: parsedId,
        oldStatus: existing.status,
        status: 'Cancelled',
        changedBy: currentUser.userId,
        changedAt: new Date(),
      },
    });

    // 3. Restore stock and write InventoryLog for each item
    await atomicCancelRestore(
      parsedId,
      currentUser.userId,
      existing.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      tx,
    );

    return updatedOrder;
  });

  return mapOrderToDto(updated as OrderWithRelations);
}


