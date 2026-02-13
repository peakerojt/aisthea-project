import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { getMyOrders, getMyOrderDetail, createOrder } from '../controllers/order.controller';

const router = Router();

router.get('/my', authenticateToken, getMyOrders);
router.get('/my/:orderId', authenticateToken, getMyOrderDetail);
router.post('/', authenticateToken, createOrder);

export default router;
