/**
 * return.routes.ts
 * Mounts all Return & Refund (Hoàn trả & Hoàn tiền) endpoints.
 *
 * Order-scoped routes are also imported and re-exported via app.ts so they
 * mount under /api/orders/:id/return.
 */

import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import {
    getAdminReturns,
    patchProcessReturn,
} from '../controllers/return.controller';

const router = Router();

// ── Admin-only routes ─────────────────────────────────────────────────────────
// GET  /api/returns         → paginated list of all return requests
router.get('/', authenticateToken, getAdminReturns);

// PATCH /api/returns/:id/process → Admin approve / reject / complete refund
router.patch('/:id/process', authenticateToken, patchProcessReturn);

export default router;
