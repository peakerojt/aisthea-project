import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { findManyOrders } from '../modules/order/order.repository';
import { updateOrderStatusAdmin, createOrder as createOrderService } from '../modules/order/order.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { emitNewOrder, emitOrderStatusUpdated } from '../socket';
import {
  ORDER_STATUS,
  isValidTransition,
  INVENTORY_RESTORE_STATUSES,
  getValidNextStatuses,
} from '../config/orderStatus.config';
import { ERROR_CODES, SUCCESS_MESSAGES } from '../utils/constants/responseKeys';
import { logger } from '../lib/logger';
import { deriveOrderPaymentStatus, getShipmentSummary } from '../shared/order-state';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const firstQueryValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const v0 = value[0];
    return typeof v0 === 'string' ? v0 : undefined;
  }
  return undefined;
};

function parseIdParam(param: string | string[]): number | null {
  const raw = Array.isArray(param) ? param[0] : param;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

function resolveVariantImage(item: any): string | null {
  const variantImage =
    item.variant?.images?.[0]?.thumbnailUrl ??
    item.variant?.images?.[0]?.imageUrl ??
    null;

  if (variantImage) return variantImage;

  return (
    item.variant?.product?.images?.[0]?.thumbnailUrl ??
    item.variant?.product?.images?.[0]?.imageUrl ??
    null
  );
}

async function loadVariantFallbacksBySku(items: Array<{ sku: string; variant?: unknown | null }>) {
  const missingSkus = [...new Set(
    items
      .filter((item) => !item.variant && typeof item.sku === 'string' && item.sku.trim().length > 0)
      .map((item) => item.sku.trim()),
  )];

  if (missingSkus.length === 0) {
    return new Map<string, any>();
  }

  const variants = await prisma.productVariant.findMany({
    where: { sku: { in: missingSkus } },
    select: {
      variantId: true,
      productId: true,
      sku: true,
      images: {
        select: { imageUrl: true, thumbnailUrl: true },
        orderBy: [{ isPrimary: 'desc' }, { imageId: 'asc' }],
        take: 1,
      },
      product: {
        select: {
          productId: true,
          name: true,
          images: {
            select: { imageUrl: true, thumbnailUrl: true },
            orderBy: [{ isPrimary: 'desc' }, { imageId: 'asc' }],
            take: 1,
          },
        },
      },
    },
  });

  return new Map(variants.map((variant) => [variant.sku, variant]));
}

type OrderRow = Awaited<ReturnType<typeof findManyOrders>>['data'][number];

function formatOrderSummary(order: OrderRow) {
  const paymentStatus = deriveOrderPaymentStatus(order.payments);
  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    status: order.status,
    paymentStatus,
    paymentMethod: order.paymentMethod,
    totalAmount: order.totalAmount?.toString() ?? '0',
    createdAt: order.createdAt?.toISOString(),
    itemCount: order._count.items,
    user: order.user
      ? {
        userId: order.user.userId,
        email: order.user.email,
        fullName: order.user.fullName,
        avatarUrl: order.user.avatarUrl,
      }
      : null,
  };
}

function buildStatusHistory(order: any) {
  const history: Array<{
    status: string;
    oldStatus: string | null;
    changedAt: string;
    changedBy: number | null;
    note: string | null;
  }> = order.statusHistory.map((h: any) => ({
    status: h.status,
    oldStatus: h.oldStatus ?? null,
    changedAt: h.changedAt.toISOString(),
    changedBy: h.changedBy ?? null,
    note: h.note ?? null,
  }));

  const hasPending = history.some((h) => h.status.toLowerCase() === 'pending');
  if (history.length === 0 || !hasPending) {
    history.unshift({
      status: 'Pending',
      oldStatus: null,
      changedAt: (order.createdAt || new Date()).toISOString(),
      changedBy: null,
      note: 'Order placed',
    });
  }

  return history.sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
}

// ─── ADMIN: Get All Orders | GET /api/orders/admin ───────────────────────────

