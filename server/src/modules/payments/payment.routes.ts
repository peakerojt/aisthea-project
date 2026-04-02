/**
 * Payments module — VNPay + refund routes
 * Mounted at /api/payments (vnpay) and /api/orders (refunds)
 */
import { Router } from 'express';
import { createPaymentUrl, vnpayReturn, vnpayIpn, vnpayQuery } from '../../controllers/vnpay.controller';
import { authenticateToken } from '../../middlewares/auth.middleware';
import { getOrderRefunds } from '../../controllers/refund.controller';

export const vnpayModuleRoutes = Router();
export const refundModuleRoutes = Router();

// ─── VNPay ────────────────────────────────────────────────────────────────────
// POST /api/vnpay/create_payment_url   — create a VNPay payment URL
vnpayModuleRoutes.post('/create_payment_url', authenticateToken, createPaymentUrl);
// GET  /api/vnpay/vnpay_return         — VNPay redirect return handler
vnpayModuleRoutes.get('/vnpay_return', vnpayReturn);
// GET  /api/vnpay/vnpay_ipn            — VNPay IPN (server-to-server) handler
vnpayModuleRoutes.get('/vnpay_ipn', vnpayIpn);
// GET  /api/vnpay/vnpay_query          — VNPay query fallback reconciliation handler
vnpayModuleRoutes.get('/vnpay_query', vnpayQuery);

// ─── Refunds (mounted under /api/orders) ──────────────────────────────────────
// Admin/internal compatibility surface, read-only for existing refund history.
// GET  /api/orders/:id/refunds         — list all refunds for an order
refundModuleRoutes.get('/:id/refunds', authenticateToken, getOrderRefunds);
