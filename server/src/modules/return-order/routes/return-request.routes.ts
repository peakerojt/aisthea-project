import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/auth.middleware';
import returnRequestAdminRoutes from './return-request.admin-routes';
import returnRequestCustomerRoutes from './return-request.customer-routes';

const router = Router();

router.use(authenticateToken, returnRequestCustomerRoutes);
router.use(authenticateToken, returnRequestAdminRoutes);

export default router;
