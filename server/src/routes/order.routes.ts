import { Router } from 'express';
import { authenticateToken, checkRole } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
    getMyOrders,
    getMyOrderDetail,
    createOrder,
    quoteOrder,
    getAllOrders,
    getAdminOrderDetail,
    updateOrderStatus,
    confirmReceipt,
    uploadDeliveryProofImages,
    uploadReturnProofImages,
} from '../controllers/order.controller';
import {
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
const adminGuard = [authenticateToken, checkRole(['Admin', 'Super Admin'])];
// NOTE: /admin must come BEFORE /:id to avoid route collisions
router.get('/admin', ...adminGuard, getAllOrders);
router.get('/admin/:id', ...adminGuard, validate(orderIdParamSchema, 'params'), getAdminOrderDetail);
router.post('/:id/delivery-proof-images', ...adminGuard, validate(orderIdParamSchema, 'params'), upload.array('files', 5), uploadDeliveryProofImages);
router.patch('/:id/status', ...adminGuard, validate(orderIdParamSchema, 'params'), validate(updateOrderStatusSchema), updateOrderStatus);

export default router;
