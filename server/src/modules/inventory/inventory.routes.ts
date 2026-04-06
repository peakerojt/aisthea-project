import { Router } from 'express';
import {
  getInventory,
  bulkUpdateStock,
  getLowStockAlerts,
  getInventoryLogs,
  getInventorySummary,
  getStockMovements,
} from '../../controllers/inventory.controller';
import { authenticateToken, requireAnyPermission, requirePermission } from '../../middlewares/auth.middleware';

const router = Router();

const inventoryReadGuard = [authenticateToken, requireAnyPermission(['VIEW_INVENTORY', 'EDIT_INVENTORY'])];
const inventoryWriteGuard = [authenticateToken, requirePermission('EDIT_INVENTORY')];

// GET  /api/inventory            — list all variants with stock info (Admin only)
router.get('/', ...inventoryReadGuard, getInventory);

// PATCH /api/inventory/update    — bulk update stock quantities (Admin, logs MANUAL_ADJUST)
router.patch('/update', ...inventoryWriteGuard, bulkUpdateStock);

// GET  /api/inventory/alerts     — top-20 low stock variants (Admin only)
router.get('/alerts', ...inventoryReadGuard, getLowStockAlerts);

// GET /api/inventory/summary      — KPI summary for restock dashboard
router.get('/summary', ...inventoryReadGuard, getInventorySummary);

// GET /api/inventory/:variantId/movements — paginated stock movement ledger
router.get('/:variantId/movements', ...inventoryReadGuard, getStockMovements);

// GET  /api/inventory/:variantId/logs — paginated InventoryLog history (Admin only)
router.get('/:variantId/logs', ...inventoryReadGuard, getInventoryLogs);

export default router;
