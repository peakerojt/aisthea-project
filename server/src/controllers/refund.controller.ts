/**
 * refund.controller.ts
 * REST handlers for the Financial Refund Engine.
 *
 * Routes (registered via refund.routes.ts):
 *   POST /api/orders/:id/refunds  — Admin: initiate refund
 *   GET  /api/orders/:id/refunds  — Admin: list refunds for an order
 */

import { Request, Response } from 'express';
import { initiateRefund, getRefundsForOrder, RefundError } from '../services/refund.service';

// ─── POST /api/orders/:id/refunds ─────────────────────────────────────────────

export async function postInitiateRefund(req: Request, res: Response): Promise<void> {
    const orderId = parseInt(req.params.id as string, 10);
    const adminUserId = (req as any).user?.userId ?? 0;

    if (isNaN(orderId)) {
        res.status(400).json({ success: false, code: 'INVALID_ORDER_ID', message: 'Invalid order ID.' });
        return;
    }

    const { amount, type, method, reason } = req.body;

    // Basic presence validation
    if (!amount || !type || !method || !reason) {
        res.status(400).json({
            success: false,
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Missing required fields: amount, type, method, reason.',
        });
        return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        res.status(400).json({
            success: false,
            code: 'INVALID_AMOUNT',
            message: 'Refund amount is invalid or exceeds the allowed limit.',
        });
        return;
    }

    try {
        const refund = await initiateRefund(orderId, adminUserId, {
            amount: numAmount,
            type,
            method,
            reason,
        });

        res.status(201).json({
            success: true,
            code: 'REFUND_INITIATED',
            message: 'Refund sent to payment gateway successfully.',
            data: refund,
        });
    } catch (err: any) {
        if (err instanceof RefundError) {
            res.status(err.status).json({ success: false, code: err.code, message: err.message });
        } else {
            console.error('[refund.controller] unexpected error:', err);
            res.status(500).json({ success: false, code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error.' });
        }
    }
}

// ─── GET /api/orders/:id/refunds ──────────────────────────────────────────────

export async function getOrderRefunds(req: Request, res: Response): Promise<void> {
    const orderId = parseInt(req.params.id as string, 10);

    if (isNaN(orderId)) {
        res.status(400).json({ success: false, code: 'INVALID_ORDER_ID', message: 'Invalid order ID.' });
        return;
    }

    try {
        const refunds = await getRefundsForOrder(orderId);
        res.json({ success: true, data: refunds });
    } catch (err: any) {
        console.error('[refund.controller] getOrderRefunds error:', err);
        res.status(500).json({ success: false, code: 'FETCH_REFUND_HISTORY_FAILED', message: 'Failed to load refund history.' });
    }
}
