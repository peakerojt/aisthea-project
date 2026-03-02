import { api } from '../utils/api';

export interface RoleItem {
    roleId: number;
    roleName: string;
    isProtected: boolean;
    permissionIds: number[];
}

export interface PermissionItem {
    permissionId: number;
    code: string;
    module: string;
    description: string;
}

export const roleService = {
    /** GET /api/roles — all roles with assigned permissionIds */
    async getRoles(): Promise<RoleItem[]> {
        const res = await api.get<{ success: boolean; data: RoleItem[] }>('/api/roles');
        return (res as any).data;
    },

    /** GET /api/permissions/list — flat list of all permissions */
    async getPermissions(): Promise<PermissionItem[]> {
        const res = await api.get<{ success: boolean; data: PermissionItem[] }>('/api/permissions/list');
        return (res as any).data;
    },

    /** PUT /api/roles/:id/permissions — replace permissions for a role */
    async updateRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
        await api.put(`/api/roles/${roleId}/permissions`, { permissionIds });
    },
};
