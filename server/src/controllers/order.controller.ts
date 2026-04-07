import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { countOrdersByStatus, findManyOrders } from '../modules/order/order.repository';
import { updateOrderStatusAdmin, createOrder as createOrderService } from '../modules/order/order.service';
import { quoteOrderPricing, ShippingMethod } from '../modules/order/order-pricing.service';
import { reconcileCodReturnUnlockAfterDeliveryConfirmation } from '../modules/order/cod-return-reconciliation';
import { AuthRequest } from '../middlewares/auth.middleware';
import { emitNewOrder, emitOrderStatusUpdated } from '../socket';
import {
  ORDER_STATUS,
} from '../config/orderStatus.config';
import { ERROR_CODES, SUCCESS_MESSAGES } from '../utils/constants/responseKeys';
import { logger } from '../lib/logger';
import { env } from '../lib/env';
import { getOrderTrackingSummary } from '../shared/order-state';
import {
  buildCanonicalTimeline,
  buildOrderSummaryRow,
  deriveCanonicalPaymentStatus,
  toCanonicalOrderStatus,
} from '../shared/order-contract';
import { fileToBase64 } from '../middlewares/upload.middleware';
import { cloudinaryService } from '../services/cloudinary.service';
import { getRefundsForOrder } from '../services/refund.service';
import { notificationService } from '../modules/notifications/notification.service';
import type { CreateOrderInput, QuoteOrderInput } from '../modules/order/order.validator';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const ORDER_TAB_STATUS_KEYS = ['Pending', 'Processing', 'Shipping', 'Delivered', 'Cancelled'] as const;

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

const parseAdminOrderFilters = (query: AuthRequest['query']) => ({
  status: firstQueryValue(query.status),
  search: firstQueryValue(query.search),
  startDate: firstQueryValue(query.startDate),
  endDate: firstQueryValue(query.endDate),
  page: parseInt(firstQueryValue(query.page) || '1', 10) || 1,
  limit: parseInt(firstQueryValue(query.pageSize) || '15', 10) || 15,
  sort: firstQueryValue(query.sort),
});

function resolveVariantImage(item: any): string | null {
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

function buildPricingBreakdown(
  items: Array<{ unitPrice: { toString(): string } | string | number; quantity: number }>,
  shippingFee: unknown,
  discountAmount: unknown,
  totalAmount: unknown,
) {
  const itemsTotal = items.reduce((sum, item) => {
    const unitPrice = Number(item.unitPrice?.toString?.() ?? item.unitPrice ?? 0);
    return sum + unitPrice * item.quantity;
  }, 0);

  const shipping = Number(shippingFee ?? 0);
  const discount = Number(discountAmount ?? 0);
  const grandTotal = Number(totalAmount ?? 0);

  return {
    itemsTotal,
    shippingFee: shipping,
    discount,
    tax: 0,
    grandTotal,
  };
}

function parseDeliveryProofImages(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
  } catch {
    return [];
  }
}

const buildOrderDetailUrl = (orderId: number) => `${env.clientUrl.replace(/\/$/, '')}/account/orders/${orderId}`;

// ─── ADMIN: Get All Orders | GET /api/orders/admin ───────────────────────────

export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const filters = parseAdminOrderFilters(req.query);
    const { data: orders, meta } = await findManyOrders(filters);
    res.json({ data: orders.map(buildOrderSummaryRow), meta });
  } catch (error: any) {
    logger.error('[getAllOrders] Failed', { message: error?.message, prismaCode: error?.code, meta: error?.meta, url: req.originalUrl });
    res.status(500).json({ success: false, errorCode: 'INTERNAL_SERVER_ERROR' });
  }
};

