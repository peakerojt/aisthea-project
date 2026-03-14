import { Router } from 'express';
import { getDashboardSummary } from '../../controllers/dashboard.controller';
import { authenticateToken, checkRole } from '../../middlewares/auth.middleware';

const router = Router();

const adminGuard = [authenticateToken, checkRole(['Admin', 'Super Admin'])];

// GET /api/dashboard/summary?range=today|week|month|year
router.get('/summary', ...adminGuard, getDashboardSummary);

export default router;
