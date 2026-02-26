import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
    getMyOrders,
    getMyOrderDetail,
    createOrder,
    getAllOrders,
    getAdminOrderDetail,
    updateOrderStatus,
} from '../controllers/order.controller';

const router = Router();

// ── User Routes ──────────────────────────────────────────────────────────────
router.get('/my', authenticateToken, getMyOrders);
router.get('/my/:orderId', authenticateToken, getMyOrderDetail);
router.post('/', authenticateToken, createOrder);

// ── Admin Routes ─────────────────────────────────────────────────────────────
// NOTE: /admin must come BEFORE /:id to avoid route collisions
router.get('/admin', authenticateToken, getAllOrders);
router.get('/admin/:id', authenticateToken, getAdminOrderDetail);
router.patch('/:id/status', authenticateToken, updateOrderStatus);

export default router;
