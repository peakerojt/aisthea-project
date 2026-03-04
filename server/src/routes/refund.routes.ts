/**
 * refund.routes.ts
 * Express router for the Financial Refund Engine.
 *
 * All endpoints require an authenticated admin token.
 * Mounted at /api/orders in app.ts.
 */

import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { postInitiateRefund, getOrderRefunds } from '../controllers/refund.controller';

const router = Router();

// POST  /api/orders/:id/refunds  — initiate a new refund
router.post('/:id/refunds', authenticateToken, postInitiateRefund);

// GET   /api/orders/:id/refunds  — list all refunds for an order
router.get('/:id/refunds', authenticateToken, getOrderRefunds);

export default router;
