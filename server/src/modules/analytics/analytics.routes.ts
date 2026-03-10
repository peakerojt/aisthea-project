import { Router } from 'express';
import { getAnalyticsSummary } from '../../controllers/analytics.controller';
import { authenticateToken, checkRole } from '../../middlewares/auth.middleware';

const router = Router();

const adminGuard = [authenticateToken, checkRole(['Admin', 'Super Admin'])];

// GET /api/analytics/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/summary', ...adminGuard, getAnalyticsSummary);

export default router;
