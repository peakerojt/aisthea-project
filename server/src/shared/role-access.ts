export type RoleCarrier =
  | {
      role?: string | null;
      roles?: Array<string | null | undefined> | null;
    }
  | string[]
  | null
  | undefined;

export const SUPPORT_ACCESS_ROLES = ['admin', 'support'] as const;
export const RETURN_REQUEST_CREATOR_ROLES = ['customer', ...SUPPORT_ACCESS_ROLES] as const;
export const RETURN_REQUEST_ADMIN_LIST_ROLES = [...SUPPORT_ACCESS_ROLES] as const;
export const RETURN_REQUEST_REVIEW_ROLES = [...SUPPORT_ACCESS_ROLES] as const;
export const RETURN_REQUEST_WAREHOUSE_ROLES = [...SUPPORT_ACCESS_ROLES] as const;
export const RETURN_REQUEST_FINANCE_ROLES = ['admin'] as const;

const normalizeRoleList = (roles: Array<string | null | undefined>): string[] =>
  roles
    .map((role) => String(role ?? '').trim().toLowerCase())
    .filter(Boolean);

export const normalizeRoles = (carrier: RoleCarrier): string[] => {
  if (Array.isArray(carrier)) {
    const normalized = normalizeRoleList(carrier);
    return normalized.length ? normalized : ['customer'];
  }

  const normalized = normalizeRoleList(carrier?.roles ?? []);
  if (normalized.length) {
    return normalized;
  }

  const fallbackRole = String(carrier?.role ?? '').trim().toLowerCase();
  return [fallbackRole || 'customer'];
};

export const hasAnyRole = (carrier: RoleCarrier, allowed: readonly string[]): boolean => {
  const roles = normalizeRoles(carrier);
  const normalizedAllowed = normalizeRoleList([...allowed]);
  return roles.some((role) => normalizedAllowed.includes(role));
};

export const hasSupportAccess = (carrier: RoleCarrier): boolean =>
  hasAnyRole(carrier, [...SUPPORT_ACCESS_ROLES]);
