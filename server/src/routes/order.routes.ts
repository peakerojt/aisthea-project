import { Router } from 'express';
import { authenticateToken, checkRole } from '../middlewares/auth.middleware';
import {
    getMyOrders,
    getMyOrderDetail,
    createOrder,
    quoteOrder,
    getAllOrders,
    getAdminOrderDetail,
    updateOrderStatus,
    confirmReceipt,
} from '../controllers/order.controller';

const router = Router();

// ── User Routes ──────────────────────────────────────────────────────────────
router.get('/my', authenticateToken, getMyOrders);
router.get('/my/:orderId', authenticateToken, getMyOrderDetail);
router.post('/quote', authenticateToken, quoteOrder);
router.post('/', authenticateToken, createOrder);
// NOTE: /my/:orderId/confirm-receipt uses the orderId param name but here we have :id
// Confirm receipt is on /:id/confirm-receipt — placed BEFORE generic /:id/status to avoid conflicts
router.patch('/:id/confirm-receipt', authenticateToken, confirmReceipt);

// ── Admin Routes ─────────────────────────────────────────────────────────────
const adminGuard = [authenticateToken, checkRole(['Admin', 'Super Admin'])];
// NOTE: /admin must come BEFORE /:id to avoid route collisions
router.get('/admin', ...adminGuard, getAllOrders);
router.get('/admin/:id', ...adminGuard, getAdminOrderDetail);
router.patch('/:id/status', ...adminGuard, updateOrderStatus);

export default router;
