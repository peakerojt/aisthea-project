import {
  hasAnyRole,
  hasSupportAccess,
  normalizeRoles,
  RETURN_REQUEST_ADMIN_LIST_ROLES,
  RETURN_REQUEST_CREATOR_ROLES,
  RETURN_REQUEST_FINANCE_ROLES,
  RETURN_REQUEST_REVIEW_ROLES,
  RETURN_REQUEST_WAREHOUSE_ROLES,
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
    expect(hasAnyRole({ roles: ['Customer'] }, ['admin', 'support'])).toBe(false);
  });

  it('detects support access from either roles array or single role fallback', () => {
    expect(hasSupportAccess({ roles: ['Admin'] })).toBe(true);
    expect(hasSupportAccess({ role: 'support' })).toBe(true);
    expect(hasSupportAccess({ roles: ['Customer'] })).toBe(false);
  });

  it('exports normalized shared role sets for return access', () => {
    expect(SUPPORT_ACCESS_ROLES).toEqual(['admin', 'support']);
    expect(RETURN_REQUEST_CREATOR_ROLES).toEqual(['customer', 'admin', 'support']);
    expect(RETURN_REQUEST_ADMIN_LIST_ROLES).toEqual(['admin', 'support']);
    expect(RETURN_REQUEST_REVIEW_ROLES).toEqual(['admin', 'support']);
    expect(RETURN_REQUEST_WAREHOUSE_ROLES).toEqual(['admin', 'support']);
    expect(RETURN_REQUEST_FINANCE_ROLES).toEqual(['admin']);
  });
});
