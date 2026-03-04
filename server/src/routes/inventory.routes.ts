import { Router } from 'express';
import { getInventory, bulkUpdateStock, getLowStockAlerts, getInventoryLogs } from '../controllers/inventory.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// GET  /api/inventory          — list all variants (with optional ?lowStock=true&search=...)
router.get('/', getInventory);

// PATCH /api/inventory/update  — bulk update stock quantities (admin, logs MANUAL_ADJUST)
router.patch('/update', authenticateToken, bulkUpdateStock);

// GET  /api/inventory/alerts    — top-20 low stock variants (stockQuantity <= 10)
router.get('/alerts', getLowStockAlerts);

// GET  /api/inventory/:variantId/logs  — paginated InventoryLog history for a variant
router.get('/:variantId/logs', authenticateToken, getInventoryLogs);

export default router;

