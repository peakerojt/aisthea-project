import { Router } from 'express';
import { getInventory, bulkUpdateStock, getLowStockAlerts } from '../controllers/inventory.controller';

const router = Router();

// GET  /api/inventory          — list all variants (with optional ?lowStock=true&search=...)
router.get('/', getInventory);

// PATCH /api/inventory/update  — bulk update stock quantities
router.patch('/update', bulkUpdateStock);

// GET  /api/inventory/alerts    — top-20 low stock variants (stockQuantity <= 10)
router.get('/alerts', getLowStockAlerts);

export default router;
