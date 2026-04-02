import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { createCustomerMutationRateLimiters } from '../../middlewares/security.middleware';
import { getOrderById, cancelOrder } from './order.controller';
import { validate } from '../../middlewares/validate.middleware';
import { cancelOrderBodySchema, orderIdParamSchema } from './order.validator';

const router = Router();
const cancelOrderRateLimiters = createCustomerMutationRateLimiters('order.cancel');

router.get('/:id', authenticateToken, validate(orderIdParamSchema, 'params'), getOrderById);
router.patch(
  '/:id/cancel',
  authenticateToken,
  ...cancelOrderRateLimiters,
  validate(orderIdParamSchema, 'params'),
  validate(cancelOrderBodySchema, 'body'),
  cancelOrder,
);

export default router;

