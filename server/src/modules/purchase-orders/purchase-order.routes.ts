import { Router } from 'express';
import { authenticateToken, requireAnyPermission, requirePermission } from '../../middlewares/auth.middleware';
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrderById,
  listPurchaseOrders,
  receivePurchaseOrder,
} from './purchase-order.controller';

const router = Router();
const purchaseOrderReadGuard = [authenticateToken, requireAnyPermission(['VIEW_INVENTORY', 'EDIT_INVENTORY'])];
const purchaseOrderWriteGuard = [authenticateToken, requirePermission('EDIT_INVENTORY')];

router.get('/', ...purchaseOrderReadGuard, listPurchaseOrders);
router.post('/', ...purchaseOrderWriteGuard, createPurchaseOrder);
router.patch('/:id/receive', ...purchaseOrderWriteGuard, receivePurchaseOrder);
router.patch('/:id/cancel', ...purchaseOrderWriteGuard, cancelPurchaseOrder);
router.get('/:id', ...purchaseOrderReadGuard, getPurchaseOrderById);

export default router;
