import {
  getAdminRoutePermissionCodes,
  normalizeAdminPath,
  STAFF_ADMIN_LANDING_PATHS,
} from '@/common/utils/adminRoutePermissions';

const ADMIN_ROLES = new Set(['admin', 'super admin']);
const SUPPORT_ROLES = new Set(['support', 'staff']);

export type AdminBusinessRole = 'guest' | 'customer' | 'staff' | 'admin';
export type AdminWorkflowAccess = {
  rawRoles: string[];
  businessRole: AdminBusinessRole;
  canManageReturnWorkflow: boolean;
  canManageRefundWorkflow: boolean;
  canAccessAdminShell: boolean;
};

const normalizeRole = (role: string) => role.trim().toLowerCase();
const normalizePermissionCode = (permissionCode: string) => permissionCode.trim().toUpperCase();

export const normalizeRoles = (roles?: string[] | null) =>
  [...new Set((roles ?? []).map(normalizeRole).filter(Boolean))];

export const normalizePermissionCodes = (permissionCodes?: string[] | null) =>
  [...new Set((permissionCodes ?? []).map(normalizePermissionCode).filter(Boolean))];

const hasAnyPermission = (permissionCodes: string[], requiredCodes: string[]) =>
  requiredCodes.some((requiredCode) => permissionCodes.includes(requiredCode));

const canAccessMappedStaffAdminPath = (path: string, permissionCodes: string[]) => {
  const requiredPermissionCodes = getAdminRoutePermissionCodes(path);
  if (requiredPermissionCodes.length === 0) {
    return false;
  }

  return hasAnyPermission(permissionCodes, requiredPermissionCodes);
};

const getFirstAccessibleStaffAdminPath = (permissionCodes: string[]) =>
  STAFF_ADMIN_LANDING_PATHS.find((path) => canAccessMappedStaffAdminPath(path, permissionCodes)) ?? null;

export const resolveAdminWorkflowAccess = (
  roles?: string[] | null,
  permissions?: string[] | null,
): AdminWorkflowAccess => {
  const rawRoles = normalizeRoles(roles);
  const permissionCodes = normalizePermissionCodes(permissions);

  let businessRole: AdminBusinessRole = 'guest';
  if (rawRoles.some((role) => ADMIN_ROLES.has(role))) {
    businessRole = 'admin';
  } else if (rawRoles.some((role) => SUPPORT_ROLES.has(role))) {
    businessRole = 'staff';
  } else if (rawRoles.includes('customer')) {
    businessRole = 'customer';
  }

  const canManageReturnWorkflow =
    businessRole === 'admin' ||
    (businessRole === 'staff' && permissionCodes.includes('MANAGE_RETURNS'));
  const canManageRefundWorkflow = businessRole === 'admin';
  const canAccessAdminShell =
    businessRole === 'admin' ||
    (businessRole === 'staff' && getFirstAccessibleStaffAdminPath(permissionCodes) !== null);

  return {
    rawRoles,
    businessRole,
    canManageReturnWorkflow,
    canManageRefundWorkflow,
    canAccessAdminShell,
  };
};

export const hasFullAdminAccess = (roles?: string[] | null) =>
  resolveAdminWorkflowAccess(roles).businessRole === 'admin';

export const hasSupportAdminAccess = (roles?: string[] | null) =>
  resolveAdminWorkflowAccess(roles).businessRole === 'staff';

export const resolveAdminBusinessRole = (roles?: string[] | null): AdminBusinessRole =>
  resolveAdminWorkflowAccess(roles).businessRole;

export const canManageReturnWorkflow = (role: AdminBusinessRole) =>
  role === 'staff' || role === 'admin';

export const canManageRefundWorkflow = (role: AdminBusinessRole) =>
  role === 'admin';

export const hasAdminShellAccess = (roles?: string[] | null, permissions?: string[] | null) =>
  resolveAdminWorkflowAccess(roles, permissions).canAccessAdminShell;

export const getAdminLandingPath = (roles?: string[] | null, permissions?: string[] | null) => {
  if (hasFullAdminAccess(roles)) {
    return '/admin';
  }

  if (!hasSupportAdminAccess(roles)) {
    return '/';
  }

  const permissionCodes = normalizePermissionCodes(permissions);
  const firstAccessiblePath = getFirstAccessibleStaffAdminPath(permissionCodes);
  if (firstAccessiblePath) {
    return firstAccessiblePath;
  }

  return '/';
};

export const canAccessAdminPath = (
  path: string,
  roles?: string[] | null,
  permissions?: string[] | null,
) => {
  if (hasFullAdminAccess(roles)) {
    return true;
  }

  if (!hasSupportAdminAccess(roles)) {
    return false;
  }

  const permissionCodes = normalizePermissionCodes(permissions);
  return canAccessMappedStaffAdminPath(path, permissionCodes);
};