export const getAdminOrderTabCounts = async (req: AuthRequest, res: Response) => {
  try {
    const filters = parseAdminOrderFilters(req.query);
    const { total, counts } = await countOrdersByStatus({
      search: filters.search,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    res.json({
      data: {
        ALL: total,
        ...Object.fromEntries(
          ORDER_TAB_STATUS_KEYS.map((statusKey) => [statusKey, counts[statusKey] ?? 0]),
        ),
      },
    });
  } catch (error: any) {
    logger.error('[getAdminOrderTabCounts] Failed', {
      message: error?.message,
      prismaCode: error?.code,
      meta: error?.meta,
      url: req.originalUrl,
    });
    res.status(500).json({ success: false, errorCode: 'INTERNAL_SERVER_ERROR' });
  }
};

// ─── ADMIN: Get Order Detail | GET /api/orders/admin/:id ──────────────────────

export const getAdminOrderDetail = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseIdParam(req.params.id);
    if (orderId === null) return res.status(400).json({ errorCode: 'INVALID_ORDER_ID' });

    const order = await prisma.order.findUnique({
      where: { orderId },
      include: {
        user: { select: { userId: true, email: true, fullName: true, avatarUrl: true, phone: true } },
        items: {
          include: {
            variant: {
              include: {
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

    if (!order) return res.status(404).json({ success: false, errorCode: 'ORDER_NOT_FOUND' });

    const [variantFallbackBySku, refundHistory] = await Promise.all([
      loadVariantFallbacksBySku(order.items),
      getRefundsForOrder(orderId).catch((error: any) => {
        logger.warn('[getAdminOrderDetail] Refund summary bootstrap failed', {
          message: error?.message,
          orderId,
        });
        return null;
      }),
    ]);
    const shipping = getOrderTrackingSummary(order.orderNumber, order.shipment);
    const paymentStatus = deriveCanonicalPaymentStatus(order.payments, order.paymentMethod);
    const timeline = buildCanonicalTimeline(order.statusHistory, order.createdAt);
    const deliveryProof = {
      images: parseDeliveryProofImages((order.shipment as any)?.deliveryProofImages),
      reviewed: Boolean((order.shipment as any)?.deliveryProofReviewed),
    };

    res.json({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      orderCode: order.orderNumber,
      status: toCanonicalOrderStatus(order.status),
      paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount?.toString() ?? '0',
      discountAmount: order.discountAmount?.toString() ?? '0',
      shippingFee: order.shippingFee?.toString() ?? '0',
      shippingMethod: order.shippingMethod ?? 'STANDARD',
      shippingCityCode: order.shippingCityCode ?? null,
      pricing: buildPricingBreakdown(order.items, order.shippingFee, order.discountAmount, order.totalAmount),
      note: order.note,
      createdAt: order.createdAt?.toISOString(),
      trackingCode: shipping.trackingCode,
      shippingMode: shipping.shippingMode,
      provider: shipping.provider,
      providerOrderCode: shipping.providerOrderCode,
      providerStatus: shipping.providerStatus,
      trackingNumber: shipping.trackingNumber,
      carrier: shipping.carrier,
      deliveryProof,
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
      refundSummary: refundHistory?.summary ?? null,
      statusHistory: timeline.map((entry) => ({
        status: entry.status,
        oldStatus: entry.oldStatus,
        changedAt: entry.timestamp,
        changedBy: entry.changedBy,
        note: entry.note,
      })),
      timeline,
    });
  } catch (error: any) {
    logger.error('[getAdminOrderDetail] Failed', { message: error?.message, orderId: req.params.id, url: req.originalUrl });
    res.status(500).json({ success: false, errorCode: 'INTERNAL_SERVER_ERROR' });
  }
};

// ─── ADMIN: Update Order Status | PATCH /api/orders/:id/status ────────────────

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseIdParam(req.params.id);
    if (orderId === null) return res.status(400).json({ errorCode: 'INVALID_ORDER_ID' });
    if (!req.user) return res.status(401).json({ errorCode: 'UNAUTHORIZED' });

    const { status, note, deliveryProofImages, deliveryProofReviewed } = req.body as {
      status: string;
      note?: string;
      deliveryProofImages?: string[];
      deliveryProofReviewed?: boolean;
    };

    const result = await updateOrderStatusAdmin(orderId.toString(), req.user, {
      status,
      note,
      deliveryProofImages,
      deliveryProofReviewed,
    });

    res.json({ success: true, code: SUCCESS_MESSAGES.ORDER_STATUS_UPDATED, ...result });
  } catch (error: any) {
    logger.error('[updateOrderStatus] Failed', {
      message: error?.message,
      stack: error?.stack,
      statusCode: error?.statusCode ?? error?.status,
      errorCode: error?.errorCode ?? error?.code,
      details: error?.details,
      payload: req.body,
      orderId: req.params.id,
      url: req.originalUrl,
    });

    const statusCode = error?.statusCode ?? error?.status;
    const errorCode = error?.errorCode ?? error?.code;
    const messageKey = error?.messageKey;

    if (statusCode) {
      res.status(statusCode).json({
        success: false,
        errorCode: errorCode ?? 'REQUEST_FAILED',
        code: errorCode ?? 'REQUEST_FAILED',
        messageKey,
        ...(process.env.NODE_ENV === 'production' ? {} : { details: error?.details }),
      });
      return;
    }
    res.status(500).json({ success: false, errorCode: 'INTERNAL_SERVER_ERROR' });
  }
};

// ─── USER: Get My Orders | GET /api/orders/my ────────────────────────────────

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ errorCode: 'UNAUTHORIZED' });

    const { status, page, pageSize, sort } = req.query;
    const filters = {
      userId,
      status: firstQueryValue(status),
      page: parseInt(firstQueryValue(page) || '1', 10) || 1,
      limit: parseInt(firstQueryValue(pageSize) || '10', 10) || 10,
      sort: firstQueryValue(sort) || 'createdAt_desc',
    };

    const { data: orders, meta } = await findManyOrders(filters);
    res.json({ data: orders.map(buildOrderSummaryRow), meta });
  } catch (error: any) {
    logger.error('[getMyOrders] Failed', { message: error?.message, userId: req.user?.userId, url: req.originalUrl });
    res.status(500).json({ success: false, errorCode: 'INTERNAL_SERVER_ERROR' });
  }
};

// ─── USER: Get My Order Detail | GET /api/orders/my/:orderId ─────────────────

export const getMyOrderDetail = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ errorCode: 'UNAUTHORIZED' });

    const orderId = parseIdParam(req.params.orderId);
    if (orderId === null) return res.status(400).json({ errorCode: 'INVALID_ORDER_ID' });

    const order = await prisma.order.findFirst({
      where: { orderId, userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
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

    if (!order) return res.status(404).json({ errorCode: 'ORDER_NOT_FOUND' });

    const variantFallbackBySku = await loadVariantFallbacksBySku(order.items);
    const shipping = getOrderTrackingSummary(order.orderNumber, order.shipment);
    const paymentStatus = deriveCanonicalPaymentStatus(order.payments, order.paymentMethod);
    const timeline = buildCanonicalTimeline(order.statusHistory, order.createdAt);

    res.json({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      orderCode: order.orderNumber,
      status: toCanonicalOrderStatus(order.status),
      paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount.toString(),
      discountAmount: order.discountAmount?.toString() ?? '0',
      shippingFee: order.shippingFee?.toString() ?? '0',
      shippingMethod: order.shippingMethod ?? 'STANDARD',
      shippingCityCode: order.shippingCityCode ?? null,
      pricing: buildPricingBreakdown(order.items, order.shippingFee, order.discountAmount, order.totalAmount),
      createdAt: order.createdAt?.toISOString(),
      updatedAt: order.updatedAt?.toISOString() ?? order.createdAt?.toISOString(),
      trackingCode: shipping.trackingCode,
      shippingMode: shipping.shippingMode,
      provider: shipping.provider,
      providerOrderCode: shipping.providerOrderCode,
      providerStatus: shipping.providerStatus,
      trackingNumber: shipping.trackingNumber,
      carrier: shipping.carrier,
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
      timeline,
    });
  } catch (error: any) {
    logger.error('[getMyOrderDetail] Failed', { message: error?.message, orderId: req.params.orderId, userId: req.user?.userId });
    res.status(500).json({ success: false, errorCode: 'INTERNAL_SERVER_ERROR' });
  }
};

// ─── USER: Quote Order | POST /api/orders/quote ──────────────────────────────

export const quoteOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ errorCode: 'UNAUTHORIZED' });

    const { items, couponCode, shippingCityCode, shippingMethod } = req.body as QuoteOrderInput;

    const pricing = await quoteOrderPricing({
      userId,
      items,
      couponCode,
      shippingCityCode,
      shippingMethod,
    });

    return res.json({
      itemsSubtotal: pricing.itemsSubtotal,
      shippingFee: pricing.shippingFee,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
      shippingMethod: pricing.shippingMethod,
      shippingCityCode: pricing.shippingCityCode,
      appliedCouponCode: pricing.appliedCouponCode,
      coupon: pricing.coupon,
    });
  } catch (error: any) {
    logger.error('[quoteOrder] Failed', { message: error?.message, userId: req.user?.userId });
    if (error.status) {
      return res.status(error.status).json({ success: false, errorCode: error.code });
    }
    return res.status(500).json({ success: false, errorCode: 'CHECKOUT_QUOTE_FAILED' });
  }
};

