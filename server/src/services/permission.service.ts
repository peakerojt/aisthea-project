import { prisma } from '../utils/prisma';
import { clearPermissionCache } from '../middlewares/auth.middleware';

// ─── Read Operations ─────────────────────────────────────────────────────────

/** Get all roles with their assigned permission IDs */
export const getAllRoles = async () => {
    return prisma.role.findMany({
        orderBy: { roleName: 'asc' },
        include: {
            rolePermissions: {
                select: { permissionId: true },
            },
        },
    });
};

/** Get all permissions grouped by module */
export const getAllPermissions = async () => {
    const permissions = await prisma.permission.findMany({
        orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });

    // Group by module
    const grouped: Record<string, typeof permissions> = {};
    for (const perm of permissions) {
        if (!grouped[perm.module]) grouped[perm.module] = [];
        grouped[perm.module].push(perm);
    }
    return grouped;
};

/** Get flat list of all permissions */
export const getPermissionsList = async () => {
    return prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
};

/** Get permission codes assigned to a specific role */
export const getRolePermissionCodes = async (roleId: number): Promise<string[]> => {
    const rps = await prisma.rolePermission.findMany({
        where: { roleId },
        include: { permission: { select: { code: true } } },
    });
    return rps.map((rp) => rp.permission.code);
};

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * Replace all permissions for a role atomically.
 * Clears the permission cache for ALL users with this role after update.
 */
export const updateRolePermissions = async (roleId: number, permissionIds: number[]) => {
    // Safety: never allow modifying Super Admin
    const role = await prisma.role.findUnique({ where: { roleId } });
    if (!role) throw new Error('ROLE_NOT_FOUND');
    if (role.roleName === 'Super Admin') {
        throw new Error('SUPER_ADMIN_PROTECTED');
    }

    // Atomic replace: delete all existing, then create new ones
    await prisma.$transaction([
        prisma.rolePermission.deleteMany({ where: { roleId } }),
        ...permissionIds.map((permissionId) =>
            prisma.rolePermission.create({ data: { roleId, permissionId } })
        ),
    ]);


    // Clear cache for all users with this role
    const affectedUsers = await prisma.userRole.findMany({
        where: { roleId },
        select: { userId: true },
    });
    for (const { userId } of affectedUsers) {
        clearPermissionCache(userId);
    }

    return { updated: permissionIds.length };
};
