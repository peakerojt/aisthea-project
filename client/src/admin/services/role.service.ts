import { api } from '@/common/utils/api';

export interface RoleItem {
    roleId: number;
    roleName: string;
    displayName?: string;
    isProtected: boolean;
    assignable?: boolean;
    permissionIds: number[];
}

export interface PermissionItem {
    permissionId: number;
    code: string;
    module: string;
    description: string;
}

const normalizeRoleName = (roleName: string) => roleName.trim().toLowerCase();

const PERMISSION_MANAGEMENT_ROLE_ORDER: Record<string, number> = {
    admin: 0,
    support: 1,
    staff: 1,
    'super admin': 2,
};

export function getRoleDisplayValue(role: Pick<RoleItem, 'roleName' | 'displayName'>): string {
    return role.displayName?.trim() || role.roleName;
}

export function isPermissionManagementRole(role: Pick<RoleItem, 'roleName' | 'isProtected'>): boolean {
    const normalized = normalizeRoleName(role.roleName);
    return role.isProtected || normalized === 'admin' || normalized === 'support' || normalized === 'staff';
}

export function getPermissionManagementRoles(roles: RoleItem[]): RoleItem[] {
    return [...roles]
        .filter(isPermissionManagementRole)
        .sort((left, right) => {
            const leftOrder = PERMISSION_MANAGEMENT_ROLE_ORDER[normalizeRoleName(left.roleName)] ?? Number.MAX_SAFE_INTEGER;
            const rightOrder = PERMISSION_MANAGEMENT_ROLE_ORDER[normalizeRoleName(right.roleName)] ?? Number.MAX_SAFE_INTEGER;

            if (leftOrder !== rightOrder) {
                return leftOrder - rightOrder;
            }

            return left.roleId - right.roleId;
        });
}

export const roleService = {
    /** GET /api/roles — all roles with assigned permissionIds */
    async getRoles(): Promise<RoleItem[]> {
        const res = await api.get<{ success: boolean; data: RoleItem[] }>('/api/roles');
        return (res as { data: RoleItem[] }).data;
    },

    /** GET /api/permissions/list — flat list of all permissions */
    async getPermissions(): Promise<PermissionItem[]> {
        const res = await api.get<{ success: boolean; data: PermissionItem[] }>('/api/permissions/list');
        return (res as { data: PermissionItem[] }).data;
    },

    /** PUT /api/roles/:id/permissions — replace permissions for a role */
    async updateRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
        await api.put(`/api/roles/${roleId}/permissions`, { permissionIds });
    },
};
