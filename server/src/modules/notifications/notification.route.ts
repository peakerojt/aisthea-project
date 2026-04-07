import { Router } from 'express';
import { authenticateToken, requirePermission } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { notificationController } from './notification.controller';
import {
  cleanupEmailJobsSchema,
  emailJobIdParamSchema,
  listEmailJobsQuerySchema,
} from './notification.validator';

const router = Router();

const notificationReadGuard = [authenticateToken, requirePermission('VIEW_ORDER')];
const notificationWriteGuard = [authenticateToken, requirePermission('EDIT_ORDER')];

router.get(
  '/email-jobs',
  ...notificationReadGuard,
  validate(listEmailJobsQuerySchema, 'query'),
  notificationController.listEmailJobs,
);

router.post(
  '/email-jobs/:emailJobId/retry',
  ...notificationWriteGuard,
  validate(emailJobIdParamSchema, 'params'),
  notificationController.retryEmailJob,
);

router.post(
  '/email-jobs/cleanup',
  ...notificationWriteGuard,
  validate(cleanupEmailJobsSchema),
  notificationController.cleanupEmailJobs,
);

export default router;
