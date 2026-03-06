import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { findManyOrders } from '../modules/order/order.repository';
import { updateOrderStatusAdmin } from '../modules/order/order.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { emitNewOrder, emitOrderStatusUpdated } from '../socket';
import {
  ORDER_STATUS,
  isValidTransition,
  INVENTORY_RESTORE_STATUSES,
  getValidNextStatuses,
} from '../config/orderStatus.config';
import { ERROR_CODES, SUCCESS_MESSAGES } from '../utils/constants/responseKeys';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const firstQueryValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const v0 = value[0];
    return typeof v0 === 'string' ? v0 : undefined;
  }
  return undefined;
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Get All Orders
// GET /api/orders/admin
// ─────────────────────────────────────────────────────────────────────────────

export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const {
      status,
      page,
      pageSize,
      search,
      startDate,
      endDate,
      sort,
    } = req.query;

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

    const formatted = orders.map((order) => ({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      status: order.status,
      paymentStatus: order.paymentStatus,
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
    }));

    res.json({
      data: formatted,
      meta,
    });
  } catch (error: any) {
    console.error('[getAllOrders] Error:', error?.message ?? error);
    if (error?.code) console.error('[getAllOrders] Prisma code:', error.code, error.meta);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Get Order Detail
// GET /api/orders/admin/:id
// ─────────────────────────────────────────────────────────────────────────────

export const getAdminOrderDetail = async (req: AuthRequest, res: Response) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId = parseInt(idParam, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await prisma.order.findUnique({
      where: { orderId },
      include: {
        user: {
          select: {
            userId: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            phone: true,
          },
        },
        // OrderItem → variant (ProductVariant, includes images + product)
        items: {
          include: {
            variant: {
              include: {
                images: {
                  select: { imageUrl: true, thumbnailUrl: true },
                  orderBy: { imageId: 'asc' },
                  take: 1,
                },
                product: {
                  select: { productId: true, name: true },
                },
              },
            },
          },
        },
        payments: true,
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const formatted = {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount?.toString() ?? '0',
      discountAmount: order.discountAmount?.toString() ?? '0',
      note: order.note,
      createdAt: order.createdAt?.toISOString(),
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      shippingAddress: {
        recipientName: order.customerName,
        phone: order.customerPhone,
        city: order.shippingCity,
        district: order.shippingDistrict,
        addressDetail: order.shippingAddressDetail,
      },
      user: order.user
        ? {
          userId: order.user.userId,
          email: order.user.email,
          fullName: order.user.fullName,
          avatarUrl: order.user.avatarUrl,
          phone: order.user.phone,
        }
        : null,
      items: order.items.map((item) => {
        const variantImage =
          item.variant?.images?.[0]?.thumbnailUrl ??
          item.variant?.images?.[0]?.imageUrl ??
          null;
        return {
          orderItemId: item.orderItemId,
          productId: item.variant?.product?.productId ?? null,
          productName: item.productName,
          sku: item.sku,
          variantName: item.variantName,
          unitPrice: item.unitPrice?.toString() ?? '0',
          quantity: item.quantity,
          lineTotal: (
            parseFloat(item.unitPrice?.toString() ?? '0') * item.quantity
          ).toString(),
          image: variantImage,
        };
      }),
      payments: order.payments.map((p) => ({
        paymentId: p.paymentId,
        method: p.paymentMethod,
        amount: p.amount?.toString() ?? '0',
        status: p.status,
        paidAt: p.paymentDate?.toISOString(),
      })),
      statusHistory: (() => {
        const history = order.statusHistory.map((h) => ({
          status: h.status,
          oldStatus: (h as any).oldStatus ?? null,
          changedAt: h.changedAt.toISOString(),
          changedBy: (h as any).changedBy ?? null,
          note: (h as any).note ?? null,
        }));
        if (history.length === 0 || !history.some((h) => h.status.toLowerCase() === 'pending')) {
          history.unshift({
            status: 'Pending',
            oldStatus: null,
            changedAt: (order.createdAt || new Date()).toISOString(),
            changedBy: null,
            note: 'Order placed',
          });
        }
        return history.sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
      })(),
    };

    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching admin order detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Update Order Status (Critical — state machine + stock restoration)
// PATCH /api/orders/:id/status
// Body: { status: string, note?: string }
// ─────────────────────────────────────────────────────────────────────────────

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId = parseInt(idParam, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      status,
      note,
      carrier,
      trackingNumber,
      estimatedDeliveryDate,
    } = req.body as {
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

    res.json({
      success: true,
      messageKey: SUCCESS_MESSAGES.ORDER_STATUS_UPDATED,
      ...result,
    });
  } catch (error: any) {
    console.error('[updateOrderStatus] Error:', error);

    // AppError mapping
    if (error.status) {
      res.status(error.status).json({
        errorCode: error.code,
        message: error.message,
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// USER: Get My Orders
// GET /api/orders/my
// ─────────────────────────────────────────────────────────────────────────────

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status, page, pageSize, sort } = req.query;

    const filters = {
      userId,
      status: firstQueryValue(status),
      page: parseInt(firstQueryValue(page) || '1', 10) || 1,
      limit: parseInt(firstQueryValue(pageSize) || '10', 10) || 10,
      sort: firstQueryValue(sort) || 'createdAt_desc',
    };

    const { data: orders, meta } = await findManyOrders(filters);

    const formattedOrders = orders.map((order) => ({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount.toString(),
      createdAt: order.createdAt?.toISOString(),
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      itemCount: order._count.items,
    }));

    res.json({
      data: formattedOrders,
      meta,
    });
  } catch (error: any) {
    console.error('Error fetching my orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// USER: Get My Order Detail
// GET /api/orders/my/:orderId
// ─────────────────────────────────────────────────────────────────────────────

export const getMyOrderDetail = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const orderIdParam = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
    const orderId = parseInt(orderIdParam, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await prisma.order.findFirst({
      where: { orderId, userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                images: {
                  select: { imageUrl: true, thumbnailUrl: true },
                  orderBy: { imageId: 'asc' },
                  take: 1,
                },
              },
            },
            review: {
              select: { reviewId: true },
            },
          },
        },
        payments: true,
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const formattedOrder = {
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount.toString(),
      discountAmount: order.discountAmount?.toString() ?? '0',
      createdAt: order.createdAt?.toISOString(),
      updatedAt: order.updatedAt?.toISOString() ?? order.createdAt?.toISOString(),
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      shippingAddress: {
        recipientName: order.customerName,
        phone: order.customerPhone,
        city: order.shippingCity,
        district: order.shippingDistrict ?? undefined,
        ward: order.shippingWard ?? undefined,
        addressDetail: order.shippingAddressDetail,
      },
      items: order.items.map((item) => {
        const variantImg =
          item.variant?.images?.[0]?.thumbnailUrl ??
          item.variant?.images?.[0]?.imageUrl ??
          null;
        return {
          orderItemId: item.orderItemId,
          productId: item.variant?.productId ?? null,
          variantId: item.variantId ?? null,   // ← needed for Buy Again
          productName: item.productName,
          sku: item.sku,
          variantName: item.variantName,
          unitPrice: item.unitPrice.toString(),
          quantity: item.quantity,
          lineTotal: (parseFloat(item.unitPrice.toString()) * item.quantity).toString(),
          thumbnailUrl: variantImg,
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
      timeline: order.statusHistory.map((h) => ({
        status: h.status,
        at: h.changedAt.toISOString(),
      })),
    };

    res.json(formattedOrder);
  } catch (error: any) {
    console.error('Error fetching order detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// USER: Create Order (Checkout via Stored Procedure + Coupon Integration)
// POST /api/orders
// Body: { ..., couponCode?: string }
// ─────────────────────────────────────────────────────────────────────────────

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      paymentMethod,
      customerName,
      customerPhone,
      shippingCity,
      shippingDistrict,
      shippingWard,
      shippingAddressDetail,
      note,
      items,
      couponCode, // Optional coupon code
    } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ errorCode: ERROR_CODES.CART_EMPTY });
    }

    // --- SYNCHRONIZE CART ---
    let cart = await prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    await prisma.cartItem.deleteMany({ where: { cartId: cart.cartId } });

    for (const item of items) {
      const productId = parseInt(item.id, 10);
      if (isNaN(productId)) continue;

      const variants = await prisma.productVariant.findMany({
        where: { productId },
        include: {
          variantAttributes: {
            include: { value: { include: { attribute: true } } },
          },
        },
      });

      if (variants.length === 0) continue;

      let matchedVariant = null;

      if (item.size || item.color) {
        matchedVariant = variants.find((v) => {
          let sizeMatch = !item.size;
          let colorMatch = !item.color;
          v.variantAttributes.forEach((va) => {
            const attrName = va.value.attribute.name.toLowerCase();
            const attrVal = va.value.value.toLowerCase();
            if (attrName === 'size' && item.size && attrVal === item.size.toLowerCase()) sizeMatch = true;
            if (attrName === 'color' && item.color && attrVal === item.color.toLowerCase()) colorMatch = true;
          });
          return sizeMatch && colorMatch;
        });
      }

      if (!matchedVariant) {
        matchedVariant = variants.find((v) => v.isDefault) || variants[0];
      }

      await prisma.cartItem.create({
        data: {
          cartId: cart.cartId,
          variantId: matchedVariant.variantId,
          quantity: item.quantity > 0 ? item.quantity : 1,
        },
      });
    }
    // --- END CART SYNCHRONIZATION ---

    // Run the stored procedure to create the order
    const result: any[] = await prisma.$queryRaw`
      EXEC sp_Checkout 
        @UserId = ${userId}, 
        @PaymentMethod = ${paymentMethod},
        @CustomerName = ${customerName || 'Khách hàng'},
        @CustomerPhone = ${customerPhone || '0000000000'},
        @ShippingCity = ${shippingCity || 'Hà Nội'},
        @ShippingDistrict = ${shippingDistrict || 'Không xác định'},
        @ShippingWard = ${shippingWard || null},
        @ShippingAddressDetail = ${shippingAddressDetail || 'Không xác định'}
    `;

    if (!result || result.length === 0) {
      throw new Error('Checkout execution returned no result.');
    }

    const row = result[0];
    const orderId = row.OrderId || row.orderId;

    // ── Coupon application (post-SP, in a separate atomic transaction) ────────
    let discountAmount = 0;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      try {
        // Calculate cart subtotal from items (server-side — never trust client)
        const cartSubtotal = items.reduce((sum: number, item: any) => {
          return sum + (Number(item.price) || 0) * (Number(item.quantity) || 1);
        }, 0);

        // Re-validate coupon inside a transaction for atomicity
        await prisma.$transaction(async (tx) => {
          const { validateCoupon } = await import('../services/coupon.service');
          const { coupon, discountAmount: discount } = await validateCoupon(
            couponCode.trim(),
            userId,
            cartSubtotal,
            tx as any,
          );

          discountAmount = discount;

          // 1. Deduct discount from order total
          const currentOrder = await (tx.order as any).findUnique({
            where: { orderId },
            select: { totalAmount: true },
          });
          const newTotal = Math.max(0, Number(currentOrder.totalAmount) - discount);

          await (tx.order as any).update({
            where: { orderId },
            data: {
              totalAmount: newTotal,
              discountAmount: discount,
              couponId: coupon.couponId,
            },
          });

          // 2. Atomically increment coupon usedCount
          await (tx.coupon as any).update({
            where: { couponId: coupon.couponId },
            data: { usedCount: { increment: 1 } },
          });
        });
      } catch (couponErr: any) {
        // Coupon validation failed AFTER order was created — order is still valid
        // but discount is not applied. Log the error and continue without coupon.
        console.warn('[createOrder] Coupon validation failed (order still created):', couponErr.message);
      }
    }

    // ── Emit real-time event to admin dashboard ───────────────────────────
    // Fetch the final order total (may have been adjusted by coupon)
    try {
      const finalOrder = await prisma.order.findUnique({
        where: { orderId },
        select: { totalAmount: true },
      });
      emitNewOrder({
        orderId,
        totalAmount: finalOrder ? Number(finalOrder.totalAmount) : 0,
      });
    } catch {
      // Non-critical — don't fail the checkout if socket emit fails
    }

    return res.json({
      success: true,
      orderId,
      discountAmount,
      message: 'Order created successfully',
    });
  } catch (error: any) {
    console.error('Checkout Error:', error);
    return res.status(500).json({ error: 'Checkout failed', details: error.message });
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// USER: Confirm Receipt (Đã nhận được hàng)
// PATCH /api/orders/:id/confirm-receipt
// Lets the order owner confirm they received the shipment, transitioning Shipping → Delivered
// ───────────────────────────────────────────────────────────────────────────────
export const confirmReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ errorCode: ERROR_CODES.UNAUTHORIZED });
    }

    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId = parseInt(idParam, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ errorCode: ERROR_CODES.INVALID_ORDER_ID });
    }

    // 1. Fetch the order
    const order = await prisma.order.findUnique({
      where: { orderId },
      select: { orderId: true, userId: true, status: true },
    });

    if (!order) {
      return res.status(404).json({ errorCode: ERROR_CODES.ORDER_NOT_FOUND });
    }

    // 2. Ownership check — only the order owner can confirm receipt
    if (order.userId !== userId) {
      return res.status(403).json({ errorCode: ERROR_CODES.NOT_ORDER_OWNER });
    }

    // 3. Status check — must be Shipping to confirm receipt
    if (order.status !== ORDER_STATUS.SHIPPING) {
      return res.status(400).json({
        errorCode: ERROR_CODES.ORDER_NOT_SHIPPING,
        currentStatus: order.status,
      });
    }

    // 4. Transition to Delivered in a transaction and log the event
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { orderId },
        data: { status: ORDER_STATUS.DELIVERED },
      });

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

    return res.json({
      success: true,
      messageKey: SUCCESS_MESSAGES.RECEIPT_CONFIRMED,
      orderId,
      newStatus: ORDER_STATUS.DELIVERED,
    });
  } catch (error: any) {
    console.error('[confirmReceipt] Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};