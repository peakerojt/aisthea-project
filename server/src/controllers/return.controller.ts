/**
 * return.controller.ts
 * HTTP handlers for the Return & Refund module.
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
    ReturnError,
    requestReturn,
    processReturn,
    listReturns,
    getReturnForOrder,
} from '../services/return.service';

type ProcessAction = 'APPROVE' | 'REJECT' | 'COMPLETE_REFUND';

const sendError = (res: Response, error: ReturnError | Error) => {
    if (error instanceof ReturnError) {
        return res.status(error.status).json({
            success: false,
            code: error.code,
            message: error.message,
        });
    }
    console.error('[ReturnController] Unexpected error:', error);
    return res.status(500).json({
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error.',
    });
};

// ── POST /api/orders/:id/return ───────────────────────────────────────────────
export const postReturnRequest = async (req: AuthRequest, res: Response) => {
    try {
        const orderId = Number(req.params.id);
        if (!Number.isFinite(orderId) || orderId <= 0) {
            return res.status(400).json({ success: false, code: 'INVALID_ORDER_ID', message: 'Invalid order ID.' });
        }

        const user = req.user;
        if (!user || typeof user.userId !== 'number') {
            return res.status(401).json({ success: false, code: 'UNAUTHORIZED', message: 'Authentication required.' });
        }

        const { reason, proofImages = [] } = req.body as {
            reason: string;
            proofImages?: string[];
        };

        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({ success: false, code: 'REASON_REQUIRED', message: 'Return reason is required.' });
        }

        if (!Array.isArray(proofImages)) {
            return res.status(400).json({ success: false, code: 'INVALID_PROOF_IMAGES', message: 'proofImages must be an array of URLs.' });
        }

        const data = await requestReturn(
            orderId,
            user.userId,
            user.roles ?? [],
            reason.trim(),
            proofImages,
        );

        return res.status(201).json({ success: true, data });
    } catch (error: any) {
        return sendError(res, error);
    }
};

// ── PATCH /api/returns/:id/process ────────────────────────────────────────────
export const patchProcessReturn = async (req: AuthRequest, res: Response) => {
    try {
        const returnId = Number(req.params.id);
        if (!Number.isFinite(returnId) || returnId <= 0) {
            return res.status(400).json({ success: false, code: 'INVALID_RETURN_ID', message: 'Invalid return request ID.' });
        }

        const user = req.user;
        if (!user || !user.roles?.includes('Admin')) {
            return res.status(403).json({ success: false, code: 'ADMIN_REQUIRED', message: 'Admin role required to process returns.' });
        }

        const { action, note } = req.body as { action: ProcessAction; note?: string };

        const validActions: ProcessAction[] = ['APPROVE', 'REJECT', 'COMPLETE_REFUND'];
        if (!validActions.includes(action)) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_ACTION',
                message: `Invalid action. Must be one of: ${validActions.join(', ')}.`,
            });
        }

        const result = await processReturn(returnId, user.userId, action, note);
        return res.json(result);
    } catch (error: any) {
        return sendError(res, error);
    }
};

// ── GET /api/returns ──────────────────────────────────────────────────────────
export const getAdminReturns = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user || !user.roles?.includes('Admin')) {
            return res.status(403).json({ success: false, code: 'ADMIN_REQUIRED', message: 'Admin role required to view returns.' });
        }

        const page = req.query.page ? Number(req.query.page) : 1;
        const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;
        const status = req.query.status as string | undefined;

        const data = await listReturns({ page, pageSize, status });
        return res.json({ success: true, ...data });
    } catch (error: any) {
        return sendError(res, error);
    }
};

// ── GET /api/orders/:id/return ────────────────────────────────────────────────
export const getOrderReturn = async (req: AuthRequest, res: Response) => {
    try {
        const orderId = Number(req.params.id);
        if (!Number.isFinite(orderId) || orderId <= 0) {
            return res.status(400).json({ success: false, code: 'INVALID_ORDER_ID', message: 'Invalid order ID.' });
        }

        const data = await getReturnForOrder(orderId);
        return res.json({ success: true, data });
    } catch (error: any) {
        return sendError(res, error);
    }
};