// ─── USER: Create Order | POST /api/orders ───────────────────────────────────

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ errorCode: 'UNAUTHORIZED' });

    const {
      paymentMethod, customerName, customerEmail, customerPhone, shippingCity, shippingDistrict,
      shippingWard, shippingAddressDetail, note, items, couponCode, shippingCityCode, shippingMethod,
    } = req.body as CreateOrderInput;

    const currentUser = { userId: req.user.userId, roles: (req.user as any).roles || [] };
    const orderDetail = await createOrderService(currentUser, {
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
      shippingMethod: shippingMethod as ShippingMethod,
      couponCode: couponCode ?? null,
      note: note ?? null,
    });
    const orderId = Number(orderDetail.id);

    const cart = await prisma.cart.findFirst({ where: { userId } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.cartId } });

    try {
      emitNewOrder({ orderId, totalAmount: orderDetail.pricing.grandTotal });
    } catch {
      // Non-critical socket emit
    }

    return res.json({
      success: true,
      code: 'ORDER_CREATED',
      orderId,
      orderCode: orderDetail.orderCode,
      trackingCode: orderDetail.trackingCode,
      status: toCanonicalOrderStatus(orderDetail.status),
      paymentStatus: deriveCanonicalPaymentStatus(
        orderDetail.paymentStatus ? [{ status: orderDetail.paymentStatus }] : [],
        orderDetail.paymentMethod,
      ),
      pricing: orderDetail.pricing,
      paymentMethod: orderDetail.paymentMethod,
    });
  } catch (error: any) {
    logger.error('[createOrder] Checkout failed', { message: error?.message, errorCode: error?.code, userId: req.user?.userId });
    if (error.status) return res.status(error.status).json({ success: false, errorCode: error.code });
    return res.status(500).json({ success: false, errorCode: 'CHECKOUT_FAILED' });
  }
};

