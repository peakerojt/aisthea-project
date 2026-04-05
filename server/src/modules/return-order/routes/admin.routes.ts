import { Router } from 'express';
import { createAdminRateLimiters } from '../../../middlewares/security.middleware';
import { ReturnRequestController } from '../controllers/controller';
import {
  requireRefundWorkflowAccess,
  requireReturnWorkflowAccess,
} from './route-guards';

const controller = new ReturnRequestController();
const router = Router();
const adminReviewRateLimiters = createAdminRateLimiters('return-request.admin-review');
const adminWarehouseRateLimiters = createAdminRateLimiters('return-request.admin-warehouse');
const adminRefundRateLimiters = createAdminRateLimiters('return-request.admin-refund');

router.get('/admin/list', requireReturnWorkflowAccess, controller.adminList);
router.patch('/admin/:id/approve', requireReturnWorkflowAccess, ...adminReviewRateLimiters, controller.approve);
router.patch('/admin/:id/reject', requireReturnWorkflowAccess, ...adminReviewRateLimiters, controller.reject);
router.patch('/admin/:id/mark-in-transit', requireReturnWorkflowAccess, ...adminWarehouseRateLimiters, controller.markInTransit);
router.patch('/admin/:id/mark-received', requireReturnWorkflowAccess, ...adminWarehouseRateLimiters, controller.markReceived);
router.patch('/admin/:id/accept-for-refund', requireReturnWorkflowAccess, ...adminWarehouseRateLimiters, controller.acceptForRefund);
router.patch('/admin/:id/refund', requireRefundWorkflowAccess, ...adminRefundRateLimiters, controller.refund);
router.post('/admin/refund-payout-proofs/upload', requireRefundWorkflowAccess, ...adminRefundRateLimiters, controller.uploadPayoutProofImage);
router.get('/admin/:id/refund-payout-proofs', requireRefundWorkflowAccess, controller.listRefundPayoutProofs);
router.post('/admin/:id/complete-bank-refund', requireRefundWorkflowAccess, ...adminRefundRateLimiters, controller.completeBankRefund);
router.post('/admin/:id/send-bank-info-reminder', requireRefundWorkflowAccess, ...adminRefundRateLimiters, controller.sendBankInfoReminder);
router.patch('/admin/:id/refund-status', requireRefundWorkflowAccess, ...adminRefundRateLimiters, controller.updateRefundStatus);

export default router;
