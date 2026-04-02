const ADMIN_ROLES = new Set(['admin', 'super admin']);
const SUPPORT_ROLES = new Set(['support']);
const SUPPORT_ADMIN_PATHS = new Set(['/admin/returns']);

const normalizeRole = (role: string) => role.trim().toLowerCase();

const normalizeRoles = (roles?: string[] | null) => (roles ?? []).map(normalizeRole);

export const hasFullAdminAccess = (roles?: string[] | null) =>
  normalizeRoles(roles).some((role) => ADMIN_ROLES.has(role));

export const hasSupportAdminAccess = (roles?: string[] | null) =>
  normalizeRoles(roles).some((role) => SUPPORT_ROLES.has(role));

export const hasAdminShellAccess = (roles?: string[] | null) =>
  hasFullAdminAccess(roles) || hasSupportAdminAccess(roles);

export const getAdminLandingPath = (roles?: string[] | null) =>
  hasFullAdminAccess(roles) ? '/admin' : '/admin/returns';

export const canAccessAdminPath = (path: string, roles?: string[] | null) => {
  if (hasFullAdminAccess(roles)) {
    return true;
  }

  if (!hasSupportAdminAccess(roles)) {
    return false;
  }

  return SUPPORT_ADMIN_PATHS.has(path);
};