// ─── ADMIN: Upload Delivery Proof Images | POST /api/orders/:id/delivery-proof-images ─────

export const uploadDeliveryProofImages = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseIdParam(req.params.id);
    if (orderId === null) return res.status(400).json({ errorCode: 'INVALID_ORDER_ID' });

    const order = await prisma.order.findUnique({
      where: { orderId },
      select: { orderId: true },
    });
    if (!order) return res.status(404).json({ success: false, errorCode: 'ORDER_NOT_FOUND' });

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, errorCode: 'DELIVERY_PROOF_REQUIRED' });
    }

    const uploaded = await Promise.all(
      files.map(async (file) => {
        const result = await cloudinaryService.uploadBase64(fileToBase64(file), {
          folder: `orders/delivery-proof/${orderId}`,
          transformation: {
            width: 1600,
            height: 1600,
            crop: 'limit',
            quality: 'auto:good',
          },
        });

        return {
          url: result.secureUrl,
          width: result.width,
          height: result.height,
        };
      }),
    );

    return res.status(201).json({
      success: true,
      code: 'DELIVERY_PROOF_UPLOADED',
      data: {
        images: uploaded,
      },
    });
  } catch (error: any) {
    logger.error('[uploadDeliveryProofImages] Failed', { message: error?.message, orderId: req.params.id });
    return res.status(500).json({ success: false, errorCode: 'DELIVERY_PROOF_UPLOAD_FAILED' });
  }
};

