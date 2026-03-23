import { prisma } from '../utils/prisma';
import { InventoryLogReason } from './inventory.service';

export class ReturnError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, status = 400, message = code) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const norm = (value: string | null | undefined) => (value ?? '').toLowerCase().trim();

export async function requestReturn(
  orderId: number,
  userId: number,
  userRoles: string[],
  reason: string,
  proofImages: string[],
) {
  const isAdmin = userRoles.includes('Admin');

  const order = await (prisma.order.findUnique as any)({
    where: { orderId },
    include: { orderReturn: true },
  });

  if (!order) {
    throw new ReturnError('ORDER_NOT_FOUND', 404);
  }

  if (!isAdmin && order.userId !== userId) {
    throw new ReturnError('FORBIDDEN', 403);
  }

  if (norm(order.status) !== 'delivered') {
    throw new ReturnError('ORDER_NOT_DELIVERED');
  }

  const deliveryDate: Date = order.updatedAt ?? order.createdAt ?? new Date(0);
  if (Date.now() - deliveryDate.getTime() > RETURN_WINDOW_MS) {
    throw new ReturnError('RETURN_WINDOW_EXPIRED');
  }

  if (order.orderReturn) {
    throw new ReturnError('RETURN_ALREADY_EXISTS');
  }

  return prisma.$transaction(async (tx) => {
    const orderReturn = await (tx.orderReturn.create as any)({
      data: {
        orderId,
        userId,
        reason,
        proofImages: JSON.stringify(proofImages),
        status: 'PENDING_APPROVAL',
      },
    });

    await (tx.order.update as any)({
      where: { orderId },
      data: { status: 'Return_Requested' },
    });

    await (tx.orderStatusHistory.create as any)({
      data: {
        orderId,
        oldStatus: order.status,
        status: 'Return_Requested',
        changedBy: userId,
        note: 'Customer submitted a return request.',
      },
    });

    return orderReturn;
  });
}

export async function processReturn(
  returnId: number,
  adminUserId: number,
  action: 'APPROVE' | 'REJECT' | 'COMPLETE_REFUND',
  note?: string,
) {
  const returnReq = await (prisma.orderReturn.findUnique as any)({
    where: { returnId },
    include: {
      order: {
        include: {
          items: {
            include: { variant: true },
          },
        },
      },
    },
  });

  if (!returnReq) {
    throw new ReturnError('RETURN_NOT_FOUND', 404);
  }

  if (action === 'APPROVE') {
    await (prisma.orderReturn.update as any)({
      where: { returnId },
      data: {
        status: 'APPROVED',
        adminNote: note ?? null,
      },
    });

    return { success: true, code: 'RETURN_APPROVED' };
  }

  if (action === 'REJECT') {
    await prisma.$transaction(async (tx) => {
      await (tx.orderReturn.update as any)({
        where: { returnId },
        data: { status: 'REJECTED', adminNote: note ?? null },
      });

      await (tx.order.update as any)({
        where: { orderId: returnReq.orderId },
        data: { status: 'Delivered' },
      });

      await (tx.orderStatusHistory.create as any)({
        data: {
          orderId: returnReq.orderId,
          oldStatus: 'Return_Requested',
          status: 'Delivered',
          changedBy: adminUserId,
          note: note ? `Return rejected: ${note}` : 'Return request rejected.',
        },
      });
    });

    return { success: true, code: 'RETURN_REJECTED' };
  }

  if (action === 'COMPLETE_REFUND') {
    await prisma.$transaction(async (tx) => {
      await (tx.orderReturn.update as any)({
        where: { returnId },
        data: {
          status: 'COMPLETED',
          adminNote: note ?? null,
        },
      });

      await (tx.order.update as any)({
        where: { orderId: returnReq.orderId },
        data: { status: 'Returned' },
      });

      await (tx.orderStatusHistory.create as any)({
        data: {
          orderId: returnReq.orderId,
          oldStatus: returnReq.order.status,
          status: 'Returned',
          changedBy: adminUserId,
          note: note ? `Refunded: ${note}` : 'Refund confirmed and stock restored.',
        },
      });

      for (const item of returnReq.order.items) {
        if (!item.variantId) continue;

        const current = await (tx.productVariant.findUnique as any)({
          where: { variantId: item.variantId },
          select: { stockQuantity: true },
        });

        if (!current) continue;

        const previousStock: number = current.stockQuantity;

        await (tx.productVariant.update as any)({
          where: { variantId: item.variantId },
          data: { stockQuantity: { increment: item.quantity } },
        });

        const newStock = previousStock + item.quantity;

        await (tx.inventoryLog.create as any)({
          data: {
            variantId: item.variantId,
            orderId: returnReq.orderId,
            userId: adminUserId,
            changeQuantity: +item.quantity,
            previousStock,
            newStock,
            reason: 'RETURN_RESTORE' satisfies InventoryLogReason,
            note: `Returned order #${returnReq.orderId}`,
          },
        });
      }
    });

    return { success: true, code: 'REFUND_COMPLETED' };
  }

  throw new ReturnError('INVALID_ACTION');
}

export async function listReturns(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, params?.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (params?.status && params.status !== 'ALL') {
    where.status = params.status;
  }

  const [returns, total] = await Promise.all([
    (prisma.orderReturn.findMany as any)({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        order: {
          select: {
            orderNumber: true,
            totalAmount: true,
            customerName: true,
            customerPhone: true,
          },
        },
        user: {
          select: {
            userId: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    }),
    (prisma.orderReturn.count as any)({ where }),
  ]);

  return {
    returns: returns.map((item: any) => ({
      ...item,
      proofImages: (() => {
        try {
          return JSON.parse(item.proofImages);
        } catch {
          return [];
        }
      })(),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getReturnForOrder(orderId: number) {
  const ret = await (prisma.orderReturn.findUnique as any)({
    where: { orderId },
  });

  if (!ret) return null;

  return {
    ...ret,
    proofImages: (() => {
      try {
        return JSON.parse(ret.proofImages);
      } catch {
        return [];
      }
    })(),
  };
}
