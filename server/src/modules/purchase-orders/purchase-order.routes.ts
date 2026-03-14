import { Router } from 'express';
import { authenticateToken, checkRole } from '../../middlewares/auth.middleware';
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrderById,
  listPurchaseOrders,
  receivePurchaseOrder,
} from './purchase-order.controller';

const router = Router();
const adminGuard = [authenticateToken, checkRole(['Admin', 'Super Admin'])];

router.get('/', ...adminGuard, listPurchaseOrders);
router.post('/', ...adminGuard, createPurchaseOrder);
router.patch('/:id/receive', ...adminGuard, receivePurchaseOrder);
router.patch('/:id/cancel', ...adminGuard, cancelPurchaseOrder);
router.get('/:id', ...adminGuard, getPurchaseOrderById);

export default router;
