import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  ORDER_STATUS,
  STATUS_LABELS,
  isValidTransition,
  INVENTORY_RESTORE_STATUSES,
  getValidNextStatuses,
} from '../config/orderStatus.config';

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
      page = '1',
      pageSize = '15',
      search,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(firstQueryValue(page) || '1', 10) || 1;
    const size = Math.min(parseInt(firstQueryValue(pageSize) || '15', 10) || 15, 100);
    const skip = (pageNum - 1) * size;

    const where: any = {};

    const statusStr = firstQueryValue(status);
    if (statusStr && statusStr !== 'ALL') {
      where.status = statusStr;
    }

    const searchStr = firstQueryValue(search);
    if (searchStr) {
      where.OR = [
        { customerName: { contains: searchStr } },
        { customerPhone: { contains: searchStr } },
        { orderNumber: { contains: searchStr } },
      ];
    }

    const startDateStr = firstQueryValue(startDate);
    const endDateStr = firstQueryValue(endDate);
    if (startDateStr || endDateStr) {
      where.createdAt = {};
      if (startDateStr) where.createdAt.gte = new Date(startDateStr);
      if (endDateStr) {
        const end = new Date(endDateStr);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
          _count: {
            select: { items: true },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    const formatted = orders.map((order) => ({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      status: order.status,
      statusLabel: STATUS_LABELS[order.status ?? ''] ?? order.status,
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
      orders: formatted,
      pagination: {
        page: pageNum,
        pageSize: size,
        total,
        totalPages: Math.ceil(total / size),
      },
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
                  where: { isPrimary: true },
                  select: { imageUrl: true, thumbnailUrl: true },
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
      statusLabel: STATUS_LABELS[order.status ?? ''] ?? order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount?.toString() ?? '0',
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
      statusHistory: order.statusHistory.map((h) => ({
        status: h.status,
        oldStatus: (h as any).oldStatus ?? null,
        statusLabel: STATUS_LABELS[h.status] ?? h.status,
        changedAt: h.changedAt.toISOString(),
        changedBy: (h as any).changedBy ?? null,
        note: (h as any).note ?? null,
      })),
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

    const { status: newStatus, note } = req.body as { status: string; note?: string };
    if (!newStatus) {
      return res.status(400).json({ error: 'status là bắt buộc.' });
    }

    const changedBy = req.user?.userId ?? null;

    // 1. Fetch current order with items for stock restoration
    const order = await prisma.order.findUnique({
      where: { orderId },
      include: {
        items: {
          select: { orderItemId: true, variantId: true, quantity: true },
        },
      },
    });
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
    }

    const currentStatus = order.status ?? ORDER_STATUS.PENDING;

    // 2. FSM validation — throw 400 on invalid transition
    if (!isValidTransition(currentStatus, newStatus)) {
      return res.status(400).json({
        error: 'Chuyển đổi trạng thái không hợp lệ.',
        message: `Không thể chuyển từ "${STATUS_LABELS[currentStatus] ?? currentStatus}" sang "${STATUS_LABELS[newStatus] ?? newStatus}".`,
        currentStatus,
        requestedStatus: newStatus,
        allowedTransitions: getValidNextStatuses(currentStatus),
      });
    }

    // 3. Determine if inventory should be restored
    const shouldRestoreInventory = INVENTORY_RESTORE_STATUSES.includes(newStatus as any);

    // 4. Execute in a single Prisma transaction
    await prisma.$transaction(async (tx) => {
      // Optionally restore stock
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

      // Update Order.status (and optionally Order.note for cancellation reason)
      await tx.order.update({
        where: { orderId },
        data: {
          status: newStatus,
          ...(note !== undefined ? { note } : {}),
        },
      });

      // Insert audit record with full context
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          oldStatus: currentStatus,
          status: newStatus,
          changedBy,
          note: note ?? null,
        },
      });
    });

    res.json({
      success: true,
      orderId,
      previousStatus: currentStatus,
      newStatus,
      statusLabel: STATUS_LABELS[newStatus] ?? newStatus,
      stockRestored: shouldRestoreInventory,
      message: `Cập nhật trạng thái thành công: ${STATUS_LABELS[newStatus] ?? newStatus}`,
    });
  } catch (error: any) {
    console.error('[updateOrderStatus] Error:', error);
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

    const { status, page = '1', pageSize = '10', sort = 'createdAt_desc' } = req.query;

    const pageNum = parseInt(firstQueryValue(page) || '1', 10) || 1;
    const size = Math.min(parseInt(firstQueryValue(pageSize) || '10', 10) || 10, 50);
    const skip = (pageNum - 1) * size;

    const where: any = { userId };
    const statusStr = firstQueryValue(status);
    if (statusStr) {
      where.status = statusStr;
    }

    const sortStr = firstQueryValue(sort) || 'createdAt_desc';
    const orderBy: any = {};
    const [sortField, sortDir] = sortStr.split('_');
    orderBy[sortField || 'createdAt'] = sortDir === 'asc' ? 'asc' : 'desc';

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy,
        skip,
        take: size,
        select: {
          orderId: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          createdAt: true,
          trackingNumber: true,
          carrier: true,
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

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
      orders: formattedOrders,
      pagination: {
        page: pageNum,
        pageSize: size,
        total,
        totalPages: Math.ceil(total / size),
      },
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
        items: true,
        payments: true,
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
      items: order.items.map((item) => ({
        orderItemId: item.orderItemId,
        productName: item.productName,
        sku: item.sku,
        variantName: item.variantName,
        unitPrice: item.unitPrice.toString(),
        quantity: item.quantity,
        lineTotal: (parseFloat(item.unitPrice.toString()) * item.quantity).toString(),
      })),
    };

    res.json(formattedOrder);
  } catch (error: any) {
    console.error('Error fetching order detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// USER: Create Order (Checkout via Stored Procedure)
// POST /api/orders
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
      items
    } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty. Vui lòng thêm sản phẩm vào giỏ hàng.' });
    }

    // --- SYNCHRONIZE CART ---
    // 1. Find or create Cart for the user
    let cart = await prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    // 2. Clear old items in the cart
    await prisma.cartItem.deleteMany({ where: { cartId: cart.cartId } });

    // 3. Resolve incoming items and insert into CartItems
    for (const item of items) {
      const productId = parseInt(item.id, 10);
      if (isNaN(productId)) continue;

      // Find all variants for this product to match attributes
      const variants = await prisma.productVariant.findMany({
        where: { productId },
        include: {
          variantAttributes: {
            include: {
              value: { include: { attribute: true } }
            }
          }
        }
      });

      if (variants.length === 0) continue;

      let matchedVariant = null;

      // Try fully matching the color and size strings
      if (item.size || item.color) {
        matchedVariant = variants.find(v => {
          let sizeMatch = !item.size;
          let colorMatch = !item.color;
          v.variantAttributes.forEach(va => {
            const attrName = va.value.attribute.name.toLowerCase();
            const attrVal = va.value.value.toLowerCase();
            if (attrName === 'size' && item.size && attrVal === item.size.toLowerCase()) sizeMatch = true;
            if (attrName === 'color' && item.color && attrVal === item.color.toLowerCase()) colorMatch = true;
          });
          return sizeMatch && colorMatch;
        });
      }

      // Fallback: take the default variant or first variant
      if (!matchedVariant) {
        matchedVariant = variants.find(v => v.isDefault) || variants[0];
      }

      await prisma.cartItem.create({
        data: {
          cartId: cart.cartId,
          variantId: matchedVariant.variantId,
          quantity: item.quantity > 0 ? item.quantity : 1,
        }
      });
    }
    // --- END CART SYNCHRONIZATION ---

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

    res.json({ success: true, orderId, message: 'Order created successfully' });
  } catch (error: any) {
    console.error('Checkout Error:', error);
    res.status(500).json({ error: 'Checkout failed', details: error.message });
  }
};