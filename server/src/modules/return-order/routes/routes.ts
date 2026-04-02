import { Router } from 'express';
import { authenticateToken } from '../../../middlewares/auth.middleware';
import returnRequestAdminRoutes from './admin.routes';
import returnRequestCustomerRoutes from './customer.routes';

const router = Router();

router.use(authenticateToken, returnRequestCustomerRoutes);
router.use(authenticateToken, returnRequestAdminRoutes);

export default router;
