/**
 * return.routes.ts
 * Mounts all Return & Refund (Hoàn trả & Hoàn tiền) endpoints.
 *
 * Order-scoped routes are also imported and re-exported via app.ts so they
 * mount under /api/orders/:id/return.
 */

import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import returnAdminRoutes from './return.admin-routes';
import returnCustomerRoutes from './return.customer-routes';

const router = Router();

router.use(authenticateToken, returnCustomerRoutes);
router.use(authenticateToken, returnAdminRoutes);

export default router;
