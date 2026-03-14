import { Request, Response } from 'express';
import { ItemsService, ServiceError } from './items.service';
import { itemsRepository } from './items.repository';
import { reorderSchema } from './items.validator';

const service = new ItemsService(itemsRepository);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok = (res: Response, data: unknown, status = 200) =>
    res.status(status).json({ success: true, data, message: 'OK' });

const fail = (res: Response, code: string, message: string, status = 400) =>
    res.status(status).json({ success: false, data: null, message, error: { code } });

// ─── Controller ───────────────────────────────────────────────────────────────

export class ItemsController {
    /** GET /api/items */
    getItems = async (_req: Request, res: Response): Promise<void> => {
        try {
            const items = await service.getItems();
            ok(res, items);
        } catch (err: any) {
            if (err instanceof ServiceError) fail(res, err.code, err.message, err.status);
            else fail(res, 'INTERNAL_ERROR', err.message || 'Unexpected error', 500);
        }
    };

    /** PATCH /api/items/reorder */
    reorder = async (req: Request, res: Response): Promise<void> => {
        try {
            const parsed = reorderSchema.safeParse(req.body);
            if (!parsed.success) {
                fail(res, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Validation failed', 400);
                return;
            }

            const items = await service.reorderItem(parsed.data);
            ok(res, items);
        } catch (err: any) {
            if (err instanceof ServiceError) fail(res, err.code, err.message, err.status);
            else fail(res, 'INTERNAL_ERROR', err.message || 'Unexpected error', 500);
        }
    };
}
