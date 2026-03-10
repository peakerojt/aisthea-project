/**
 * Warehouse module — full CRUD for warehouse management
 * GET    /api/warehouses          — list all warehouses (Admin)
 * POST   /api/warehouses          — create warehouse (Admin)
 * GET    /api/warehouses/:id      — get warehouse details with inventory summary (Admin)
 * PATCH  /api/warehouses/:id      — update warehouse (Admin)
 * DELETE /api/warehouses/:id      — deactivate warehouse (Admin)
 */
import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

const db = prisma as any; // cast until prisma generate runs after db push

export const warehouseController = {
    // GET /api/warehouses
    async list(_req: Request, res: Response) {
        try {
            const warehouses = await db.warehouse.findMany({
                orderBy: { warehouseId: 'asc' },
                include: {
                    _count: {
                        select: { inventory: true },
                    },
                },
            });

            const result = warehouses.map((w: any) => ({
                warehouseId: w.warehouseId,
                name: w.name,
                address: w.address,
                isActive: w.isActive,
                createdAt: w.createdAt,
                inventoryCount: w._count.inventory,
            }));

            res.json({ success: true, data: result });
        } catch (error) {
            logger.error('[warehouse] list failed', { error });
            res.status(500).json({ success: false, message: 'Failed to list warehouses.' });
        }
    },

    // POST /api/warehouses
    async create(req: Request, res: Response) {
        try {
            const { name, address } = req.body as { name?: string; address?: string };
            if (!name?.trim()) {
                return res.status(400).json({ success: false, message: 'Warehouse name is required.' });
            }

            const warehouse = await db.warehouse.create({
                data: { name: name.trim(), address: address?.trim() ?? null },
            });

            res.status(201).json({ success: true, data: warehouse });
        } catch (error) {
            logger.error('[warehouse] create failed', { error });
            res.status(500).json({ success: false, message: 'Failed to create warehouse.' });
        }
    },

    // GET /api/warehouses/:id
    async getById(req: Request, res: Response) {
        try {
            const warehouseId = parseInt(req.params.id as string);
            if (isNaN(warehouseId)) return res.status(400).json({ success: false, message: 'Invalid warehouse ID.' });

            const warehouse = await db.warehouse.findUnique({
                where: { warehouseId },
                include: {
                    inventory: {
                        include: {
                            variant: {
                                include: {
                                    product: { select: { name: true } },
                                    variantAttributes: {
                                        include: { value: { include: { attribute: true } } },
                                    },
                                },
                            },
                        },
                        orderBy: [{ variant: { product: { name: 'asc' } } }],
                    },
                },
            });

            if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found.' });

            // Shape inventory items
            const inventoryItems = warehouse.inventory.map((inv: any) => ({
                inventoryId: inv.inventoryId,
                variantId: inv.variantId,
                quantity: inv.quantity,
                reservedQuantity: inv.reservedQuantity,
                availableStock: inv.quantity - inv.reservedQuantity,
                sku: inv.variant?.sku,
                productName: inv.variant?.product?.name,
                variantLabel: (inv.variant?.variantAttributes ?? [])
                    .map((va: any) => va.value?.value ?? '')
                    .filter(Boolean)
                    .join('/'),
            }));

            res.json({
                success: true,
                data: {
                    warehouseId: warehouse.warehouseId,
                    name: warehouse.name,
                    address: warehouse.address,
                    isActive: warehouse.isActive,
                    inventory: inventoryItems,
                },
            });
        } catch (error) {
            logger.error('[warehouse] getById failed', { error });
            res.status(500).json({ success: false, message: 'Failed to get warehouse.' });
        }
    },

    // PATCH /api/warehouses/:id
    async update(req: Request, res: Response) {
        try {
            const warehouseId = parseInt(req.params.id as string);
            if (isNaN(warehouseId)) return res.status(400).json({ success: false, message: 'Invalid warehouse ID.' });

            const { name, address, isActive } = req.body as { name?: string; address?: string; isActive?: boolean };

            const warehouse = await db.warehouse.update({
                where: { warehouseId },
                data: {
                    ...(name !== undefined && { name: name.trim() }),
                    ...(address !== undefined && { address: address.trim() || null }),
                    ...(isActive !== undefined && { isActive }),
                },
            });

            res.json({ success: true, data: warehouse });
        } catch (error: any) {
            if (error?.code === 'P2025') return res.status(404).json({ success: false, message: 'Warehouse not found.' });
            logger.error('[warehouse] update failed', { error });
            res.status(500).json({ success: false, message: 'Failed to update warehouse.' });
        }
    },

    // DELETE /api/warehouses/:id — soft deactivate
    async deactivate(req: Request, res: Response) {
        try {
            const warehouseId = parseInt(req.params.id as string);
            if (isNaN(warehouseId)) return res.status(400).json({ success: false, message: 'Invalid warehouse ID.' });

            const warehouse = await db.warehouse.update({
                where: { warehouseId },
                data: { isActive: false },
            });

            res.json({ success: true, message: 'Warehouse deactivated.', data: warehouse });
        } catch (error: any) {
            if (error?.code === 'P2025') return res.status(404).json({ success: false, message: 'Warehouse not found.' });
            logger.error('[warehouse] deactivate failed', { error });
            res.status(500).json({ success: false, message: 'Failed to deactivate warehouse.' });
        }
    },

    // POST /api/warehouses/:id/inventory — add/set inventory for a variant
    async setInventory(req: Request, res: Response) {
        try {
            const warehouseId = parseInt(req.params.id as string);
            const { variantId, quantity } = req.body as { variantId?: number; quantity?: number };

            if (isNaN(warehouseId) || !variantId || quantity === undefined || quantity < 0) {
                return res.status(400).json({ success: false, message: 'Invalid warehouseId, variantId or quantity.' });
            }

            // Upsert inventory row
            const existing = await db.inventory.findFirst({ where: { warehouseId, variantId } });

            let inventory;
            if (existing) {
                inventory = await db.inventory.update({
                    where: { inventoryId: existing.inventoryId },
                    data: { quantity },
                });
            } else {
                inventory = await db.inventory.create({
                    data: { warehouseId, variantId, quantity, reservedQuantity: 0 },
                });
            }

            res.json({ success: true, data: { ...inventory, availableStock: inventory.quantity - inventory.reservedQuantity } });
        } catch (error) {
            logger.error('[warehouse] setInventory failed', { error });
            res.status(500).json({ success: false, message: 'Failed to set inventory.' });
        }
    },
};