// ─── USER: Upload Return Proof Images | POST /api/orders/:id/return-proof-images ────────────

export const uploadReturnProofImages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ errorCode: 'UNAUTHORIZED' });

    const orderId = parseIdParam(req.params.id);
    if (orderId === null) return res.status(400).json({ errorCode: 'INVALID_ORDER_ID' });

    const order = await prisma.order.findUnique({
      where: { orderId },
      select: {
        orderId: true,
        userId: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, errorCode: 'ORDER_NOT_FOUND' });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ success: false, errorCode: 'NOT_ORDER_OWNER' });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, errorCode: 'RETURN_PROOF_REQUIRED' });
    }

    const uploaded = await Promise.all(
      files.map(async (file) => {
        const result = await cloudinaryService.uploadBase64(fileToBase64(file), {
          folder: `orders/return-proof/${orderId}/${userId}`,
          transformation: {
            width: 1600,
            height: 1600,
            crop: 'limit',
            quality: 'auto:good',
          },
        });

        return {
          url: result.secureUrl,
          width: result.width,
          height: result.height,
        };
      }),
    );

    return res.status(201).json({
      success: true,
      code: 'RETURN_PROOF_UPLOADED',
      data: {
        images: uploaded,
      },
    });
  } catch (error: any) {
    logger.error('[uploadReturnProofImages] Failed', {
      message: error?.message,
      orderId: req.params.id,
      userId: req.user?.userId,
    });
    return res.status(500).json({ success: false, errorCode: 'RETURN_PROOF_UPLOAD_FAILED' });
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
      select: {
        orderId: true,
        userId: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        status: true,
        paymentMethod: true,
        totalAmount: true,
        user: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!order) return res.status(404).json({ errorCode: ERROR_CODES.ORDER_NOT_FOUND });
    if (order.userId !== userId) return res.status(403).json({ errorCode: ERROR_CODES.NOT_ORDER_OWNER });
    if (order.status !== ORDER_STATUS.SHIPPING) {
      return res.status(400).json({ errorCode: ERROR_CODES.ORDER_NOT_SHIPPING, currentStatus: order.status });
    }
    const confirmationTimestamp = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { orderId }, data: { status: ORDER_STATUS.DELIVERED } });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          oldStatus: ORDER_STATUS.SHIPPING,
          status: ORDER_STATUS.DELIVERED,
          changedBy: userId,
          note: 'Khách hàng xác nhận đã nhận hàng',
          changedAt: confirmationTimestamp,
        },
      });

      await reconcileCodReturnUnlockAfterDeliveryConfirmation(tx as any, {
        orderId,
        paymentMethod: order.paymentMethod,
        totalAmount: order.totalAmount,
        actorId: userId,
        paymentNote: 'Khách hàng đã xác nhận nhận hàng. Thanh toán COD được đánh dấu là đã thu.',
      });
    });

    const recipient = order.customerEmail?.trim() || order.user?.email?.trim() || null;
    if (recipient) {
      try {
        await notificationService.enqueueOrderStatusEmail({
          orderId,
          orderNumber: order.orderNumber,
          email: recipient,
          customerName: order.customerName?.trim() || order.user?.fullName?.trim() || 'AISTHEA Customer',
          status: ORDER_STATUS.DELIVERED,
          previousStatus: ORDER_STATUS.SHIPPING,
          note: 'Khách hàng xác nhận đã nhận hàng',
          trackingUrl: buildOrderDetailUrl(orderId),
          historyTimestamp: confirmationTimestamp.toISOString(),
        });
      } catch (notificationError: any) {
        logger.warn('[confirmReceipt] Failed to enqueue delivered order email', {
          orderId,
          error: notificationError?.message ?? String(notificationError),
        });
      }
    }

    return res.json({ success: true, code: SUCCESS_MESSAGES.RECEIPT_CONFIRMED, orderId, newStatus: ORDER_STATUS.DELIVERED });
  } catch (error: any) {
    logger.error('[confirmReceipt] Failed', { message: error?.message, orderId: req.params.id, userId: req.user?.userId });
    return res.status(500).json({ success: false, errorCode: 'INTERNAL_SERVER_ERROR' });
  }
};
