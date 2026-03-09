import { Router } from 'express';
import { getDashboardSummary } from '../controllers/dashboard.controller';
import { authenticateToken, checkRole } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/dashboard/summary?range=today|week|month|year  (Admin only)
router.get('/summary', authenticateToken, checkRole(['Admin', 'Super Admin']), getDashboardSummary);

export default router;
