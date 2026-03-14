import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { applyManualStockAdjustment } from '../services/inventory.service';

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'FREESIZE', 'FREE SIZE', 'ONE SIZE'];

function getSizeIndex(value: string): number {
  const idx = SIZE_ORDER.indexOf(value.toUpperCase().trim());
  return idx === -1 ? 999 : idx;
}

function isSize(value: string): boolean {
  return getSizeIndex(value) < 999;
}

const toSnapshotStock = (variant: any): number => {
  const snapshot = variant.inventorySnapshot?.availableQuantity;
  if (typeof snapshot === 'number') return snapshot;
  return Number(variant.stockQuantity ?? 0);
};

export const getInventory = async (req: Request, res: Response) => {
  try {
    const { lowStock, search, page: pageQ, pageSize: pageSizeQ } = req.query as Record<string, string | undefined>;

    const page = Math.max(1, parseInt(pageQ ?? '1', 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(pageSizeQ ?? '50', 10) || 50));
    const skip = (page - 1) * pageSize;

    const where: Record<string, any> = {
      isDeleted: false,
      product: { isDeleted: false },
    };

    if (lowStock === 'true') {
      where.stockQuantity = { lt: 10 };
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { sku: { contains: q } },
        { product: { name: { contains: q } } },
      ];
    }

    const [variants, total] = await Promise.all([
      (prisma.productVariant.findMany as any)({
        where,
        include: {
          product: {
            select: {
              productId: true,
              name: true,
              images: {
                where: { isPrimary: true },
                select: { thumbnailUrl: true, imageUrl: true },
                take: 1,
              },
            },
          },
          inventorySnapshot: {
            select: { availableQuantity: true },
          },
          variantAttributes: {
            include: {
              value: {
                include: {
                  attribute: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ product: { name: 'asc' } }],
        skip,
        take: pageSize,
      }),
      (prisma.productVariant.count as any)({ where }),
    ]);

    const shaped = variants.map((v: any) => {
      const attrs: { val: string; isSize: boolean }[] = (v.variantAttributes ?? [])
        .map((va: any) => ({
          val: (va.value?.value ?? '') as string,
          isSize: isSize(va.value?.value ?? ''),
        }))
        .filter((a: { val: string }) => a.val !== '');

      attrs.sort((a, b) => {
        if (a.isSize === b.isSize) return 0;
        return a.isSize ? 1 : -1;
      });

      const variantLabel = attrs.map((a) => a.val).join('/');
      const colorVal = attrs.find((a) => !a.isSize)?.val ?? '';
      const sizeVal = attrs.find((a) => a.isSize)?.val ?? '';

      const img = v.product?.images?.[0];
      const primaryImageUrl = img?.thumbnailUrl ?? img?.imageUrl ?? null;

      return {
        variantId: v.variantId,
        productId: v.productId,
        sku: v.sku,
        price: Number(v.price),
        stockQuantity: toSnapshotStock(v),
        variantLabel,
        _color: colorVal,
        _sizeIdx: getSizeIndex(sizeVal),
        product: {
          name: v.product?.name ?? 'Unknown',
          primaryImageUrl,
        },
      };
    });

    shaped.sort((a: any, b: any) => {
      const byName = a.product.name.localeCompare(b.product.name, 'vi');
      if (byName !== 0) return byName;

      const byColor = a._color.localeCompare(b._color, 'vi');
      if (byColor !== 0) return byColor;

      return a._sizeIdx - b._sizeIdx;
    });

    const result = shaped
      .filter((row: any) => (lowStock === 'true' ? row.stockQuantity < 10 : true))
      .map(({ _color, _sizeIdx, ...rest }: any) => rest);

    res.json({
      data: result,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: unknown) {
    logger.error('[inventoryController] getInventory failed', { error });
    const e = error as { message?: string };
    res.status(500).json({ error: 'Lỗi máy chủ', details: e.message });
  }
};

export const bulkUpdateStock = async (req: Request, res: Response) => {
  try {
    const changes: { variantId: number; quantity: number; reason?: string }[] = req.body;

    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ error: 'Danh sách cập nhật không được để trống.' });
    }

    for (const change of changes) {
      if (typeof change.variantId !== 'number' || typeof change.quantity !== 'number') {
        return res.status(400).json({ error: 'Dữ liệu không hợp lệ: variantId và quantity phải là số.' });
      }
      if (change.quantity < 0) {
        return res.status(400).json({
          error: `Số lượng không được âm (variantId: ${change.variantId}).`,
        });
      }
    }

    const userId: number | null = (req as any).user?.userId ?? null;

    await prisma.$transaction(async (tx: any) => {
      for (const c of changes) {
        await applyManualStockAdjustment(tx, {
          variantId: c.variantId,
          newQuantity: c.quantity,
          userId,
          reason: c.reason,
          note: c.reason ?? null,
        });
      }
    });

    res.json({
      success: true,
      message: `Đã cập nhật ${changes.length} biến thể thành công.`,
      updatedCount: changes.length,
    });
  } catch (error: unknown) {
    logger.error('[inventoryController] bulkUpdateStock failed', { error });
    const e = error as { code?: string; message?: string };

    if (e.code === 'P2025') {
      return res.status(404).json({ error: 'Không tìm thấy một hoặc nhiều biến thể.' });
    }

    if (e.code === 'VARIANT_NOT_FOUND') {
      return res.status(404).json({ error: 'Không tìm thấy biến thể cần cập nhật.' });
    }

    res.status(500).json({ error: 'Lỗi máy chủ', details: e.message });
  }
};

export const getLowStockAlerts = async (_req: Request, res: Response) => {
  try {
    const variants = await (prisma.productVariant.findMany as any)({
      where: {
        isDeleted: false,
        product: { isDeleted: false },
      },
      include: {
        product: {
          select: {
            productId: true,
            name: true,
            images: {
              where: { isPrimary: true },
              select: { thumbnailUrl: true, imageUrl: true },
              take: 1,
            },
          },
        },
        inventorySnapshot: {
          select: { availableQuantity: true },
        },
        variantAttributes: {
          include: {
            value: {
              include: {
                attribute: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ stockQuantity: 'asc' }],
      take: 200,
    });

    const mapped = variants.map((v: any) => {
      const attrs: { val: string; isSize: boolean }[] = (v.variantAttributes ?? [])
        .map((va: any) => ({
          val: (va.value?.value ?? '') as string,
          isSize: isSize(va.value?.value ?? ''),
        }))
        .filter((a: { val: string }) => a.val !== '');

      attrs.sort((a, b) => {
        if (a.isSize === b.isSize) return 0;
        return a.isSize ? 1 : -1;
      });

      const variantLabel = attrs.map((a) => a.val).join('/');
      const img = v.product?.images?.[0];
      const primaryImageUrl = img?.thumbnailUrl ?? img?.imageUrl ?? null;

      return {
        variantId: v.variantId,
        productId: v.productId,
        sku: v.sku,
        stockQuantity: toSnapshotStock(v),
        variantLabel,
        product: {
          name: v.product?.name ?? 'Unknown',
          primaryImageUrl,
        },
      };
    });

    const allLowStock = mapped
      .filter((item: any) => item.stockQuantity <= 10)
      .sort((a: any, b: any) => a.stockQuantity - b.stockQuantity);
    const lowStockItems = allLowStock.slice(0, 20);

    res.json({
      totalLowStock: allLowStock.length,
      items: lowStockItems,
    });
  } catch (error: unknown) {
    logger.error('[inventoryController] getLowStockAlerts failed', { error });
    const e = error as { message?: string };
    res.status(500).json({ error: 'Lỗi máy chủ', details: e.message });
  }
};

export const getInventorySummary = async (_req: Request, res: Response) => {
  try {
    const snapshotRows = await ((prisma as any).inventory.findMany as any)({
      where: {
        variant: {
          isDeleted: false,
          product: { isDeleted: false },
        },
      },
      select: {
        availableQuantity: true,
        incomingQuantity: true,
      },
    });

    if (Array.isArray(snapshotRows) && snapshotRows.length > 0) {
      const summary = snapshotRows.reduce(
        (acc: any, row: any) => {
          const available = Number(row.availableQuantity ?? 0);
          const incoming = Number(row.incomingQuantity ?? 0);

          acc.totalVariants += 1;
          acc.incomingStock += incoming;
          if (available <= 0) acc.outOfStock += 1;
          else if (available < 10) acc.lowStock += 1;
          return acc;
        },
        { totalVariants: 0, outOfStock: 0, lowStock: 0, incomingStock: 0 },
      );

      return res.json({ data: summary });
    }

    const variants = await (prisma.productVariant.findMany as any)({
      where: {
        isDeleted: false,
        product: { isDeleted: false },
      },
      select: { stockQuantity: true },
    });

    const fallback = variants.reduce(
      (acc: any, row: any) => {
        const available = Number(row.stockQuantity ?? 0);
        acc.totalVariants += 1;
        if (available <= 0) acc.outOfStock += 1;
        else if (available < 10) acc.lowStock += 1;
        return acc;
      },
      { totalVariants: 0, outOfStock: 0, lowStock: 0, incomingStock: 0 },
    );

    return res.json({ data: fallback });
  } catch (error: unknown) {
    logger.error('[inventoryController] getInventorySummary failed', { error });
    const e = error as { message?: string };
    return res.status(500).json({ error: 'Lỗi máy chủ', details: e.message });
  }
};

export const getStockMovements = async (req: Request, res: Response) => {
  try {
    const variantId = parseInt(String(req.params['variantId'] ?? ''), 10);
    if (isNaN(variantId) || variantId <= 0) {
      return res.status(400).json({ error: 'variantId không hợp lệ.' });
    }

    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      ((prisma as any).stockMovement.count as any)({ where: { variantId } }),
      ((prisma as any).stockMovement.findMany as any)({
        where: { variantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
      }),
    ]);

    const items = rows.map((row: any) => ({
      stockMovementId: row.stockMovementId,
      type: row.type,
      quantity: row.quantity,
      referenceType: row.referenceType ?? null,
      referenceId: row.referenceId ?? null,
      note: row.note ?? null,
      createdAt: row.createdAt,
      createdBy: row.user?.fullName ?? row.user?.email ?? null,
    }));

    return res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (error: unknown) {
    logger.error('[inventoryController] getStockMovements failed', { error });
    const e = error as { message?: string };
    return res.status(500).json({ error: 'Lỗi máy chủ', details: e.message });
  }
};

export const getInventoryLogs = async (req: Request, res: Response) => {
  try {
    const variantId = parseInt(String(req.params['variantId'] ?? ''), 10);
    if (isNaN(variantId) || variantId <= 0) {
      return res.status(400).json({ error: 'variantId không hợp lệ.' });
    }

    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      (prisma.inventoryLog.count as any)({ where: { variantId } }),
      (prisma.inventoryLog.findMany as any)({
        where: { variantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: { select: { orderNumber: true } },
          user: { select: { fullName: true, email: true } },
        },
      }),
    ]);

    const items = logs.map((log: any) => ({
      logId: log.logId,
      changeQuantity: log.changeQuantity,
      previousStock: log.previousStock,
      newStock: log.newStock,
      reason: log.reason,
      note: log.note,
      createdAt: log.createdAt,
      orderNumber: log.order?.orderNumber ?? null,
      changedBy: log.user?.fullName ?? log.user?.email ?? null,
    }));

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (error: unknown) {
    logger.error('[inventoryController] getInventoryLogs failed', { error });
    const e = error as { message?: string };
    res.status(500).json({ error: 'Lỗi máy chủ', details: e.message });
  }
};
