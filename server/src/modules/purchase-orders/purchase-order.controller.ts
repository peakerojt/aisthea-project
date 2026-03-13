import { Request, Response } from 'express';
import { Prisma } from '../../generated/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

const PURCHASE_ORDER_STATUSES = {
  PENDING: 'PENDING',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;

type PurchaseOrderStatus =
  (typeof PURCHASE_ORDER_STATUSES)[keyof typeof PURCHASE_ORDER_STATUSES];

interface PurchaseOrderCreateItemInput {
  variantId: number;
  orderedQty: number;
  unitCost: number;
}

interface PurchaseOrderReceiptInput {
  purchaseOrderItemId?: number;
  variantId?: number;
  quantity: number;
}

interface PurchaseOrderMappedItem {
  purchaseOrderItemId: number;
  variantId: number;
  sku: string | null;
  productId: number | null;
  productName: string | null;
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
  unitCost: number;
  lineTotal: number;
  currentStockQuantity: number | null;
}

function parsePositiveInt(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function buildPurchaseOrderNumber() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const suffix = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `PO-${stamp}-${suffix}`;
}

function normalizePurchaseOrderStatus(status: unknown): PurchaseOrderStatus | null {
  if (typeof status !== 'string') return null;
  const normalized = status.trim().toUpperCase();
  if (Object.values(PURCHASE_ORDER_STATUSES).includes(normalized as PurchaseOrderStatus)) {
    return normalized as PurchaseOrderStatus;
  }
  return null;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toNumber' in value && typeof (value as any).toNumber === 'function') {
    return (value as any).toNumber();
  }
  return Number(value ?? 0);
}

function mapPurchaseOrder(order: any) {
  const items = (order.items ?? []).map((item: any) => {
    const unitCost = toNumber(item.unitCost);
    const orderedQty = item.orderedQty ?? 0;
    const receivedQty = item.receivedQty ?? 0;

    return {
      purchaseOrderItemId: item.purchaseOrderItemId,
      variantId: item.variantId,
      sku: item.variant?.sku ?? null,
      productId: item.variant?.productId ?? null,
      productName: item.variant?.product?.name ?? null,
      orderedQty,
      receivedQty,
      remainingQty: Math.max(orderedQty - receivedQty, 0),
      unitCost,
      lineTotal: unitCost * orderedQty,
      currentStockQuantity: item.variant?.stockQuantity ?? null,
    };
  });

  const totals = items.reduce(
    (acc: { orderedQty: number; receivedQty: number; totalCost: number }, item: PurchaseOrderMappedItem) => {
      acc.orderedQty += item.orderedQty;
      acc.receivedQty += item.receivedQty;
      acc.totalCost += item.lineTotal;
      return acc;
    },
    { orderedQty: 0, receivedQty: 0, totalCost: 0 },
  );

  return {
    purchaseOrderId: order.purchaseOrderId,
    purchaseOrderNumber: order.purchaseOrderNumber,
    supplier: order.supplier,
    status: order.status,
    notes: order.notes ?? null,
    orderedAt: order.orderedAt,
    receivedAt: order.receivedAt ?? null,
    updatedAt: order.updatedAt,
    createdBy: order.createdBy ?? null,
    totals,
    items,
  };
}

