import { Router } from 'express';
import { listRoles, listPermissionsGrouped, listPermissionsFlat, setRolePermissions } from '../controllers/role.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication (admin only in production)
router.use(authenticateToken);

/** GET /api/roles — list all roles with their permissionIds */
router.get('/', listRoles);

/** PUT /api/roles/:id/permissions — replace permissions for a role */
router.put('/:id/permissions', setRolePermissions);

export default router;
