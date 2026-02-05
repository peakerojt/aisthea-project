import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { getMyOrders, getMyOrderDetail } from '../controllers/order.controller';

const router = Router();

router.get('/my', authenticateToken, getMyOrders);
router.get('/my/:orderId', authenticateToken, getMyOrderDetail);

export default router;
