import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { getOrderById, cancelOrder } from './order.controller';

const router = Router();

router.get('/:id', authenticateToken, getOrderById);
router.patch('/:id/cancel', authenticateToken, cancelOrder);

export default router;

