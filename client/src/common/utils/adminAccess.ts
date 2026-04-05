const ADMIN_ROLES = new Set(['admin', 'super admin']);
const SUPPORT_ROLES = new Set(['support', 'staff']);
const SUPPORT_ADMIN_PATHS = new Set(['/admin/returns']);

export type AdminBusinessRole = 'guest' | 'customer' | 'staff' | 'admin';
export type AdminWorkflowAccess = {
  rawRoles: string[];
  businessRole: AdminBusinessRole;
  canManageReturnWorkflow: boolean;
  canManageRefundWorkflow: boolean;
  canAccessAdminShell: boolean;
};

const normalizeRole = (role: string) => role.trim().toLowerCase();

export const normalizeRoles = (roles?: string[] | null) =>
  [...new Set((roles ?? []).map(normalizeRole).filter(Boolean))];

export const resolveAdminWorkflowAccess = (roles?: string[] | null): AdminWorkflowAccess => {
  const rawRoles = normalizeRoles(roles);

  let businessRole: AdminBusinessRole = 'guest';
  if (rawRoles.some((role) => ADMIN_ROLES.has(role))) {
    businessRole = 'admin';
  } else if (rawRoles.some((role) => SUPPORT_ROLES.has(role))) {
    businessRole = 'staff';
  } else if (rawRoles.includes('customer')) {
    businessRole = 'customer';
  }

  const canManageReturnWorkflow = businessRole === 'staff' || businessRole === 'admin';
  const canManageRefundWorkflow = businessRole === 'admin';

  return {
    rawRoles,
    businessRole,
    canManageReturnWorkflow,
    canManageRefundWorkflow,
    canAccessAdminShell: canManageReturnWorkflow,
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

export const hasAdminShellAccess = (roles?: string[] | null) =>
  resolveAdminWorkflowAccess(roles).canAccessAdminShell;

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
