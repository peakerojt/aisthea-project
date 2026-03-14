import { Router } from 'express';
import {
  getInventory,
  bulkUpdateStock,
  getLowStockAlerts,
  getInventoryLogs,
  getInventorySummary,
  getStockMovements,
} from '../controllers/inventory.controller';
import { authenticateToken, checkRole } from '../middlewares/auth.middleware';

const router = Router();

const adminGuard = [authenticateToken, checkRole(['Admin', 'Super Admin'])];

// GET  /api/inventory          — list all variants (Admin only)
router.get('/', ...adminGuard, getInventory);

// PATCH /api/inventory/update  — bulk update stock quantities (Admin, logs MANUAL_ADJUST)
router.patch('/update', ...adminGuard, bulkUpdateStock);

// GET  /api/inventory/alerts    — top-20 low stock variants (Admin only)
router.get('/alerts', ...adminGuard, getLowStockAlerts);

// GET /api/inventory/summary    — KPI summary for restock dashboard
router.get('/summary', ...adminGuard, getInventorySummary);

// GET /api/inventory/:variantId/movements — paginated stock movement ledger
router.get('/:variantId/movements', ...adminGuard, getStockMovements);

// GET  /api/inventory/:variantId/logs  — paginated InventoryLog history (Admin only)
router.get('/:variantId/logs', ...adminGuard, getInventoryLogs);

export default router;

