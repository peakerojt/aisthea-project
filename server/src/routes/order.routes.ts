import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
    getMyOrders,
    getMyOrderDetail,
    createOrder,
    getAllOrders,
    getAdminOrderDetail,
    updateOrderStatus,
    confirmReceipt,
} from '../controllers/order.controller';

const router = Router();

// ── User Routes ──────────────────────────────────────────────────────────────
router.get('/my', authenticateToken, getMyOrders);
router.get('/my/:orderId', authenticateToken, getMyOrderDetail);
router.post('/', authenticateToken, createOrder);
// NOTE: /my/:orderId/confirm-receipt uses the orderId param name but here we have :id
// Confirm receipt is on /:id/confirm-receipt — placed BEFORE generic /:id/status to avoid conflicts
router.patch('/:id/confirm-receipt', authenticateToken, confirmReceipt);

// ── Admin Routes ─────────────────────────────────────────────────────────────
// NOTE: /admin must come BEFORE /:id to avoid route collisions
router.get('/admin', authenticateToken, getAllOrders);
router.get('/admin/:id', authenticateToken, getAdminOrderDetail);
router.patch('/:id/status', authenticateToken, updateOrderStatus);

export default router;
