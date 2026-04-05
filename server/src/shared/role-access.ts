export type RoleCarrier =
  | {
      role?: string | null;
      roles?: Array<string | null | undefined> | null;
    }
  | string[]
  | null
  | undefined;

export type WorkflowBusinessRole =
  | 'guest'
  | 'customer'
  | 'staff'
  | 'admin'
  | 'unknown';

export type WorkflowAccess = {
  rawRoles: string[];
  businessRole: WorkflowBusinessRole;
  canCreateReturnRequest: boolean;
  canManageReturnWorkflow: boolean;
  canManageRefundWorkflow: boolean;
};

export const RETURN_STAFF_ROLES = ['admin', 'support', 'staff'] as const;
export const RETURN_ADMIN_ROLES = ['admin'] as const;

export const CAN_CREATE_RETURN_REQUESTS = ['customer', ...RETURN_STAFF_ROLES] as const;
export const CAN_VIEW_RETURNS = [...RETURN_STAFF_ROLES] as const;
export const CAN_REVIEW_RETURNS = [...RETURN_STAFF_ROLES] as const;
export const CAN_PROCESS_RETURN_LOGISTICS = [...RETURN_STAFF_ROLES] as const;
export const CAN_ACCEPT_FOR_REFUND = [...RETURN_STAFF_ROLES] as const;
export const CAN_VIEW_REFUND_DETAILS = [...RETURN_ADMIN_ROLES] as const;
export const CAN_UPDATE_REFUND_STATUS = [...RETURN_ADMIN_ROLES] as const;
export const CAN_EXECUTE_REFUND = [...RETURN_ADMIN_ROLES] as const;
export const CAN_COMPLETE_REFUND = [...RETURN_ADMIN_ROLES] as const;
export const CAN_SEND_REFUND_BANK_REMINDER = [...RETURN_ADMIN_ROLES] as const;

// Backward-compatible aliases for older imports while the codebase is migrated
export const SUPPORT_ACCESS_ROLES = RETURN_STAFF_ROLES;
export const RETURN_REQUEST_CREATOR_ROLES = CAN_CREATE_RETURN_REQUESTS;
export const RETURN_REQUEST_ADMIN_LIST_ROLES = CAN_VIEW_RETURNS;
export const RETURN_REQUEST_REVIEW_ROLES = CAN_REVIEW_RETURNS;
export const RETURN_REQUEST_WAREHOUSE_ROLES = CAN_PROCESS_RETURN_LOGISTICS;
export const RETURN_REQUEST_FINANCE_ROLES = CAN_COMPLETE_REFUND;

const ADMIN_COMPATIBILITY_ROLES = new Set(['admin', 'super admin']);
const STAFF_COMPATIBILITY_ROLES = new Set(['support', 'staff']);

const normalizeRoleList = (roles: Array<string | null | undefined>): string[] =>
  [...new Set(
    roles
      .map((role) => String(role ?? '').trim().toLowerCase())
      .filter(Boolean),
  )];

const extractNormalizedRawRoles = (carrier: RoleCarrier): string[] => {
  if (Array.isArray(carrier)) {
    return normalizeRoleList(carrier);
  }

  return normalizeRoleList([
    ...(carrier?.roles ?? []),
    typeof carrier?.role === 'string' ? carrier.role : null,
  ]);
};

export const resolveWorkflowAccess = (carrier: RoleCarrier): WorkflowAccess => {
  const rawRoles = extractNormalizedRawRoles(carrier);

  let businessRole: WorkflowBusinessRole = 'guest';
  if (rawRoles.some((role) => ADMIN_COMPATIBILITY_ROLES.has(role))) {
    businessRole = 'admin';
  } else if (rawRoles.some((role) => STAFF_COMPATIBILITY_ROLES.has(role))) {
    businessRole = 'staff';
  } else if (rawRoles.includes('customer')) {
    businessRole = 'customer';
  } else if (rawRoles.length > 0) {
    businessRole = 'unknown';
  }

  const canManageReturnWorkflow = businessRole === 'staff' || businessRole === 'admin';
  const canManageRefundWorkflow = businessRole === 'admin';

  return {
    rawRoles,
    businessRole,
    canCreateReturnRequest: businessRole === 'customer' || canManageReturnWorkflow,
    canManageReturnWorkflow,
    canManageRefundWorkflow,
  };
};

export const hasReturnWorkflowAccess = (carrier: RoleCarrier): boolean =>
  resolveWorkflowAccess(carrier).canManageReturnWorkflow;

export const hasRefundWorkflowAccess = (carrier: RoleCarrier): boolean =>
  resolveWorkflowAccess(carrier).canManageRefundWorkflow;

export const hasReturnRequestCreateAccess = (carrier: RoleCarrier): boolean =>
  resolveWorkflowAccess(carrier).canCreateReturnRequest;

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
  hasReturnWorkflowAccess(carrier);