export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page, pageSize, search, startDate, endDate, sort } = req.query;
    const filters = {
      status: firstQueryValue(status),
      search: firstQueryValue(search),
      startDate: firstQueryValue(startDate),
      endDate: firstQueryValue(endDate),
      page: parseInt(firstQueryValue(page) || '1', 10) || 1,
      limit: parseInt(firstQueryValue(pageSize) || '15', 10) || 15,
      sort: firstQueryValue(sort),
    };
    const { data: orders, meta } = await findManyOrders(filters);
    res.json({ data: orders.map(formatOrderSummary), meta });
  } catch (error: any) {
    logger.error('[getAllOrders] Failed', { message: error?.message, prismaCode: error?.code, meta: error?.meta, url: req.originalUrl });
    res.status(500).json({ success: false, errorCode: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' });
  }
};

// ─── ADMIN: Get Order Detail | GET /api/orders/admin/:id ──────────────────────

export const getAdminOrderDetail = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseIdParam(req.params.id);
    if (orderId === null) return res.status(400).json({ error: 'Invalid order ID' });

    const order = await prisma.order.findUnique({
      where: { orderId },
      include: {
        user: { select: { userId: true, email: true, fullName: true, avatarUrl: true, phone: true } },
        items: {
          include: {
            variant: {
              include: {
                images: {
                  select: { imageUrl: true, thumbnailUrl: true },
                  orderBy: [{ isPrimary: 'desc' }, { imageId: 'asc' }],
                  take: 1,
                },
                product: {
                  select: {
                    productId: true,
                    name: true,
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
        payments: true,
        shipment: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });

    if (!order) return res.status(404).json({ success: false, errorCode: 'ORDER_NOT_FOUND', message: 'Order not found' });

    const variantFallbackBySku = await loadVariantFallbacksBySku(order.items);
    const shipment = getShipmentSummary(order.shipment);
    const paymentStatus = deriveOrderPaymentStatus(order.payments);

    res.json({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount?.toString() ?? '0',
      discountAmount: order.discountAmount?.toString() ?? '0',
      note: order.note,
      createdAt: order.createdAt?.toISOString(),
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      shippingAddress: {
        recipientName: order.customerName,
        phone: order.customerPhone,
        city: order.shippingCity,
        district: order.shippingDistrict,
        addressDetail: order.shippingAddressDetail,
      },
      user: order.user ? { ...order.user } : null,
      items: order.items.map((item) => {
        const resolvedVariant = item.variant ?? variantFallbackBySku.get(item.sku) ?? null;
        const resolvedItem = { ...item, variant: resolvedVariant };

        return {
          orderItemId: item.orderItemId,
          productId: resolvedVariant?.product?.productId ?? resolvedVariant?.productId ?? null,
          productName: item.productName,
          sku: item.sku,
          variantName: item.variantName,
          unitPrice: item.unitPrice?.toString() ?? '0',
          quantity: item.quantity,
          lineTotal: (parseFloat(item.unitPrice?.toString() ?? '0') * item.quantity).toString(),
          image: resolveVariantImage(resolvedItem),
        };
      }),
      payments: order.payments.map((p) => ({
        paymentId: p.paymentId,
        method: p.paymentMethod,
        amount: p.amount?.toString() ?? '0',
        status: p.status,
        paidAt: p.paymentDate?.toISOString(),
      })),
      statusHistory: buildStatusHistory(order),
    });
  } catch (error: any) {
    logger.error('[getAdminOrderDetail] Failed', { message: error?.message, orderId: req.params.id, url: req.originalUrl });
    res.status(500).json({ success: false, errorCode: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' });
  }
};

// ─── ADMIN: Update Order Status | PATCH /api/orders/:id/status ────────────────

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseIdParam(req.params.id);
    if (orderId === null) return res.status(400).json({ error: 'Invalid order ID' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { status, note, carrier, trackingNumber, estimatedDeliveryDate } = req.body as {
      status: string;
      note?: string;
      carrier?: string;
      trackingNumber?: string;
      estimatedDeliveryDate?: string;
    };

    const result = await updateOrderStatusAdmin(orderId.toString(), req.user, {
      status,
      note,
      carrier,
      trackingNumber,
      estimatedDeliveryDate,
    });

    res.json({ success: true, messageKey: SUCCESS_MESSAGES.ORDER_STATUS_UPDATED, ...result });
  } catch (error: any) {
    logger.error('[updateOrderStatus] Failed', { message: error?.message, orderId: req.params.id, url: req.originalUrl });
    if (error.status) {
      res.status(error.status).json({ success: false, errorCode: error.code, message: error.message });
      return;
    }
    res.status(500).json({ success: false, errorCode: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' });
  }
};

// ─── USER: Get My Orders | GET /api/orders/my ────────────────────────────────

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { status, page, pageSize, sort } = req.query;
    const filters = {
      userId,
      status: firstQueryValue(status),
      page: parseInt(firstQueryValue(page) || '1', 10) || 1,
      limit: parseInt(firstQueryValue(pageSize) || '10', 10) || 10,
      sort: firstQueryValue(sort) || 'createdAt_desc',
    };

    const { data: orders, meta } = await findManyOrders(filters);
    res.json({ data: orders.map(formatOrderSummary), meta });
  } catch (error: any) {
    logger.error('[getMyOrders] Failed', { message: error?.message, userId: req.user?.userId, url: req.originalUrl });
    res.status(500).json({ success: false, errorCode: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' });
  }
};

// ─── USER: Get My Order Detail | GET /api/orders/my/:orderId ─────────────────

export const getMyOrderDetail = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const orderId = parseIdParam(req.params.orderId);
    if (orderId === null) return res.status(400).json({ error: 'Invalid order ID' });

    const order = await prisma.order.findFirst({
      where: { orderId, userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
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
            review: { select: { reviewId: true } },
          },
        },
        payments: true,
        shipment: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const variantFallbackBySku = await loadVariantFallbacksBySku(order.items);
    const shipment = getShipmentSummary(order.shipment);
    const paymentStatus = deriveOrderPaymentStatus(order.payments);

    res.json({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount.toString(),
      discountAmount: order.discountAmount?.toString() ?? '0',
      createdAt: order.createdAt?.toISOString(),
      updatedAt: order.updatedAt?.toISOString() ?? order.createdAt?.toISOString(),
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      shippingAddress: {
        recipientName: order.customerName,
        phone: order.customerPhone,
        city: order.shippingCity,
        district: order.shippingDistrict ?? undefined,
        ward: order.shippingWard ?? undefined,
        addressDetail: order.shippingAddressDetail,
      },
      items: order.items.map((item) => {
        const resolvedVariant = item.variant ?? variantFallbackBySku.get(item.sku) ?? null;
        const resolvedItem = { ...item, variant: resolvedVariant };

        return {
          orderItemId: item.orderItemId,
          productId: resolvedVariant?.productId ?? null,
          variantId: item.variantId ?? resolvedVariant?.variantId ?? null,
          productName: item.productName,
          sku: item.sku,
          variantName: item.variantName,
          unitPrice: item.unitPrice.toString(),
          quantity: item.quantity,
          lineTotal: (parseFloat(item.unitPrice.toString()) * item.quantity).toString(),
          thumbnailUrl: resolveVariantImage(resolvedItem),
          isReviewed: !!item.review,
          reviewId: item.review?.reviewId ?? null,
        };
      }),
      payments: order.payments.map((p) => ({
        paymentId: p.paymentId,
        paymentMethod: p.paymentMethod,
        amount: p.amount?.toString() ?? '0',
        status: p.status,
        paymentDate: p.paymentDate?.toISOString() ?? null,
        transactionCode: (p as any).transactionCode ?? null,
        note: (p as any).note ?? null,
      })),
      timeline: order.statusHistory.map((h) => ({ status: h.status, at: h.changedAt.toISOString() })),
    });
  } catch (error: any) {
    logger.error('[getMyOrderDetail] Failed', { message: error?.message, orderId: req.params.orderId, userId: req.user?.userId });
    res.status(500).json({ success: false, errorCode: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' });
  }
};

// ─── USER: Create Order | POST /api/orders ───────────────────────────────────

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      paymentMethod, customerName, customerPhone, shippingCity, shippingDistrict,
      shippingWard, shippingAddressDetail, note, items, couponCode,
    } = req.body;

    if (!paymentMethod) return res.status(400).json({ error: 'Payment method is required' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ errorCode: ERROR_CODES.CART_EMPTY });
    }

    const currentUser = { userId: req.user.userId, roles: (req.user as any).roles || [] };
    const orderDetail = await createOrderService(currentUser, {
      items,
      paymentMethod,
      customerName: customerName || 'Khách hàng',
      customerPhone: customerPhone || '0000000000',
      shippingCity: shippingCity || 'Hà Nội',
      shippingDistrict: shippingDistrict || 'Không xác định',
      shippingWard: shippingWard || null,
      shippingAddressDetail: shippingAddressDetail || 'Không xác định',
      note: note || null,
    });
    const orderId = Number(orderDetail.id);

    const cart = await prisma.cart.findFirst({ where: { userId } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.cartId } });

    let discountAmount = 0;
    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      try {
        const currentOrder = await prisma.order.findUnique({ where: { orderId }, select: { totalAmount: true } });
        if (currentOrder) {
          const cartSubtotal = Number(currentOrder.totalAmount);
          await prisma.$transaction(async (tx) => {
            const { validateCoupon } = await import('../services/coupon.service');
            const { coupon, discountAmount: discount } = await validateCoupon(couponCode.trim(), userId, cartSubtotal, tx as any);
            discountAmount = discount;
            const newTotal = Math.max(0, cartSubtotal - discount);
            await (tx.order as any).update({ where: { orderId }, data: { totalAmount: newTotal, discountAmount: discount, couponId: coupon.couponId } });
            await (tx.coupon as any).update({ where: { couponId: coupon.couponId }, data: { usedCount: { increment: 1 } } });
          });
        }
      } catch (couponErr: any) {
        logger.warn('[createOrder] Coupon validation failed (order still created)', { message: couponErr.message });
      }
    }

    try {
      const finalOrder = await prisma.order.findUnique({ where: { orderId }, select: { totalAmount: true } });
      emitNewOrder({ orderId, totalAmount: finalOrder ? Number(finalOrder.totalAmount) : 0 });
    } catch {
      // Non-critical socket emit
    }

    return res.json({ success: true, orderId, discountAmount, message: 'Order created successfully' });
  } catch (error: any) {
    logger.error('[createOrder] Checkout failed', { message: error?.message, errorCode: error?.code, userId: req.user?.userId });
    if (error.status) return res.status(error.status).json({ success: false, errorCode: error.code, message: error.message });
    return res.status(500).json({ success: false, errorCode: 'CHECKOUT_FAILED', message: 'Checkout failed. Please try again.' });
  }
};

// ─── USER: Confirm Receipt | PATCH /api/orders/:id/confirm-receipt ────────────

export const confirmReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ errorCode: ERROR_CODES.UNAUTHORIZED });

    const orderId = parseIdParam(req.params.id);
    if (orderId === null) return res.status(400).json({ errorCode: ERROR_CODES.INVALID_ORDER_ID });

    const order = await prisma.order.findUnique({
      where: { orderId },
      select: { orderId: true, userId: true, status: true },
    });

    if (!order) return res.status(404).json({ errorCode: ERROR_CODES.ORDER_NOT_FOUND });
    if (order.userId !== userId) return res.status(403).json({ errorCode: ERROR_CODES.NOT_ORDER_OWNER });
    if (order.status !== ORDER_STATUS.SHIPPING) {
      return res.status(400).json({ errorCode: ERROR_CODES.ORDER_NOT_SHIPPING, currentStatus: order.status });
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { orderId }, data: { status: ORDER_STATUS.DELIVERED } });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          oldStatus: ORDER_STATUS.SHIPPING,
          status: ORDER_STATUS.DELIVERED,
          changedBy: userId,
          note: 'Khách hàng xác nhận đã nhận hàng',
        },
      });
    });

    return res.json({ success: true, messageKey: SUCCESS_MESSAGES.RECEIPT_CONFIRMED, orderId, newStatus: ORDER_STATUS.DELIVERED });
  } catch (error: any) {
    logger.error('[confirmReceipt] Failed', { message: error?.message, orderId: req.params.id, userId: req.user?.userId });
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' });
  }
};
