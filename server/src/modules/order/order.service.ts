import { findOrderByIdWithRelations, OrderWithRelations } from './order.repository';
import { prisma } from '../../utils/prisma';
import { atomicCancelRestore, atomicCheckoutDeduction } from '../../services/inventory.service';
import { logger } from '../../lib/logger';
import {
  ORDER_STATUS,
  getValidNextStatuses,
  isValidTransition,
  INVENTORY_RESTORE_STATUSES,
} from '../../config/orderStatus.config';
import { emitOrderStatusUpdated } from '../../socket';

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

// ─── Update Order Status (Admin) ──────────────────────────────────────────────
export async function updateOrderStatusAdmin(
  orderIdRaw: string,
  currentUser: CurrentUser,
  payload: {
    status: string;
    note?: string;
    carrier?: string;
    trackingNumber?: string;
    estimatedDeliveryDate?: string;
  }
) {
  if (!isAdmin(currentUser)) {
    throw new AppError('FORBIDDEN', 'You are not allowed to update order status', 403);
  }

  const parsedId = Number(orderIdRaw);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    throw new AppError('BAD_REQUEST', 'Invalid order id', 400);
  }

  const { status: newStatus, note, carrier, trackingNumber, estimatedDeliveryDate } = payload;
  if (!newStatus) {
    throw new AppError('BAD_REQUEST', 'Status is required', 400);
  }

  const order = await prisma.order.findUnique({
    where: { orderId: parsedId },
    include: {
      items: {
        select: { orderItemId: true, variantId: true, quantity: true },
      },
    },
  });

  if (!order) {
    throw new AppError('NOT_FOUND', 'Order not found', 404);
  }

  const currentStatus = order.status ?? ORDER_STATUS.PENDING;

  if (!isValidTransition(currentStatus, newStatus)) {
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${getValidNextStatuses(currentStatus).join(', ')}`,
      400
    );
  }

  const shouldRestoreInventory = INVENTORY_RESTORE_STATUSES.includes(newStatus as any);

  await prisma.$transaction(async (tx) => {
    if (shouldRestoreInventory) {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { variantId: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }
    }

    const orderData: Record<string, any> = { status: newStatus };
    if (note !== undefined) orderData.note = note;
    if (carrier) orderData.carrier = carrier;
    if (trackingNumber) orderData.trackingNumber = trackingNumber;

    await tx.order.update({ where: { orderId: parsedId }, data: orderData });

    await tx.orderStatusHistory.create({
      data: {
        orderId: parsedId,
        oldStatus: currentStatus,
        status: newStatus,
        changedBy: currentUser.userId,
        note: note ?? null,
      },
    });

    if (carrier || trackingNumber || estimatedDeliveryDate) {
      const eta = estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : undefined;
      await tx.shipment.upsert({
        where: { orderId: parsedId },
        update: { carrier: carrier ?? undefined, trackingNumber: trackingNumber ?? undefined, eta },
        create: { orderId: parsedId, carrier: carrier ?? null, trackingNumber: trackingNumber ?? null, eta },
      });
    }
  });

  try {
    const latest = await prisma.order.findUnique({
      where: { orderId: parsedId },
      include: {
        statusHistory: { orderBy: { changedAt: 'asc' } },
        shipment: true,
      },
    });
    if (latest) {
      const timeline = (latest.statusHistory || []).map((h: any) => ({
        status: h.status,
        timestamp: h.changedAt,
        note: h.note ?? null,
      }));
      emitOrderStatusUpdated({
        orderId: parsedId,
        userId: latest.userId ?? undefined,
        status: newStatus,
        timeline,
        carrier: carrier ?? latest.carrier ?? latest.shipment?.carrier ?? null,
        trackingNumber: trackingNumber ?? latest.trackingNumber ?? latest.shipment?.trackingNumber ?? null,
        estimatedDeliveryDate: latest.shipment?.eta ?? null,
      });
    }
  } catch (socketErr: any) {
    logger.warn('[updateOrderStatusAdmin] Socket emit failed (non-critical):', socketErr.message);
  }

  logger.info('Order status updated by admin', { orderId: parsedId, oldStatus: currentStatus, newStatus, adminId: currentUser.userId });

  return {
    orderId: parsedId,
    previousStatus: currentStatus,
    newStatus,
    stockRestored: shouldRestoreInventory,
  };
}

/**
 * One cart-item sent from the client during checkout.
 * NOTE: `price` is intentionally ignored for total calculation — the server
 * always re-fetches the authoritative price from the DB.
 */
export interface CreateOrderItemDto {
  variantId: number;
  quantity: number;
  /** Only used for the productName / variantName snapshot on the OrderItem row. */
  productName?: string;
  variantName?: string;
}

export interface CreateOrderDto {
  items: CreateOrderItemDto[];
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingWard?: string | null;
  shippingAddressDetail: string;
  note?: string | null;
}

/**
 * createOrder — Checkout service function (Clean Architecture layer).
 *
 * All mutations run inside a single Prisma Interactive Transaction so that
 * any failure automatically rolls back every change made within that call:
 *
 *   Step 1 — Early stock check  (read-only guard, no mutations yet)
 *   Step 2 — Server-side price calculation from real DB prices
 *   Step 3 — Create the Order record
 *   Step 4 — Create OrderItem records (price snapshot)
 *   Step 5 — Atomic stock deduction via atomicCheckoutDeduction
 *             → uses UPDATE … WHERE stockQuantity >= quantity
 *             → throws P2025 / INSUFFICIENT_STOCK if a race condition
 *               depletes stock between Step 1 and Step 5
 *   Step 6 — Append initial OrderStatusHistory entry
 *
 * Returns the full OrderDetailDto for the newly created order.
 */
export async function createOrder(
  currentUser: CurrentUser,
  dto: CreateOrderDto,
): Promise<OrderDetailDto> {
  const {
    items,
    paymentMethod,
    customerName,
    customerPhone,
    shippingCity,
    shippingDistrict,
    shippingWard,
    shippingAddressDetail,
    note,
  } = dto;

  if (!items || items.length === 0) {
    throw new AppError('CART_EMPTY', 'Cannot create an order with no items', 400);
  }

  // Generate a human-readable order number before entering the transaction
  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')}`;

  const newOrderId = await prisma.$transaction(async (tx) => {
    // ── Step 1: Early stock check ─────────────────────────────────────────────
    // Fetch all requested variants in a single query to minimise round-trips.
    const variantIds = items.map((i) => i.variantId);

    const variants = await (tx.productVariant.findMany as any)({
      where: { variantId: { in: variantIds } },
      select: {
        variantId: true,
        sku: true,
        price: true,
        stockQuantity: true,
        product: { select: { name: true } },
        variantAttributes: {
          select: {
            value: {
              select: {
                value: true,
                attribute: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Build a lookup map for O(1) access
    const variantMap = new Map<number, (typeof variants)[number]>();
    for (const v of variants) {
      variantMap.set(v.variantId, v);
    }

    // Validate every item — stock check AND existence
    for (const item of items) {
      const variant = variantMap.get(item.variantId);

      if (!variant) {
        throw new AppError(
          'VARIANT_NOT_FOUND',
          `Product variant with ID ${item.variantId} does not exist`,
          400,
        );
      }

      const available: number = variant.stockQuantity;
      if (available < item.quantity) {
        const name: string = variant.product?.name ?? `VariantId ${item.variantId}`;
        throw new AppError(
          'OUT_OF_STOCK',
          `"${name}" only has ${available} item(s) in stock but ${item.quantity} were requested`,
          400,
        );
      }
    }

    // ── Step 2: Calculate total price from DB (never trust client) ────────────
    let totalAmount = 0;
    const enrichedItems = items.map((item) => {
      const variant = variantMap.get(item.variantId)!;
      const unitPrice = Number(variant.price);
      totalAmount += unitPrice * item.quantity;

      // Build a human-readable variant label (e.g. "Trắng / L") for the snapshot
      const attrLabel = (variant.variantAttributes as any[])
        .map((va: any) => va.value.value)
        .join(' / ');

      return {
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        sku: variant.sku as string,
        productName: item.productName ?? (variant.product?.name as string) ?? 'Unknown',
        variantName: item.variantName ?? attrLabel ?? variant.sku,
      };
    });

    // ── Step 3: Create the Order record ──────────────────────────────────────
    const order = await (tx.order.create as any)({
      data: {
        userId: currentUser.userId,
        orderNumber,
        customerName,
        customerPhone,
        shippingCity,
        shippingDistrict: shippingDistrict ?? '',
        shippingWard: shippingWard ?? null,
        shippingAddressDetail,
        totalAmount,
        status: 'Pending',
        paymentMethod,
        paymentStatus: 'Unpaid',
        note: note ?? null,
      },
      select: { orderId: true },
    });

    const orderId: number = order.orderId;

    // ── Step 4: Create OrderItem records (price snapshot) ─────────────────────
    await (tx.orderItem.createMany as any)({
      data: enrichedItems.map((ei) => ({
        orderId,
        variantId: ei.variantId,
        productName: ei.productName,
        sku: ei.sku,
        variantName: ei.variantName,
        unitPrice: ei.unitPrice,
        quantity: ei.quantity,
      })),
    });

    // ── Step 5: Atomic stock deduction (race-condition safe) ──────────────────
    // atomicCheckoutDeduction uses:
    //   UPDATE ProductVariants SET StockQuantity -= quantity
    //   WHERE VariantId = ? AND StockQuantity >= quantity
    // If a concurrent request already bought the last units, Prisma throws P2025
    // which this helper converts to INSUFFICIENT_STOCK — triggering a full rollback.
    await atomicCheckoutDeduction(
      orderId,
      currentUser.userId,
      enrichedItems.map((ei) => ({
        variantId: ei.variantId,
        quantity: ei.quantity,
        productName: ei.productName,
      })),
      tx,
    );

    // ── Step 6: Initial status history entry ──────────────────────────────────
    await (tx.orderStatusHistory.create as any)({
      data: {
        orderId,
        oldStatus: null,
        status: 'Pending',
        changedBy: currentUser.userId,
        changedAt: new Date(),
        note: 'Order placed',
      },
    });

    logger.info('Order successfully created', {
      orderId,
      orderNumber,
      userId: currentUser.userId,
      totalAmount
    });

    return orderId;
  });

  // Re-fetch with full relations so we can return the standard DTO
  const order = await findOrderByIdWithRelations(newOrderId);
  if (!order) {
    // Should never happen unless the DB is in a very unusual state
    throw new AppError('INTERNAL_ERROR', 'Order was created but could not be retrieved', 500);
  }

  return mapOrderToDto(order);
}
