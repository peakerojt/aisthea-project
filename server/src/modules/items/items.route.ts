import { Router } from 'express';
import { ItemsController } from './items.controller';

const router = Router();
const ctrl = new ItemsController();

/** GET /api/items — list all items sorted by sortOrder */
router.get('/', ctrl.getItems);

/** PATCH /api/items/reorder — move one item to a new position */
router.patch('/reorder', ctrl.reorder);

export default router;
