import {
  CAN_ACCEPT_FOR_REFUND,
  CAN_COMPLETE_REFUND,
  CAN_CREATE_RETURN_REQUESTS,
  CAN_PROCESS_RETURN_LOGISTICS,
  CAN_REVIEW_RETURNS,
  CAN_VIEW_RETURNS,
  hasAnyRole,
  hasRefundWorkflowAccess,
  hasReturnRequestCreateAccess,
  hasReturnWorkflowAccess,
  hasSupportAccess,
  normalizeRoles,
  resolveWorkflowAccess,
  RETURN_ADMIN_ROLES,
  RETURN_REQUEST_ADMIN_LIST_ROLES,
  RETURN_REQUEST_CREATOR_ROLES,
  RETURN_REQUEST_FINANCE_ROLES,
  RETURN_REQUEST_REVIEW_ROLES,
  RETURN_REQUEST_WAREHOUSE_ROLES,
  RETURN_STAFF_ROLES,
  SUPPORT_ACCESS_ROLES,
} from '../role-access';

describe('shared role access helpers', () => {
  it('normalizes roles from a request-like user payload', () => {
    expect(
      normalizeRoles({
        roles: [' Admin ', 'Support'],
      }),
    ).toEqual(['admin', 'support']);
  });

  it('falls back to the single role and then customer when roles are missing', () => {
    expect(normalizeRoles({ role: ' Customer ' })).toEqual(['customer']);
    expect(normalizeRoles({})).toEqual(['customer']);
  });

  it('checks access against normalized allowed roles', () => {
    expect(hasAnyRole({ roles: ['Support'] }, ['admin', 'support'])).toBe(true);
    expect(hasAnyRole({ roles: ['Staff'] }, ['admin', 'support', 'staff'])).toBe(true);
    expect(hasAnyRole({ roles: ['Customer'] }, ['admin', 'support'])).toBe(false);
  });

  it('detects support access from either roles array or single role fallback', () => {
    expect(hasSupportAccess({ roles: ['Admin'] })).toBe(true);
    expect(hasSupportAccess({ role: 'support' })).toBe(true);
    expect(hasSupportAccess({ role: 'Staff' })).toBe(true);
    expect(hasSupportAccess({ roles: ['Customer'] })).toBe(false);
  });

  it('resolves workflow access through normalized business roles and capabilities', () => {
    expect(resolveWorkflowAccess({ roles: [' Admin ', 'Support'] })).toEqual({
      rawRoles: ['admin', 'support'],
      businessRole: 'admin',
      canCreateReturnRequest: true,
      canManageReturnWorkflow: true,
      canManageRefundWorkflow: true,
    });
    expect(resolveWorkflowAccess({ role: 'Staff' })).toEqual({
      rawRoles: ['staff'],
      businessRole: 'staff',
      canCreateReturnRequest: true,
      canManageReturnWorkflow: true,
      canManageRefundWorkflow: false,
    });
    expect(resolveWorkflowAccess({ role: 'Customer' })).toEqual({
      rawRoles: ['customer'],
      businessRole: 'customer',
      canCreateReturnRequest: true,
      canManageReturnWorkflow: false,
      canManageRefundWorkflow: false,
    });
    expect(resolveWorkflowAccess(undefined)).toEqual({
      rawRoles: [],
      businessRole: 'guest',
      canCreateReturnRequest: false,
      canManageReturnWorkflow: false,
      canManageRefundWorkflow: false,
    });
  });

  it('exposes centralized workflow capability predicates', () => {
    expect(hasReturnRequestCreateAccess({ role: 'Customer' })).toBe(true);
    expect(hasReturnWorkflowAccess({ role: 'Support' })).toBe(true);
    expect(hasReturnWorkflowAccess({ role: 'Staff' })).toBe(true);
    expect(hasRefundWorkflowAccess({ role: 'Admin' })).toBe(true);
    expect(hasRefundWorkflowAccess({ role: 'Support' })).toBe(false);
  });

  it('exports capability-based role groups for return workflow access', () => {
    expect(RETURN_STAFF_ROLES).toEqual(['admin', 'support', 'staff']);
    expect(RETURN_ADMIN_ROLES).toEqual(['admin']);
    expect(CAN_CREATE_RETURN_REQUESTS).toEqual(['customer', 'admin', 'support', 'staff']);
    expect(CAN_VIEW_RETURNS).toEqual(['admin', 'support', 'staff']);
    expect(CAN_REVIEW_RETURNS).toEqual(['admin', 'support', 'staff']);
    expect(CAN_PROCESS_RETURN_LOGISTICS).toEqual(['admin', 'support', 'staff']);
    expect(CAN_ACCEPT_FOR_REFUND).toEqual(['admin', 'support', 'staff']);
    expect(CAN_COMPLETE_REFUND).toEqual(['admin']);
  });

  it('keeps the older aliases mapped to the new capability groups', () => {
    expect(SUPPORT_ACCESS_ROLES).toEqual(RETURN_STAFF_ROLES);
    expect(RETURN_REQUEST_CREATOR_ROLES).toEqual(CAN_CREATE_RETURN_REQUESTS);
    expect(RETURN_REQUEST_ADMIN_LIST_ROLES).toEqual(CAN_VIEW_RETURNS);
    expect(RETURN_REQUEST_REVIEW_ROLES).toEqual(CAN_REVIEW_RETURNS);
    expect(RETURN_REQUEST_WAREHOUSE_ROLES).toEqual(CAN_PROCESS_RETURN_LOGISTICS);
    expect(RETURN_REQUEST_FINANCE_ROLES).toEqual(CAN_COMPLETE_REFUND);
  });
});
