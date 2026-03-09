/**
 * return.routes.ts
 * Mounts all Return & Refund (Hoàn trả & Hoàn tiền) endpoints.
 *
 * Order-scoped routes are also imported and re-exported via app.ts so they
 * mount under /api/orders/:id/return.
 */

import { Router } from 'express';
import { Response } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
    getAdminReturns,
    patchProcessReturn,
} from '../controllers/return.controller';
import { prisma } from '../utils/prisma';

const router = Router();

// ── Customer-facing routes ────────────────────────────────────────────────────
// GET  /api/returns/my    → paginated list of MY return requests
router.get('/my', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.max(1, Number(req.query.limit || 10));
        const skip = (page - 1) * limit;

        const [returns, total] = await Promise.all([
            (prisma.orderReturn.findMany as any)({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    order: { select: { orderNumber: true, totalAmount: true } },
                },
            }),
            (prisma.orderReturn.count as any)({ where: { userId } }),
        ]);

        return res.json({
            success: true,
            data: {
                returns: returns.map((r: any) => ({
                    ...r,
                    proofImages: (() => { try { return JSON.parse(r.proofImages); } catch { return []; } })(),
                })),
                pagination: {
                    page,
                    pageSize: limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (err: any) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// GET  /api/returns/:id   → return detail (customer owns it OR admin)
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const returnId = Number(req.params.id);
        if (!Number.isFinite(returnId) || returnId <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid return ID' });
        }
        const ret = await (prisma.orderReturn.findUnique as any)({
            where: { returnId },
            include: {
                order: { select: { orderNumber: true, totalAmount: true, customerName: true, customerPhone: true } },
                user: { select: { userId: true, fullName: true, email: true, avatarUrl: true } },
            },
        });
        if (!ret) return res.status(404).json({ success: false, message: 'Return not found' });

        // Ownership check: customers can only view their own returns
        const roles: string[] = req.user?.roles ?? [];
        const isAdmin = roles.some((r: string) => r.toLowerCase() === 'admin' || r.toLowerCase() === 'support');
        if (!isAdmin && ret.userId !== req.user?.userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        return res.json({
            success: true,
            data: {
                ...ret,
                proofImages: (() => { try { return JSON.parse(ret.proofImages); } catch { return []; } })(),
            },
        });
    } catch (err: any) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ── Admin-only routes ─────────────────────────────────────────────────────────
// GET  /api/returns         → paginated list of ALL return requests
router.get('/', authenticateToken, getAdminReturns);

// PATCH /api/returns/:id/process → Admin approve / reject / complete refund
router.patch('/:id/process', authenticateToken, patchProcessReturn);

export default router;
