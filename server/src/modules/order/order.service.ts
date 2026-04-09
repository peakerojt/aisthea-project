import { findOrderByIdWithRelations, OrderWithRelations } from './order.repository';
import { prisma } from '../../utils/prisma';
import { atomicCancelRestore, atomicCheckoutDeduction } from '../../services/inventory.service';
import { logger } from '../../lib/logger';
import { AppError } from '../../middlewares/error.middleware';
import { quoteOrderPricing, ShippingMethod } from './order-pricing.service';
import {
  ORDER_STATUS,
} from '../../config/orderStatus.config';
import { emitOrderStatusUpdated } from '../../socket';
import { deriveOrderPaymentStatus, getOrderTrackingSummary, normalizeOrderStatus } from '../../shared/order-state';
import { buildCanonicalTimeline, deriveCanonicalPaymentStatus, toCanonicalOrderStatus } from '../../shared/order-contract';
import { syncOrderWithShippingProvider } from '../shipping/shipping-provider.adapter';
import { EnrichedOrderItem } from './order-pricing.service';
import { reconcileCodReturnUnlockAfterDeliveryConfirmation } from './cod-return-reconciliation';
import { ACTIVE_RETURN_REQUEST_STATUSES } from '../return-order/types';
import { notificationService } from '../notifications/notification.service';
import { env } from '../../lib/env';

export type Role = 'Admin' | 'Customer' | string;

export interface CurrentUser {
  userId: number;
  roles: Role[];
  permissions?: string[];
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
  trackingCode: string;
  shippingMode: 'manual' | 'provider';
  provider: string | null;
  providerOrderCode: string | null;
  providerStatus: string | null;
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

export interface CancelOrderContext {
  reason?: string;
  note?: string;
}

type OrderTransitionSource = 'admin_order' | 'tracking_ops';

type UpdateOrderStatusPayload = {
  status: string;
  note?: string;
  deliveryProofImages?: string[];
  deliveryProofReviewed?: boolean;
  transitionSource?: OrderTransitionSource;
};

const ORDER_STATUS_POLICY_BY_SOURCE: Record<OrderTransitionSource, Record<string, string[]>> = {
  admin_order: {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PAID]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.RETURN_REQUESTED]: [],
    [ORDER_STATUS.CANCELLED]: [],
    [ORDER_STATUS.RETURNED]: [],
  },
  tracking_ops: {
    [ORDER_STATUS.PENDING]: [],
    [ORDER_STATUS.PAID]: [],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPING],
    [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.RETURNED],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.RETURN_REQUESTED]: [],
    [ORDER_STATUS.CANCELLED]: [],
    [ORDER_STATUS.RETURNED]: [],
  },
};

const INVENTORY_RESTORE_STATUSES_BY_SOURCE: Record<OrderTransitionSource, string[]> = {
  admin_order: [ORDER_STATUS.CANCELLED],
  tracking_ops: [ORDER_STATUS.RETURNED],
};

const PRE_DELIVERY_CANCELLATION_REASON = 'PRE_DELIVERY_CANCELLATION' as const;
const PRE_DELIVERY_CANCELLATION_NOTE =
  'Khách hàng đã hủy đơn VNPAY đã thanh toán trước khi xử lý đơn. Đang chờ quản trị viên xem xét hoàn tiền.';

const resolveAllowedOrderTransitions = (
  currentStatus: string,
  transitionSource: OrderTransitionSource,
) => ORDER_STATUS_POLICY_BY_SOURCE[transitionSource][currentStatus] ?? [];

const isOrderTransitionAllowed = (
  currentStatus: string,
  nextStatus: string,
  transitionSource: OrderTransitionSource,
) => resolveAllowedOrderTransitions(currentStatus, transitionSource).includes(nextStatus);

const shouldRestoreInventoryForOrderTransition = (
  nextStatus: string,
  transitionSource: OrderTransitionSource,
) => INVENTORY_RESTORE_STATUSES_BY_SOURCE[transitionSource].includes(nextStatus);

