import { Router } from 'express';
import {
  RETURN_REQUEST_ADMIN_LIST_ROLES,
  RETURN_REQUEST_FINANCE_ROLES,
  RETURN_REQUEST_REVIEW_ROLES,
  RETURN_REQUEST_WAREHOUSE_ROLES,
} from '../../../shared/role-access';
import { createAdminRateLimiters } from '../../../middlewares/security.middleware';
import { ReturnRequestController } from '../controllers/controller';
import { requireRoles } from './route-guards';

const controller = new ReturnRequestController();
const router = Router();
const adminReviewRateLimiters = createAdminRateLimiters('return-request.admin-review');
const adminWarehouseRateLimiters = createAdminRateLimiters('return-request.admin-warehouse');
const adminRefundRateLimiters = createAdminRateLimiters('return-request.admin-refund');

router.get('/admin/list', requireRoles(RETURN_REQUEST_ADMIN_LIST_ROLES), controller.adminList);
router.patch('/admin/:id/approve', requireRoles(RETURN_REQUEST_REVIEW_ROLES), ...adminReviewRateLimiters, controller.approve);
router.patch('/admin/:id/reject', requireRoles(RETURN_REQUEST_REVIEW_ROLES), ...adminReviewRateLimiters, controller.reject);
router.patch('/admin/:id/mark-in-transit', requireRoles(RETURN_REQUEST_WAREHOUSE_ROLES), ...adminWarehouseRateLimiters, controller.markInTransit);
router.patch('/admin/:id/mark-received', requireRoles(RETURN_REQUEST_WAREHOUSE_ROLES), ...adminWarehouseRateLimiters, controller.markReceived);
router.patch('/admin/:id/accept-for-refund', requireRoles(RETURN_REQUEST_WAREHOUSE_ROLES), ...adminWarehouseRateLimiters, controller.acceptForRefund);
router.patch('/admin/:id/refund', requireRoles(RETURN_REQUEST_FINANCE_ROLES), ...adminRefundRateLimiters, controller.refund);
router.patch('/admin/:id/refund-status', requireRoles(RETURN_REQUEST_FINANCE_ROLES), ...adminRefundRateLimiters, controller.updateRefundStatus);

export default router;
