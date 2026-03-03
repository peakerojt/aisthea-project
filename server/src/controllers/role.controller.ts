import { Request, Response } from 'express';
import {
    getAllRoles,
    getAllPermissions,
    getPermissionsList,
    updateRolePermissions,
} from '../services/permission.service';

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
        console.error('listRoles error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách vai trò.' });
    }
};

/** GET /api/permissions — all permissions grouped by module */
export const listPermissionsGrouped = async (req: Request, res: Response) => {
    try {
        const grouped = await getAllPermissions();
        res.json({ success: true, data: grouped });
    } catch (error) {
        console.error('listPermissionsGrouped error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách quyền hạn.' });
    }
};

/** GET /api/permissions/list — flat list of all permissions */
export const listPermissionsFlat = async (req: Request, res: Response) => {
    try {
        const list = await getPermissionsList();
        res.json({ success: true, data: list });
    } catch (error) {
        console.error('listPermissionsFlat error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách quyền hạn.' });
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
            return res.status(400).json({ success: false, message: 'roleId không hợp lệ.' });
        }

        const { permissionIds } = req.body;
        if (!Array.isArray(permissionIds)) {
            return res.status(400).json({ success: false, message: 'permissionIds phải là một mảng số.' });
        }

        const result = await updateRolePermissions(roleId, permissionIds);
        res.json({ success: true, message: 'Cập nhật quyền hạn thành công!', data: result });
    } catch (error: any) {
        if (error.message === 'SUPER_ADMIN_PROTECTED') {
            return res.status(403).json({
                success: false,
                message: 'Không thể sửa đổi quyền hạn của vai trò Super Admin.',
                code: 'SUPER_ADMIN_PROTECTED',
            });
        }
        if (error.message === 'Role not found') {
            return res.status(404).json({ success: false, message: 'Vai trò không tồn tại.' });
        }
        console.error('setRolePermissions error:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật quyền hạn.' });
    }
};