async function getPurchaseOrderByIdInternal(purchaseOrderId: number) {
  return prisma.purchaseOrder.findUnique({
    where: { purchaseOrderId },
    include: {
      items: {
        orderBy: { purchaseOrderItemId: 'asc' },
        include: {
          variant: {
            select: {
              variantId: true,
              productId: true,
              sku: true,
              stockQuantity: true,
              product: {
                select: {
                  productId: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function listPurchaseOrders(req: Request, res: Response) {
  try {
    const page = Math.max(parsePositiveInt(String(req.query.page ?? '1')) ?? 1, 1);
    const pageSize = Math.min(Math.max(parsePositiveInt(String(req.query.pageSize ?? '20')) ?? 20, 1), 100);
    const status = normalizePurchaseOrderStatus(req.query.status);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where: Prisma.PurchaseOrderWhereInput = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { purchaseOrderNumber: { contains: search } },
        { supplier: { contains: search } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        orderBy: [{ orderedAt: 'desc' }, { purchaseOrderId: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: {
            orderBy: { purchaseOrderItemId: 'asc' },
            include: {
              variant: {
                select: {
                  variantId: true,
                  productId: true,
                  sku: true,
                  stockQuantity: true,
                  product: {
                    select: {
                      productId: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({
      success: true,
      data: rows.map(mapPurchaseOrder),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    logger.error('[purchaseOrderController] listPurchaseOrders failed', { error });
    res.status(500).json({ success: false, message: 'Failed to list purchase orders.' });
  }
}

export async function getPurchaseOrderById(req: Request, res: Response) {
  try {
    const purchaseOrderId = parsePositiveInt(req.params.id);
    if (!purchaseOrderId) {
      return res.status(400).json({ success: false, message: 'Invalid purchase order ID.' });
    }

    const purchaseOrder = await getPurchaseOrderByIdInternal(purchaseOrderId);
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    return res.json({ success: true, data: mapPurchaseOrder(purchaseOrder) });
  } catch (error) {
    logger.error('[purchaseOrderController] getPurchaseOrderById failed', { error });
    return res.status(500).json({ success: false, message: 'Failed to load purchase order.' });
  }
}

export async function createPurchaseOrder(req: Request, res: Response) {
  try {
    const { supplier, notes, items } = req.body as {
      supplier?: string;
      notes?: string | null;
      items?: PurchaseOrderCreateItemInput[];
    };

    if (!supplier || typeof supplier !== 'string' || supplier.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier is required.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one purchase order item is required.' });
    }

    const seenVariantIds = new Set<number>();
    for (const item of items) {
      if (!Number.isInteger(item.variantId) || item.variantId <= 0) {
        return res.status(400).json({ success: false, message: 'Each item must include a valid variantId.' });
      }
      if (!Number.isInteger(item.orderedQty) || item.orderedQty <= 0) {
        return res.status(400).json({ success: false, message: 'Each item must include orderedQty > 0.' });
      }
      if (typeof item.unitCost !== 'number' || Number.isNaN(item.unitCost) || item.unitCost < 0) {
        return res.status(400).json({ success: false, message: 'Each item must include unitCost >= 0.' });
      }
      if (seenVariantIds.has(item.variantId)) {
        return res.status(400).json({ success: false, message: `Duplicate variantId detected: ${item.variantId}.` });
      }
      seenVariantIds.add(item.variantId);
    }

    const variantIds = items.map((item) => item.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { variantId: { in: variantIds } },
      select: { variantId: true },
    });
    if (variants.length !== variantIds.length) {
      return res.status(400).json({ success: false, message: 'One or more variants do not exist.' });
    }

    const createdBy = (req as any).user?.userId ?? null;
    const purchaseOrderNumber = buildPurchaseOrderNumber();

    const created = await prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          purchaseOrderNumber,
          supplier: supplier.trim(),
          status: PURCHASE_ORDER_STATUSES.PENDING,
          notes: typeof notes === 'string' ? notes.trim() || null : null,
          createdBy,
          items: {
            create: items.map((item) => ({
              variantId: item.variantId,
              orderedQty: item.orderedQty,
              receivedQty: 0,
              unitCost: item.unitCost,
            })),
          },
        },
        select: { purchaseOrderId: true },
      });

      return tx.purchaseOrder.findUniqueOrThrow({
        where: { purchaseOrderId: purchaseOrder.purchaseOrderId },
        include: {
          items: {
            orderBy: { purchaseOrderItemId: 'asc' },
            include: {
              variant: {
                select: {
                  variantId: true,
                  productId: true,
                  sku: true,
                  stockQuantity: true,
                  product: {
                    select: {
                      productId: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    return res.status(201).json({ success: true, data: mapPurchaseOrder(created) });
  } catch (error) {
    logger.error('[purchaseOrderController] createPurchaseOrder failed', { error });
    return res.status(500).json({ success: false, message: 'Failed to create purchase order.' });
  }
}

export async function receivePurchaseOrder(req: Request, res: Response) {
  try {
    const purchaseOrderId = parsePositiveInt(req.params.id);
    if (!purchaseOrderId) {
      return res.status(400).json({ success: false, message: 'Invalid purchase order ID.' });
    }

    const { items, notes } = req.body as {
      items?: PurchaseOrderReceiptInput[];
      notes?: string | null;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one receipt item is required.' });
    }

    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({ success: false, message: 'Each receipt item must include quantity > 0.' });
      }
      if (
        (!Number.isInteger(item.purchaseOrderItemId) || (item.purchaseOrderItemId ?? 0) <= 0) &&
        (!Number.isInteger(item.variantId) || (item.variantId ?? 0) <= 0)
      ) {
        return res.status(400).json({ success: false, message: 'Each receipt item must include purchaseOrderItemId or variantId.' });
      }
    }

    const updatedBy = (req as any).user?.userId ?? null;

    const updated = await prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.purchaseOrder.findUnique({
        where: { purchaseOrderId },
        include: {
          items: {
            orderBy: { purchaseOrderItemId: 'asc' },
            include: {
              variant: {
                select: {
                  variantId: true,
                  productId: true,
                  sku: true,
                  stockQuantity: true,
                  product: {
                    select: {
                      productId: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!purchaseOrder) {
        throw new Error('PURCHASE_ORDER_NOT_FOUND');
      }
      if (purchaseOrder.status === PURCHASE_ORDER_STATUSES.CANCELLED) {
        throw new Error('PURCHASE_ORDER_CANCELLED');
      }
      if (purchaseOrder.status === PURCHASE_ORDER_STATUSES.RECEIVED) {
        throw new Error('PURCHASE_ORDER_ALREADY_RECEIVED');
      }

      const itemById = new Map(
        purchaseOrder.items.map((item) => [item.purchaseOrderItemId, item] as const),
      );
      const itemByVariantId = new Map(
        purchaseOrder.items.map((item) => [item.variantId, item] as const),
      );
      const touchedIds = new Set<number>();

      for (const receipt of items) {
        const purchaseOrderItem =
          (receipt.purchaseOrderItemId ? itemById.get(receipt.purchaseOrderItemId) : null) ??
          (receipt.variantId ? itemByVariantId.get(receipt.variantId) : null);

        if (!purchaseOrderItem) {
          throw new Error('PURCHASE_ORDER_ITEM_NOT_FOUND');
        }
        if (touchedIds.has(purchaseOrderItem.purchaseOrderItemId)) {
          throw new Error('DUPLICATE_RECEIPT_ITEM');
        }

        const remainingQty = purchaseOrderItem.orderedQty - purchaseOrderItem.receivedQty;
        if (receipt.quantity > remainingQty) {
          throw new Error('RECEIPT_EXCEEDS_ORDERED_QTY');
        }

        const currentVariant = await tx.productVariant.findUnique({
          where: { variantId: purchaseOrderItem.variantId },
          select: { stockQuantity: true },
        });
        if (!currentVariant) {
          throw new Error('VARIANT_NOT_FOUND');
        }

        await tx.purchaseOrderItem.update({
          where: { purchaseOrderItemId: purchaseOrderItem.purchaseOrderItemId },
          data: { receivedQty: { increment: receipt.quantity } },
        });

        await tx.productVariant.update({
          where: { variantId: purchaseOrderItem.variantId },
          data: { stockQuantity: { increment: receipt.quantity } },
        });

        await tx.inventoryLog.create({
          data: {
            variantId: purchaseOrderItem.variantId,
            orderId: null,
            userId: updatedBy,
            changeQuantity: receipt.quantity,
            previousStock: currentVariant.stockQuantity,
            newStock: currentVariant.stockQuantity + receipt.quantity,
            reason: 'PURCHASE_RECEIPT',
            note: `Received purchase order ${purchaseOrder.purchaseOrderNumber}`,
          },
        });

        touchedIds.add(purchaseOrderItem.purchaseOrderItemId);
      }

      const refreshedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId },
        select: {
          orderedQty: true,
          receivedQty: true,
        },
      });

      const isFullyReceived = refreshedItems.every((item) => item.receivedQty >= item.orderedQty);
      const hasAnyReceipt = refreshedItems.some((item) => item.receivedQty > 0);

      await tx.purchaseOrder.update({
        where: { purchaseOrderId },
        data: {
          status: isFullyReceived
            ? PURCHASE_ORDER_STATUSES.RECEIVED
            : hasAnyReceipt
              ? PURCHASE_ORDER_STATUSES.PARTIALLY_RECEIVED
              : PURCHASE_ORDER_STATUSES.PENDING,
          receivedAt: isFullyReceived ? new Date() : null,
          notes: typeof notes === 'string' ? notes.trim() || null : undefined,
        },
      });

      return tx.purchaseOrder.findUniqueOrThrow({
        where: { purchaseOrderId },
        include: {
          items: {
            orderBy: { purchaseOrderItemId: 'asc' },
            include: {
              variant: {
                select: {
                  variantId: true,
                  productId: true,
                  sku: true,
                  stockQuantity: true,
                  product: {
                    select: {
                      productId: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    return res.json({ success: true, data: mapPurchaseOrder(updated) });
  } catch (error) {
    logger.error('[purchaseOrderController] receivePurchaseOrder failed', { error });
    const code = error instanceof Error ? error.message : '';

    if (code === 'PURCHASE_ORDER_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }
    if (code === 'PURCHASE_ORDER_CANCELLED') {
      return res.status(400).json({ success: false, message: 'Cancelled purchase orders cannot be received.' });
    }
    if (code === 'PURCHASE_ORDER_ALREADY_RECEIVED') {
      return res.status(400).json({ success: false, message: 'Purchase order is already fully received.' });
    }
    if (code === 'PURCHASE_ORDER_ITEM_NOT_FOUND') {
      return res.status(400).json({ success: false, message: 'One or more receipt items do not belong to this purchase order.' });
    }
    if (code === 'DUPLICATE_RECEIPT_ITEM') {
      return res.status(400).json({ success: false, message: 'Duplicate receipt items are not allowed.' });
    }
    if (code === 'RECEIPT_EXCEEDS_ORDERED_QTY') {
      return res.status(400).json({ success: false, message: 'Received quantity exceeds the remaining ordered quantity.' });
    }
    if (code === 'VARIANT_NOT_FOUND') {
      return res.status(400).json({ success: false, message: 'One or more variants no longer exist.' });
    }

    return res.status(500).json({ success: false, message: 'Failed to receive purchase order.' });
  }
}

export async function cancelPurchaseOrder(req: Request, res: Response) {
  try {
    const purchaseOrderId = parsePositiveInt(req.params.id);
    if (!purchaseOrderId) {
      return res.status(400).json({ success: false, message: 'Invalid purchase order ID.' });
    }

    const { notes } = req.body as { notes?: string | null };
    const existing = await prisma.purchaseOrder.findUnique({
      where: { purchaseOrderId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }
    if (existing.status === PURCHASE_ORDER_STATUSES.CANCELLED) {
      return res.status(400).json({ success: false, message: 'Purchase order is already cancelled.' });
    }
    if (existing.status === PURCHASE_ORDER_STATUSES.RECEIVED) {
      return res.status(400).json({ success: false, message: 'Received purchase orders cannot be cancelled.' });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { purchaseOrderId },
      data: {
        status: PURCHASE_ORDER_STATUSES.CANCELLED,
        notes: typeof notes === 'string' ? notes.trim() || null : undefined,
      },
    });

    const purchaseOrder = await getPurchaseOrderByIdInternal(updated.purchaseOrderId);
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    return res.json({ success: true, data: mapPurchaseOrder(purchaseOrder) });
  } catch (error) {
    logger.error('[purchaseOrderController] cancelPurchaseOrder failed', { error });
    return res.status(500).json({ success: false, message: 'Failed to cancel purchase order.' });
  }
}
