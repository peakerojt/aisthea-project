export const SYSTEM_ROLE_NAMES = {
  CUSTOMER: 'Customer',
  ADMIN: 'Admin',
  SUPPORT: 'Support',
  SUPER_ADMIN: 'Super Admin',
} as const;

export const CANONICAL_ROLE_CATALOG = [
  SYSTEM_ROLE_NAMES.CUSTOMER,
  SYSTEM_ROLE_NAMES.ADMIN,
  SYSTEM_ROLE_NAMES.SUPPORT,
  SYSTEM_ROLE_NAMES.SUPER_ADMIN,
] as const;

const ROLE_DISPLAY_NAME_MAP: Record<string, string> = {
  [SYSTEM_ROLE_NAMES.CUSTOMER]: 'Customer',
  [SYSTEM_ROLE_NAMES.ADMIN]: 'Admin',
  [SYSTEM_ROLE_NAMES.SUPPORT]: 'Staff',
  Staff: 'Staff',
  [SYSTEM_ROLE_NAMES.SUPER_ADMIN]: SYSTEM_ROLE_NAMES.SUPER_ADMIN,
};

const PROTECTED_ROLE_NAMES = new Set<string>([SYSTEM_ROLE_NAMES.SUPER_ADMIN]);
const ASSIGNABLE_ROLE_NAMES = new Set<string>([
  SYSTEM_ROLE_NAMES.CUSTOMER,
  SYSTEM_ROLE_NAMES.ADMIN,
  SYSTEM_ROLE_NAMES.SUPPORT,
]);

export const getRoleDisplayName = (roleName: string): string =>
  ROLE_DISPLAY_NAME_MAP[roleName] ?? roleName;

export const isProtectedRoleName = (roleName: string): boolean =>
  PROTECTED_ROLE_NAMES.has(roleName);

export const isAssignableRoleName = (roleName: string): boolean =>
  ASSIGNABLE_ROLE_NAMES.has(roleName);

export const getRoleCatalogMetadata = (roleName: string) => ({
  displayName: getRoleDisplayName(roleName),
  isProtected: isProtectedRoleName(roleName),
  assignable: isAssignableRoleName(roleName),
});
