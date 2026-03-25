import { Router } from 'express';
import { SUPPORT_ACCESS_ROLES } from '../../../shared/role-access';
import { ReturnRequestController } from '../controllers/return-request.controller';
import { requireRoles } from './return-request.route-helpers';

const controller = new ReturnRequestController();
const router = Router();

router.get('/admin/list', requireRoles(SUPPORT_ACCESS_ROLES), controller.adminList);
router.patch('/admin/:id/approve', requireRoles(SUPPORT_ACCESS_ROLES), controller.approve);
router.patch('/admin/:id/reject', requireRoles(SUPPORT_ACCESS_ROLES), controller.reject);
router.patch('/admin/:id/mark-received', requireRoles(SUPPORT_ACCESS_ROLES), controller.markReceived);
router.patch('/admin/:id/refund', requireRoles(SUPPORT_ACCESS_ROLES), controller.refund);

export default router;
