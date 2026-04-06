import { Request, Response } from 'express';
import {
  getAllRoles,
  getAllPermissions,
  getPermissionsList,
  updateRolePermissions,
} from '../services/permission.service';
import { logger } from '../lib/logger';
import { getRoleCatalogMetadata } from '../shared/role-catalog';

export const listRoles = async (_req: Request, res: Response) => {
  try {
    const roles = await getAllRoles();
    const result = roles.map((role) => ({
      roleId: role.roleId,
      roleName: role.roleName,
      ...getRoleCatalogMetadata(role.roleName),
      permissionIds: role.rolePermissions.map((permission) => permission.permissionId),
    }));
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[roleController] listRoles failed', { error });
    res.status(500).json({ success: false, code: 'FETCH_ROLES_FAILED' });
  }
};

export const listPermissionsGrouped = async (_req: Request, res: Response) => {
  try {
    const grouped = await getAllPermissions();
    res.json({ success: true, data: grouped });
  } catch (error) {
    logger.error('[roleController] listPermissionsGrouped failed', { error });
    res.status(500).json({ success: false, code: 'FETCH_PERMISSIONS_FAILED' });
  }
};

export const listPermissionsFlat = async (_req: Request, res: Response) => {
  try {
    const list = await getPermissionsList();
    res.json({ success: true, data: list });
  } catch (error) {
    logger.error('[roleController] listPermissionsFlat failed', { error });
    res.status(500).json({ success: false, code: 'FETCH_PERMISSIONS_FAILED' });
  }
};

export const setRolePermissions = async (req: Request, res: Response) => {
  try {
    const roleId = parseInt(String(req.params.id), 10);

    if (isNaN(roleId)) {
      return res.status(400).json({ success: false, code: 'INVALID_ROLE_ID' });
    }

    const { permissionIds } = req.body;
    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ success: false, code: 'INVALID_PERMISSION_IDS' });
    }

    const result = await updateRolePermissions(roleId, permissionIds);
    res.json({ success: true, code: 'PERMISSIONS_UPDATED', data: result });
  } catch (error: any) {
    if (error.message === 'SUPER_ADMIN_PROTECTED') {
      return res.status(403).json({
        success: false,
        code: 'SUPER_ADMIN_PROTECTED',
      });
    }
    if (error.message === 'ROLE_NOT_FOUND') {
      return res.status(404).json({ success: false, code: 'ROLE_NOT_FOUND' });
    }
    logger.error('[roleController] setRolePermissions failed', { error });
    res.status(500).json({ success: false, code: 'UPDATE_PERMISSIONS_FAILED' });
  }
};
