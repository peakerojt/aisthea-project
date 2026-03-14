import { Router } from 'express';
import { authenticateToken, checkRole } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { chatController } from './chat.controller';
import { chatRequestSchema, chatTelemetrySchema } from './chat.validator';

const router = Router();

router.get('/analytics/summary', authenticateToken, checkRole(['Admin', 'Super Admin']), chatController.getTelemetrySummary);
router.post('/events', validate(chatTelemetrySchema), chatController.trackEvent);
router.post('/', validate(chatRequestSchema), chatController.send);

export default router;
