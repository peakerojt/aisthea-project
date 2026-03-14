import { Request, Response } from 'express';
import {
    getAllRoles,
    getAllPermissions,
    getPermissionsList,
    updateRolePermissions,
} from '../services/permission.service';
import { logger } from '../lib/logger';

/** GET /api/roles — list all roles with assigned permissionIds */
export const listRoles = async (req: Request, res: Response) => {
    try {
        const roles = await getAllRoles();
        const result = roles.map((r) => ({
            roleId: r.roleId,
            roleName: r.roleName,
            isProtected: r.roleName === 'Super Admin',
            permissionIds: r.rolePermissions.map((rp) => rp.permissionId),
        }));
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error('[roleController] listRoles failed', { error });
        res.status(500).json({ success: false, code: 'FETCH_ROLES_FAILED', message: 'Failed to fetch roles.' });
    }
};

/** GET /api/permissions — all permissions grouped by module */
export const listPermissionsGrouped = async (req: Request, res: Response) => {
    try {
        const grouped = await getAllPermissions();
        res.json({ success: true, data: grouped });
    } catch (error) {
        logger.error('[roleController] listPermissionsGrouped failed', { error });
        res.status(500).json({ success: false, code: 'FETCH_PERMISSIONS_FAILED', message: 'Failed to fetch permissions.' });
    }
};

/** GET /api/permissions/list — flat list of all permissions */
export const listPermissionsFlat = async (req: Request, res: Response) => {
    try {
        const list = await getPermissionsList();
        res.json({ success: true, data: list });
    } catch (error) {
        logger.error('[roleController] listPermissionsFlat failed', { error });
        res.status(500).json({ success: false, code: 'FETCH_PERMISSIONS_FAILED', message: 'Failed to fetch permissions.' });
    }
};

/**
 * PUT /api/roles/:id/permissions — assign a new set of permissions to a role
 * Body: { permissionIds: number[] }
 */
export const setRolePermissions = async (req: Request, res: Response) => {
    try {
        const roleId = parseInt(String(req.params.id), 10);

        if (isNaN(roleId)) {
            return res.status(400).json({ success: false, code: 'INVALID_ROLE_ID', message: 'Invalid role ID.' });
        }

        const { permissionIds } = req.body;
        if (!Array.isArray(permissionIds)) {
            return res.status(400).json({ success: false, code: 'INVALID_PERMISSION_IDS', message: 'permissionIds must be an array of numbers.' });
        }

        const result = await updateRolePermissions(roleId, permissionIds);
        res.json({ success: true, code: 'PERMISSIONS_UPDATED', message: 'Role permissions updated successfully.', data: result });
    } catch (error: any) {
        if (error.message === 'SUPER_ADMIN_PROTECTED') {
            return res.status(403).json({
                success: false,
                code: 'SUPER_ADMIN_PROTECTED',
                message: 'Cannot modify permissions of the Super Admin role.',
            });
        }
        if (error.message === 'Role not found') {
            return res.status(404).json({ success: false, code: 'ROLE_NOT_FOUND', message: 'Role not found.' });
        }
        logger.error('[roleController] setRolePermissions failed', { error });
        res.status(500).json({ success: false, code: 'UPDATE_PERMISSIONS_FAILED', message: 'Failed to update role permissions.' });
    }
};
