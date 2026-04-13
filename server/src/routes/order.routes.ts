import { Router } from 'express';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
    bulkUpdateOrderStatus,
    exportSelectedAdminOrders,
    exportSelectedAdminShippingLabels,
    getMyOrders,
    getMyOrderDetail,
    createOrder,
    quoteOrder,
    getAllOrders,
    getAdminOrderTabCounts,
    getAdminOrderDetail,
    updateOrderStatus,
    confirmReceipt,
    uploadDeliveryProofImages,
    uploadReturnProofImages,
} from '../controllers/order.controller';
import {
    adminOrderExportSchema,
    bulkUpdateOrderStatusSchema,
    createOrderSchema,
    myOrderIdParamSchema,
    orderIdParamSchema,
    quoteOrderSchema,
    updateOrderStatusSchema,
} from '../modules/order/order.validator';

const router = Router();

// ── User Routes ──────────────────────────────────────────────────────────────
router.get('/my', authenticateToken, getMyOrders);
router.get('/my/:orderId', authenticateToken, validate(myOrderIdParamSchema, 'params'), getMyOrderDetail);
router.post('/quote', authenticateToken, validate(quoteOrderSchema), quoteOrder);
router.post('/', authenticateToken, validate(createOrderSchema), createOrder);
// NOTE: /my/:orderId/confirm-receipt uses the orderId param name but here we have :id
// Confirm receipt is on /:id/confirm-receipt — placed BEFORE generic /:id/status to avoid conflicts
router.patch('/:id/confirm-receipt', authenticateToken, validate(orderIdParamSchema, 'params'), confirmReceipt);
router.post('/:id/return-proof-images', authenticateToken, validate(orderIdParamSchema, 'params'), upload.array('files', 5), uploadReturnProofImages);

// ── Admin Routes ─────────────────────────────────────────────────────────────
const orderReadGuard = [authenticateToken, requirePermission('VIEW_ORDER')];
const orderWriteGuard = [authenticateToken, requirePermission('EDIT_ORDER')];
// NOTE: /admin must come BEFORE /:id to avoid route collisions
router.get('/admin', ...orderReadGuard, getAllOrders);
router.get('/admin/tab-counts', ...orderReadGuard, getAdminOrderTabCounts);
router.post('/admin/export', ...orderReadGuard, validate(adminOrderExportSchema), exportSelectedAdminOrders);
router.post('/admin/export-shipping-labels', ...orderReadGuard, validate(adminOrderExportSchema), exportSelectedAdminShippingLabels);
router.patch('/admin/bulk-status', ...orderWriteGuard, validate(bulkUpdateOrderStatusSchema), bulkUpdateOrderStatus);
router.get('/admin/:id', ...orderReadGuard, validate(orderIdParamSchema, 'params'), getAdminOrderDetail);
router.post('/:id/delivery-proof-images', ...orderWriteGuard, validate(orderIdParamSchema, 'params'), upload.array('files', 5), uploadDeliveryProofImages);
router.patch('/:id/status', ...orderWriteGuard, validate(orderIdParamSchema, 'params'), validate(updateOrderStatusSchema), updateOrderStatus);

export default router;
