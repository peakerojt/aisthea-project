import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { trackingController } from './tracking.controller';

const trackingRouter = Router();

trackingRouter.post('/tracking/public', trackingController.publicTracking);
trackingRouter.get('/orders/my', authenticateToken, trackingController.getMyOrders);
trackingRouter.get('/orders/:id/tracking', authenticateToken, trackingController.getOrderTracking);
trackingRouter.patch('/admin/orders/:id/status', authenticateToken, trackingController.adminUpdateOrderStatus);

export default trackingRouter;
