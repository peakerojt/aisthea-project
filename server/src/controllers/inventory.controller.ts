import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// ─── Size ordering reference ──────────────────────────────────────────────────
// Variants within each product group are sorted: color (A→Z) → size (S→M→L→XL)

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'FREESIZE', 'FREE SIZE', 'ONE SIZE'];

function getSizeIndex(value: string): number {
    const idx = SIZE_ORDER.indexOf(value.toUpperCase().trim());
    return idx === -1 ? 999 : idx;
}

/** True if this attribute value is a recognised size token */
function isSize(value: string): boolean {
    return getSizeIndex(value) < 999;
}

// ─── GET /api/inventory ───────────────────────────────────────────────────────
// Returns all ProductVariants, sorted consistently: product name → color → size.
// Each variant label is always "Color/Size" (non-size attrs first, size last).
// Query params:
//   ?lowStock=true  → only variants with stockQuantity < 10
//   ?search=…       → filter by SKU or product name

export const getInventory = async (req: Request, res: Response) => {
    try {
        const { lowStock, search } = req.query as Record<string, string | undefined>;

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

        const variants = await (prisma.productVariant.findMany as any)({
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
        });

        // ── Shape + build consistent label ─────────────────────────────────
        const shaped = variants.map((v: any) => {
            const attrs: { val: string; isSize: boolean }[] = (v.variantAttributes ?? [])
                .map((va: any) => ({
                    val: (va.value?.value ?? '') as string,
                    isSize: isSize(va.value?.value ?? ''),
                }))
                .filter((a: { val: string }) => a.val !== '');

            // Consistent attribute order: non-size (colors) first, then size
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
                stockQuantity: v.stockQuantity,
                variantLabel,
                _color: colorVal,
                _sizeIdx: getSizeIndex(sizeVal),
                product: {
                    name: v.product?.name ?? 'Unknown',
                    primaryImageUrl,
                },
            };
        });

        // ── Sort: product name → color (A→Z) → size order (S→M→L→XL) ──────
        shaped.sort((a: any, b: any) => {
            const byName = a.product.name.localeCompare(b.product.name, 'vi');
            if (byName !== 0) return byName;

            const byColor = a._color.localeCompare(b._color, 'vi');
            if (byColor !== 0) return byColor;

            return a._sizeIdx - b._sizeIdx;
        });

        // Strip internal sort keys before sending
        const result = shaped.map(({ _color, _sizeIdx, ...rest }: any) => rest);

        res.json(result);
    } catch (error: any) {
        console.error('Get inventory error:', error);
        res.status(500).json({ error: 'Lỗi máy chủ', details: error.message });
    }
};

// ─── PATCH /api/inventory/update ─────────────────────────────────────────────
// Bulk-updates stock quantities in a single transaction.
// Body: [{ variantId: number, quantity: number }, ...]
// Safety: rejects if any quantity < 0.

export const bulkUpdateStock = async (req: Request, res: Response) => {
    try {
        const changes: { variantId: number; quantity: number }[] = req.body;

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

        await prisma.$transaction(
            changes.map((c) =>
                (prisma.productVariant.update as any)({
                    where: { variantId: c.variantId },
                    data: { stockQuantity: c.quantity },
                })
            )
        );

        res.json({
            success: true,
            message: `Đã cập nhật ${changes.length} biến thể thành công.`,
            updatedCount: changes.length,
        });
    } catch (error: any) {
        console.error('Bulk update stock error:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Không tìm thấy một hoặc nhiều biến thể.' });
        }
        res.status(500).json({ error: 'Lỗi máy chủ', details: error.message });
    }
};

// ─── GET /api/inventory/alerts ───────────────────────────────────────────────
// Returns total count + top 20 variants with stockQuantity <= 10,
// sorted by stockQuantity ASC (0 first).

export const getLowStockAlerts = async (req: Request, res: Response) => {
    try {
        // Count all low-stock variants first
        const totalLowStock = await (prisma.productVariant.count as any)({
            where: {
                isDeleted: false,
                product: { isDeleted: false },
                stockQuantity: { lte: 10 },
            },
        });

        const variants = await (prisma.productVariant.findMany as any)({
            where: {
                isDeleted: false,
                product: { isDeleted: false },
                stockQuantity: { lte: 10 },
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
            take: 20,
        });

        const items = variants.map((v: any) => {
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
                stockQuantity: v.stockQuantity,
                variantLabel,
                product: {
                    name: v.product?.name ?? 'Unknown',
                    primaryImageUrl,
                },
            };
        });

        res.json({ totalLowStock, items });
    } catch (error: any) {
        console.error('Get low stock alerts error:', error);
        res.status(500).json({ error: 'Lỗi máy chủ', details: error.message });
    }
};
