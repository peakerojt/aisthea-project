import { Router } from 'express';
import { warehouseController } from './warehouse.controller';
import { authenticateToken, checkRole } from '../../middlewares/auth.middleware';

const router = Router();
const adminGuard = [authenticateToken, checkRole(['Admin', 'Super Admin'])];

// GET    /api/warehouses             — list all warehouses
router.get('/', ...adminGuard, (req, res) => warehouseController.list(req, res));

// POST   /api/warehouses             — create new warehouse
router.post('/', ...adminGuard, (req, res) => warehouseController.create(req, res));

// GET    /api/warehouses/:id         — get warehouse with inventory
router.get('/:id', ...adminGuard, (req, res) => warehouseController.getById(req, res));

// PATCH  /api/warehouses/:id         — update warehouse details
router.patch('/:id', ...adminGuard, (req, res) => warehouseController.update(req, res));

// DELETE /api/warehouses/:id         — deactivate warehouse (soft delete)
router.delete('/:id', ...adminGuard, (req, res) => warehouseController.deactivate(req, res));

// POST   /api/warehouses/:id/inventory — set/upsert inventory for a variant
router.post('/:id/inventory', ...adminGuard, (req, res) => warehouseController.setInventory(req, res));

export default router;
