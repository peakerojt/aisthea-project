import { Router } from 'express';
import { getAnalyticsSummary } from '../controllers/analytics.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/analytics/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/summary', authenticateToken, getAnalyticsSummary);

export default router;
