import { Router } from 'express';
import { getAnalyticsSummary } from '../controllers/analytics.controller';
import { authenticateToken, checkRole } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/analytics/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD  (Admin only)
router.get('/summary', authenticateToken, checkRole(['Admin', 'Super Admin']), getAnalyticsSummary);

export default router;
