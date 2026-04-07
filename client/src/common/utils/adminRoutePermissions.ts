const normalizeAdminPathValue = (path: string): string => {
  const withoutQuery = path.split(/[?#]/)[0] ?? '';
  const trimmed = withoutQuery.replace(/\/+$/, '');
  return trimmed || '/';
};

const ADMIN_ROUTE_PERMISSION_RULES = [
  {
    matches: (path: string) => path === '/admin/products',
    permissionCodes: ['VIEW_PRODUCT'],
  },
  {
    matches: (path: string) => path === '/admin/products/create',
    permissionCodes: ['CREATE_PRODUCT'],
  },
  {
    matches: (path: string) => path.startsWith('/admin/products/') && path.endsWith('/edit'),
    permissionCodes: ['EDIT_PRODUCT'],
  },
  {
    matches: (path: string) => path === '/admin/categories',
    permissionCodes: ['EDIT_PRODUCT'],
  },
  {
    matches: (path: string) => path === '/admin/orders',
    permissionCodes: ['VIEW_ORDER'],
  },
  {
    matches: (path: string) => path.startsWith('/admin/orders/'),
    permissionCodes: ['VIEW_ORDER'],
  },
  {
    matches: (path: string) => path === '/admin/returns',
    permissionCodes: ['VIEW_RETURNS', 'MANAGE_RETURNS'],
  },
  {
    matches: (path: string) => path === '/admin/customers',
    permissionCodes: ['VIEW_CUSTOMER'],
  },
  {
    matches: (path: string) => path === '/admin/analytics',
    permissionCodes: ['VIEW_REVENUE'],
  },
  {
    matches: (path: string) => path === '/admin/coupons',
    permissionCodes: ['MANAGE_COUPON', 'REFUND_BENEFIT_VIEW'],
  },
  {
    matches: (path: string) => path === '/admin/restock',
    permissionCodes: ['VIEW_INVENTORY', 'EDIT_INVENTORY'],
  },
  {
    matches: (path: string) => path === '/admin/tracking',
    permissionCodes: ['VIEW_ORDER'],
  },
  {
    matches: (path: string) => path === '/admin/notifications',
    permissionCodes: ['VIEW_ORDER'],
  },
] as const;

export const STAFF_ADMIN_LANDING_PATHS = [
  '/admin/returns',
  '/admin/orders',
  '/admin/notifications',
  '/admin/tracking',
  '/admin/products',
  '/admin/restock',
  '/admin/categories',
  '/admin/customers',
  '/admin/analytics',
  '/admin/coupons',
] as const;

export const STAFF_ADMIN_PERMISSION_CODES = [
  ...new Set(ADMIN_ROUTE_PERMISSION_RULES.flatMap((rule) => rule.permissionCodes)),
];

export const normalizeAdminPath = (path: string) => normalizeAdminPathValue(path);

export const getAdminRoutePermissionCodes = (path: string): string[] => {
  const normalizedPath = normalizeAdminPathValue(path);
  const matchedRule = ADMIN_ROUTE_PERMISSION_RULES.find((rule) => rule.matches(normalizedPath));
  return matchedRule ? [...matchedRule.permissionCodes] : [];
};