const toNumericAmount = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === 'object') {
    if ('toNumber' in value && typeof (value as { toNumber?: unknown }).toNumber === 'function') {
      const parsed = Number((value as { toNumber(): number }).toNumber());
      return Number.isFinite(parsed) ? parsed : 0;
    }

    if ('toString' in value && typeof (value as { toString?: unknown }).toString === 'function') {
      const parsed = Number((value as { toString(): string }).toString());
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  return 0;
};

const roundCurrencyAmount = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const buildOrderItemDiscountAllocation = (order: OrderWithRelations) => {
  const itemSubtotals = order.items.map((item) => toNumericAmount(item.unitPrice) * item.quantity);
  const orderItemsSubtotal = itemSubtotals.reduce((sum, subtotal) => sum + subtotal, 0);
  const cappedDiscount = Math.min(
    Math.max(toNumericAmount(order.discountAmount), 0),
    Math.max(orderItemsSubtotal, 0),
  );
  let allocatedDiscountRemainder = cappedDiscount;
  const allocatedDiscountByOrderItem = new Map<number, number>();

  order.items.forEach((item, index) => {
    const itemSubtotal = itemSubtotals[index] ?? 0;
    const isLastItem = index === order.items.length - 1;
    const allocatedDiscount =
      orderItemsSubtotal <= 0 || cappedDiscount <= 0
        ? 0
        : isLastItem
          ? allocatedDiscountRemainder
          : roundCurrencyAmount((cappedDiscount * itemSubtotal) / orderItemsSubtotal);

    allocatedDiscountByOrderItem.set(item.orderItemId, allocatedDiscount);
    allocatedDiscountRemainder = Math.max(
      roundCurrencyAmount(allocatedDiscountRemainder - allocatedDiscount),
      0,
    );
  });

  return allocatedDiscountByOrderItem;
};

const resolveOrderItemNetPaidLineAmount = (
  item: OrderWithRelations['items'][number],
  allocatedDiscountByOrderItem: Map<number, number>,
) => {
  const orderItemSubtotal = toNumericAmount(item.unitPrice) * item.quantity;
  const persistedNetPaidAmount = toNumericAmount((item as { netItemPaidAmount?: unknown }).netItemPaidAmount);
  const allocatedDiscount = allocatedDiscountByOrderItem.get(item.orderItemId) ?? 0;

  return persistedNetPaidAmount > 0
    ? persistedNetPaidAmount
    : Math.max(roundCurrencyAmount(orderItemSubtotal - allocatedDiscount), 0);
};

const isCollectedPaymentStatus = (paymentStatus: string | null | undefined) =>
  paymentStatus === 'PAID' || paymentStatus === 'PARTIALLY_REFUNDED';

async function createPreDeliveryCancellationRefundRequest(
  tx: any,
  order: OrderWithRelations,
  userId: number,
  cancellationContext?: CancelOrderContext,
) {
  const existingRequest = await tx.returnRequest.findFirst({
    where: {
      orderId: order.orderId,
      status: { in: ACTIVE_RETURN_REQUEST_STATUSES },
    },
    select: {
      returnRequestId: true,
      orderId: true,
      status: true,
    },
  });

  if (existingRequest) {
    throw new AppError(
      409,
      'RETURN_ALREADY_EXISTS',
      'returns:errors.alreadyExists',
      undefined,
      {
        returnRequestId: existingRequest.returnRequestId,
        orderId: existingRequest.orderId,
        workflowStatus: existingRequest.status,
      },
    );
  }

  const cancellationDetailNote =
    cancellationContext?.note?.trim() ||
    (cancellationContext?.reason?.trim()
      ? `Khách hàng chọn lý do hủy đơn: ${cancellationContext.reason.trim()}`
      : PRE_DELIVERY_CANCELLATION_NOTE);
  const requestNote = cancellationDetailNote;

  const allocatedDiscountByOrderItem = buildOrderItemDiscountAllocation(order);
  const returnItems = order.items
    .filter((item) => Number.isFinite(item.orderItemId) && item.orderItemId > 0 && item.quantity > 0)
    .map((item) => {
      const netPaidLineAmount = resolveOrderItemNetPaidLineAmount(item, allocatedDiscountByOrderItem);
      const refundUnitPrice = roundCurrencyAmount(netPaidLineAmount / item.quantity);

      return {
        orderItem: { connect: { orderItemId: item.orderItemId } },
        quantity: item.quantity,
        unitPrice: refundUnitPrice,
        reason: PRE_DELIVERY_CANCELLATION_REASON,
        reasonText: 'Đơn đã được hủy trước khi xử lý đơn sau khi thanh toán VNPay thành công.',
      };
    });

  const totalRefundAmount = roundCurrencyAmount(
    returnItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  );

  if (returnItems.length === 0 || totalRefundAmount <= 0) {
    throw new AppError(
      409,
      'ITEM_SELECTION_REQUIRED',
      'returns:errors.itemSelectionRequired',
    );
  }

  await tx.returnRequest.create({
    data: {
      order: { connect: { orderId: order.orderId } },
      user: { connect: { userId } },
      reason: PRE_DELIVERY_CANCELLATION_REASON,
      note: requestNote,
      totalRefundAmount,
      status: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'PENDING',
      items: { create: returnItems },
      statusLogs: {
        create: {
          fromStatus: null,
          toStatus: 'PENDING_ADMIN_REVIEW',
          changedBy: userId,
          comment: requestNote,
        },
      },
    },
  });
}

const buildCancellationStatusHistoryNote = (
  shouldCreateVnpayRefundReview: boolean,
  cancellationContext?: CancelOrderContext,
) => {
  const normalizedNote = cancellationContext?.note?.trim();
  if (normalizedNote) {
    return normalizedNote;
  }

  return shouldCreateVnpayRefundReview
    ? 'Khách hàng đã hủy đơn. Yêu cầu hoàn tiền đã được tạo để quản trị viên xem xét.'
    : 'Khách hàng đã hủy đơn.';
};

const isAdmin = (user: CurrentUser) => user.roles.includes('Admin');
const hasPermission = (user: CurrentUser, permissionCode: string) =>
  user.permissions?.includes('*') || user.permissions?.includes(permissionCode);
const canEditOrders = (user: CurrentUser) =>
  isAdmin(user) || hasPermission(user, 'EDIT_ORDER');
const CUSTOMER_CANCELLABLE_STATUSES = new Set(['pending', 'processing']);

type OrderItemEconomicsSnapshot = {
  grossItemAmount: number;
  allocatedDiscountAmount: number;
  netItemPaidAmount: number;
};

function buildOrderItemEconomicsSnapshots(
  items: EnrichedOrderItem[],
  discountAmount: number,
): OrderItemEconomicsSnapshot[] {
  const grossAmounts = items.map((item) => item.unitPrice * item.quantity);
  const itemsSubtotal = grossAmounts.reduce((sum, amount) => sum + amount, 0);
  const cappedDiscount = Math.max(0, Math.min(discountAmount, itemsSubtotal));
  let remainingDiscount = cappedDiscount;

  return items.map((item, index) => {
    const grossItemAmount = grossAmounts[index] ?? 0;
    const isLastItem = index === items.length - 1;
    const allocatedDiscountAmount =
      itemsSubtotal <= 0 || cappedDiscount <= 0
        ? 0
        : isLastItem
          ? remainingDiscount
          : Math.round((cappedDiscount * grossItemAmount) / itemsSubtotal);
    const normalizedAllocatedDiscount = Math.max(
      0,
      Math.min(allocatedDiscountAmount, grossItemAmount),
    );

    remainingDiscount = Math.max(0, remainingDiscount - normalizedAllocatedDiscount);

    return {
      grossItemAmount,
      allocatedDiscountAmount: normalizedAllocatedDiscount,
      netItemPaidAmount: Math.max(0, grossItemAmount - normalizedAllocatedDiscount),
    };
  });
}
const LEGACY_MANUAL_CARRIER = 'AISTHEA Manual Delivery';

const resolveOrderNotificationRecipient = (order: {
  customerEmail?: string | null;
  user?: { email?: string | null; fullName?: string | null } | null;
}) => order.customerEmail?.trim() || order.user?.email?.trim() || null;

const resolveOrderNotificationName = (order: {
  customerName?: string | null;
  user?: { fullName?: string | null } | null;
}) => order.customerName?.trim() || order.user?.fullName?.trim() || 'AISTHEA Customer';

const buildOrderDetailUrl = (orderId: number) => `${env.clientUrl.replace(/\/$/, '')}/tracking/${orderId}`;

const mapOrderToDto = (order: NonNullable<OrderWithRelations>): OrderDetailDto => {
  const itemsTotal = order.items.reduce((sum, item) => {
    const unit = Number(item.unitPrice);
    return sum + unit * item.quantity;
  }, 0);

  const shippingFee = Number(order.shippingFee ?? 0);
  const discount = Number(order.discountAmount ?? 0);
  const tax = 0;
  const grandTotal = Number(order.totalAmount);

  const timeline = (order.statusHistory ?? [])
    .length
    ? buildCanonicalTimeline(order.statusHistory, order.createdAt).map((entry) => ({
        status: normalizeOrderStatus(entry.status),
        at: entry.timestamp,
      }))
    : [];

  if (timeline.length === 0 && order.createdAt && order.status) {
    timeline.push({
      status: normalizeOrderStatus(toCanonicalOrderStatus(order.status)),
      at: order.createdAt.toISOString(),
    });
  }

  const items: OrderItemDto[] = order.items.map((item) => {
    const unit = Number(item.unitPrice);
    const subtotal = unit * item.quantity;

    let thumbnail: string | null = null;
    const images = item.variant?.product?.images ?? [];
    if (images.length > 0) {
      const primary = images.find((img) => Boolean(img.isPrimary)) ?? images[0];
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

  const shipping = getOrderTrackingSummary(order.orderNumber, order.shipment);

  return {
    id: String(order.orderId),
    orderCode: order.orderNumber,
    trackingCode: shipping.trackingCode,
    shippingMode: shipping.shippingMode,
    provider: shipping.provider,
    providerOrderCode: shipping.providerOrderCode,
    providerStatus: shipping.providerStatus,
    status: normalizeOrderStatus(toCanonicalOrderStatus(order.status)),
    paymentMethod: order.paymentMethod,
    paymentStatus: deriveCanonicalPaymentStatus(order.payments, order.paymentMethod),
    createdAt: order.createdAt ? order.createdAt.toISOString() : null,
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
      email: order.customerEmail ?? order.user?.email ?? null,
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

export async function getOrderDetailForUser(orderId: number, currentUser: CurrentUser): Promise<OrderDetailDto> {
  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new AppError(400, 'BAD_REQUEST', 'orders:errors.invalidOrderId');
  }

  const order = await findOrderByIdWithRelations(orderId);
  if (!order) {
    throw new AppError(404, 'NOT_FOUND', 'orders:errors.notFound');
  }

  if (!isAdmin(currentUser) && order.userId !== currentUser.userId) {
    throw new AppError(403, 'FORBIDDEN', 'orders:errors.forbidden');
  }

  return mapOrderToDto(order);
}

export async function cancelOrderForUser(
  orderId: number,
  currentUser: CurrentUser,
  cancellationContext?: CancelOrderContext,
): Promise<OrderDetailDto> {
  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new AppError(400, 'BAD_REQUEST', 'orders:errors.invalidOrderId');
  }

  const existing = await findOrderByIdWithRelations(orderId);
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'orders:errors.notFound');
  }

  if (!isAdmin(currentUser) && existing.userId !== currentUser.userId) {
    throw new AppError(403, 'FORBIDDEN', 'orders:errors.forbidden');
  }

  const currentStatus = normalizeOrderStatus(existing.status);
  if (!CUSTOMER_CANCELLABLE_STATUSES.has(currentStatus)) {
    throw new AppError(400, 'ORDER_CANNOT_BE_CANCELLED', 'orders:errors.cannotCancel');
  }

  const orderPaymentStatus = deriveOrderPaymentStatus(existing.payments);
  const shouldCreateVnpayRefundReview =
    (existing.paymentMethod ?? '').trim().toUpperCase() === 'VNPAY' &&
    isCollectedPaymentStatus(orderPaymentStatus);

  // ─── Atomic cancel + stock restore transaction ────────────────────────────
  // All three operations (status update, history append, stock restore + logs)
  // run in a single DB transaction — any failure rolls everything back.
  const updated = await prisma.$transaction(async (tx) => {
    // 1. Update order status
    const updatedOrder = await (tx.order.update as any)({
      where: { orderId },
      data: { status: 'Cancelled' },
      include: {
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
      },
    });

    if (shouldCreateVnpayRefundReview) {
      await createPreDeliveryCancellationRefundRequest(
        tx,
        existing,
        currentUser.userId,
        cancellationContext,
      );
    }

    // 2. Append status history
    await (tx.orderStatusHistory.create as any)({
      data: {
        orderId,
        oldStatus: existing.status,
        status: 'Cancelled',
        changedBy: currentUser.userId,
        changedAt: new Date(),
        note: buildCancellationStatusHistoryNote(
          shouldCreateVnpayRefundReview,
          cancellationContext,
        ),
      },
    });

    // 3. Restore stock and write InventoryLog for each item
    await atomicCancelRestore(
      orderId,
      currentUser.userId,
      existing.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      tx,
      { restoreType: 'cancel' },
    );

    return updatedOrder;
  });

  return mapOrderToDto(updated as OrderWithRelations);
}

// ─── Update Order Status (Admin) ──────────────────────────────────────────────
export async function updateOrderStatusAdmin(
  orderIdRaw: string,
  currentUser: CurrentUser,
  payload: UpdateOrderStatusPayload & {
    carrier?: string;
    trackingNumber?: string;
    estimatedDeliveryDate?: string;
  },
) {
  if (!canEditOrders(currentUser)) {
    throw new AppError(403, 'FORBIDDEN', 'orders:errors.forbidden');
  }

  const parsedId = Number(orderIdRaw);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    throw new AppError(400, 'BAD_REQUEST', 'orders:errors.invalidOrderId');
  }

  const {
    status: newStatus,
    note,
    deliveryProofImages,
    deliveryProofReviewed,
    transitionSource = 'admin_order',
  } = payload;
  if (!newStatus) {
    throw new AppError(400, 'BAD_REQUEST', 'orders:errors.statusRequired');
  }

  const isDeliveredTransition = normalizeOrderStatus(newStatus) === 'delivered';
  if (isDeliveredTransition) {
    if (!Array.isArray(deliveryProofImages) || deliveryProofImages.length === 0) {
      throw new AppError(400, 'DELIVERY_PROOF_REQUIRED', 'orders:errors.deliveryProofRequired');
    }
    if (deliveryProofReviewed !== true) {
      throw new AppError(400, 'DELIVERY_PROOF_REVIEW_REQUIRED', 'orders:errors.deliveryProofReviewRequired');
    }
  }

  const order = await prisma.order.findUnique({
    where: { orderId: parsedId },
    select: {
      orderId: true,
      orderNumber: true,
      status: true,
      userId: true,
      paymentMethod: true,
      totalAmount: true,
      items: {
        select: { orderItemId: true, variantId: true, quantity: true },
      },
    },
  });

  if (!order) {
    throw new AppError(404, 'NOT_FOUND', 'orders:errors.notFound');
  }

  const currentStatus = order.status ?? ORDER_STATUS.PENDING;

  if (!isOrderTransitionAllowed(currentStatus, newStatus, transitionSource)) {
    throw new AppError(
      400,
      'INVALID_STATUS_TRANSITION',
      'orders:errors.invalidTransition',
      undefined,
      {
        from: currentStatus,
        to: newStatus,
        allowed: resolveAllowedOrderTransitions(currentStatus, transitionSource).join(', '),
        transitionSource,
      },
    );
  }

  const shouldRestoreInventory = shouldRestoreInventoryForOrderTransition(newStatus, transitionSource);

  await prisma.$transaction(async (tx) => {
    if (shouldRestoreInventory) {
      await atomicCancelRestore(
        parsedId,
        currentUser.userId,
        order.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        tx,
        {
          restoreType: transitionSource === 'tracking_ops' ? 'return' : 'cancel',
        },
      );
    }

    const orderData: Record<string, any> = { status: newStatus };
    if (note !== undefined) orderData.note = note;

    const guardedUpdate = await tx.order.updateMany({
      where: { orderId: parsedId, status: currentStatus },
      data: orderData,
    });

    if (guardedUpdate.count !== 1) {
      throw new AppError(409, 'ORDER_STATE_CONFLICT', 'orders:errors.stateConflict', {
        orderId: parsedId,
        expectedStatus: currentStatus,
      });
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: parsedId,
        oldStatus: currentStatus,
        status: newStatus,
        changedBy: currentUser.userId,
        note: note ?? null,
      },
    });

    if (isDeliveredTransition) {
      await (tx.shipment.upsert as any)({
        where: { orderId: parsedId },
        update: {
          deliveryProofImages: JSON.stringify(deliveryProofImages ?? []),
          deliveryProofReviewed: Boolean(deliveryProofReviewed),
        },
        create: {
          orderId: parsedId,
          shippingMode: 'manual',
          // Legacy databases may still require carrier/tracking columns on insert.
          carrier: LEGACY_MANUAL_CARRIER,
          trackingNumber: order.orderNumber,
          deliveryProofImages: JSON.stringify(deliveryProofImages ?? []),
          deliveryProofReviewed: Boolean(deliveryProofReviewed),
        },
      });

      await reconcileCodReturnUnlockAfterDeliveryConfirmation(tx as any, {
        orderId: parsedId,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
        actorId: currentUser.userId,
        paymentNote: 'Quản trị viên đã xác nhận giao hàng. Thanh toán COD được đánh dấu là đã thu.',
      });
    }
  });

  try {
    let latest = await prisma.order.findUnique({
      where: { orderId: parsedId },
      include: {
        user: {
          select: {
            email: true,
            fullName: true,
          },
        },
        statusHistory: { orderBy: { changedAt: 'asc' } },
        shipment: true,
      },
    });

    if (latest && normalizeOrderStatus(newStatus) === 'shipping') {
      const providerSync = await syncOrderWithShippingProvider({
        orderId: latest.orderId,
        orderCode: latest.orderNumber,
        currentStatus: latest.status ?? newStatus,
        shipment: latest.shipment,
      });

      if (providerSync && providerSync.shippingMode === 'provider') {
        await (prisma.shipment.upsert as any)({
          where: { orderId: parsedId },
          update: {
            carrier: providerSync.carrier,
            trackingNumber: providerSync.trackingNumber,
            eta: providerSync.estimatedDeliveryDate ? new Date(providerSync.estimatedDeliveryDate) : null,
            shippingMode: providerSync.shippingMode,
            provider: providerSync.provider,
            providerOrderCode: providerSync.providerOrderCode,
            providerStatus: providerSync.providerStatus,
          },
          create: {
            orderId: parsedId,
            carrier: providerSync.carrier,
            trackingNumber: providerSync.trackingNumber,
            eta: providerSync.estimatedDeliveryDate ? new Date(providerSync.estimatedDeliveryDate) : null,
            shippingMode: providerSync.shippingMode,
            provider: providerSync.provider,
            providerOrderCode: providerSync.providerOrderCode,
            providerStatus: providerSync.providerStatus,
          },
        });

        latest = await prisma.order.findUnique({
          where: { orderId: parsedId },
          include: {
            user: {
              select: {
                email: true,
                fullName: true,
              },
            },
            statusHistory: { orderBy: { changedAt: 'asc' } },
            shipment: true,
          },
        });
      }
    }

    if (latest) {
      const statusHistory = latest.statusHistory || [];
      const latestHistoryEntry = statusHistory[statusHistory.length - 1];
      const trackingSummary = getOrderTrackingSummary(latest.orderNumber, latest.shipment);
      const timeline = (latest.statusHistory || []).map((h: any) => ({
        status: h.status,
        timestamp: h.changedAt ? h.changedAt.toISOString() : new Date().toISOString(),
        note: h.note ?? null,
      }));
      emitOrderStatusUpdated({
        orderId: parsedId,
        userId: latest.userId ?? undefined,
        orderCode: latest.orderNumber,
        status: newStatus,
        timeline,
        shippingMode: trackingSummary.shippingMode,
        provider: trackingSummary.provider,
        providerOrderCode: trackingSummary.providerOrderCode,
        providerStatus: trackingSummary.providerStatus,
        carrier: trackingSummary.carrier,
        trackingNumber: trackingSummary.trackingNumber,
        estimatedDeliveryDate: trackingSummary.estimatedDeliveryDate ? new Date(trackingSummary.estimatedDeliveryDate) : null,
      });
    }
  } catch (socketErr: any) {
    logger.warn('[updateOrderStatusAdmin] Socket emit failed (non-critical):', socketErr.message);
  }

  logger.info('Order status updated by operator', {
    orderId: parsedId,
    oldStatus: currentStatus,
    newStatus,
    actorId: currentUser.userId,
  });

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
  customerEmail?: string | null;
  customerPhone: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingWard?: string | null;
  shippingAddressDetail: string;
  shippingCityCode: string;
  shippingMethod: ShippingMethod;
  couponCode?: string | null;
  note?: string | null;
}

