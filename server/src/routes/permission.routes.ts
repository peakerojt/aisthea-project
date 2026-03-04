import { Router } from 'express';
import { listPermissionsGrouped, listPermissionsFlat } from '../controllers/role.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

/** GET /api/permissions — all permissions grouped by module */
router.get('/', listPermissionsGrouped);

/** GET /api/permissions/list — flat list */
router.get('/list', listPermissionsFlat);

export default router;
