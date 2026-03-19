import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { getOrderById, cancelOrder } from './order.controller';
import { validate } from '../../middlewares/validate.middleware';
import { orderIdParamSchema } from './order.validator';

const router = Router();

router.get('/:id', authenticateToken, validate(orderIdParamSchema, 'params'), getOrderById);
router.patch('/:id/cancel', authenticateToken, validate(orderIdParamSchema, 'params'), cancelOrder);

export default router;