/**
 * createOrder — Checkout service function (Clean Architecture layer).
 *
 * All mutations run inside a single Prisma Interactive Transaction so that
 * any failure automatically rolls back every change made within that call:
 *
 *   Step 1 — Server-side pricing + coupon + shipping calculation
 *   Step 2 — Create the Order record with persisted pricing breakdown
 *   Step 3 — Create OrderItem records (price snapshot)
 *   Step 4 — Atomic stock deduction via atomicCheckoutDeduction
 *             → uses UPDATE … WHERE stockQuantity >= quantity
 *             → throws P2025 / INSUFFICIENT_STOCK if a race condition
 *               depletes stock between pricing and checkout deduction
 *   Step 5 — Append initial OrderStatusHistory entry
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
    customerEmail,
    customerPhone,
    shippingCity,
    shippingDistrict,
    shippingWard,
    shippingAddressDetail,
    shippingCityCode,
    shippingMethod,
    couponCode,
    note,
  } = dto;

  if (!items || items.length === 0) {
    throw new AppError(400, 'CART_EMPTY', 'orders:errors.cartEmpty');
  }

  // Generate a human-readable order number before entering the transaction
  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')}`;

  const newOrderId = await prisma.$transaction(async (tx) => {
    const pricing = await quoteOrderPricing(
      {
        userId: currentUser.userId,
        items,
        couponCode,
        shippingCityCode,
        shippingMethod,
      },
      tx as any,
    );
    const itemEconomics = buildOrderItemEconomicsSnapshots(
      pricing.enrichedItems,
      pricing.discountAmount,
    );

    // ── Step 2: Create the Order record ──────────────────────────────────────
    const order = await (tx.order.create as any)({
      data: {
        userId: currentUser.userId,
        orderNumber,
        customerName,
        customerEmail: customerEmail ?? null,
        customerPhone,
        shippingCity,
        shippingDistrict: shippingDistrict ?? '',
        shippingWard: shippingWard ?? null,
        shippingAddressDetail,
        shippingFee: pricing.shippingFee,
        shippingMethod: pricing.shippingMethod,
        shippingCityCode: pricing.shippingCityCode,
        totalAmount: pricing.totalAmount,
        discountAmount: pricing.discountAmount,
        couponId: pricing.coupon?.couponId ?? null,
        status: 'Pending',
        paymentMethod,
        note: note ?? null,
      },
      select: { orderId: true },
    });

    const orderId: number = order.orderId;

    // ── Step 3: Create OrderItem records (price snapshot) ─────────────────────
    await (tx.orderItem.createMany as any)({
      data: pricing.enrichedItems.map((ei, index) => {
        const economics = itemEconomics[index] ?? {
          grossItemAmount: ei.unitPrice * ei.quantity,
          allocatedDiscountAmount: 0,
          netItemPaidAmount: ei.unitPrice * ei.quantity,
        };

        return {
          orderId,
          variantId: ei.variantId,
          productName: ei.productName,
          sku: ei.sku,
          variantName: ei.variantName,
          unitPrice: ei.unitPrice,
          quantity: ei.quantity,
          grossItemAmount: economics.grossItemAmount,
          allocatedDiscountAmount: economics.allocatedDiscountAmount,
          netItemPaidAmount: economics.netItemPaidAmount,
        };
      }),
    });

    // ── Step 4: Atomic stock deduction (race-condition safe) ──────────────────
    // atomicCheckoutDeduction uses:
    //   UPDATE ProductVariants SET StockQuantity -= quantity
    //   WHERE VariantId = ? AND StockQuantity >= quantity
    // If a concurrent request already bought the last units, Prisma throws P2025
    // which this helper converts to INSUFFICIENT_STOCK — triggering a full rollback.
    await atomicCheckoutDeduction(
      orderId,
      currentUser.userId,
      pricing.enrichedItems.map((ei) => ({
        variantId: ei.variantId,
        quantity: ei.quantity,
        productName: ei.productName,
      })),
      tx,
    );

    if (pricing.coupon?.couponId) {
      await tx.coupon.update({
        where: { couponId: pricing.coupon.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    // ── Step 5: Initial status history entry ──────────────────────────────────
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

    if ((paymentMethod ?? '').toUpperCase() === 'VNPAY') {
      await (tx.payment.create as any)({
        data: {
          orderId,
          paymentMethod: 'VNPAY',
          amount: pricing.totalAmount,
          status: 'PENDING',
          transactionCode: null,
          note: 'Awaiting VNPay confirmation',
        },
      });
    }

    logger.info('Order successfully created', {
      orderId,
      orderNumber,
      userId: currentUser.userId,
      totalAmount: pricing.totalAmount,
    });

    return orderId;
  });

  // Re-fetch with full relations so we can return the standard DTO
  const order = await findOrderByIdWithRelations(newOrderId);
  if (!order) {
    // Should never happen unless the DB is in a very unusual state
    throw new AppError(500, 'INTERNAL_ERROR', 'common:errors.internalServer');
  }

  const recipient = resolveOrderNotificationRecipient(order);
  if (recipient) {
    try {
      await notificationService.enqueueOrderPlacedEmail({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        email: recipient,
        customerName: resolveOrderNotificationName(order),
        totalAmount: toNumericAmount(order.totalAmount),
        paymentMethod: order.paymentMethod ?? null,
        createdAt: order.createdAt?.toISOString() ?? null,
        orderUrl: buildOrderDetailUrl(order.orderId),
      });
    } catch (notificationError: any) {
      logger.warn('[createOrder] Failed to enqueue order placed email', {
        orderId: order.orderId,
        error: notificationError?.message ?? String(notificationError),
      });
    }
  }

  return mapOrderToDto(order);
}
