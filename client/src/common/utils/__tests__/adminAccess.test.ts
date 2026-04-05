import { describe, expect, it } from 'vitest';
import {
  canAccessAdminPath,
  canManageRefundWorkflow,
  canManageReturnWorkflow,
  getAdminLandingPath,
  hasAdminShellAccess,
  hasFullAdminAccess,
  hasSupportAdminAccess,
  normalizeRoles,
  resolveAdminBusinessRole,
  resolveAdminWorkflowAccess,
} from '@/common/utils/adminAccess';

describe('adminAccess', () => {
  it('recognizes admin and support shell access separately', () => {
    expect(hasFullAdminAccess(['Admin'])).toBe(true);
    expect(hasSupportAdminAccess(['Support'])).toBe(true);
    expect(hasSupportAdminAccess(['Staff'])).toBe(true);
    expect(hasAdminShellAccess(['Support'])).toBe(true);
    expect(hasAdminShellAccess(['Staff'])).toBe(true);
    expect(hasAdminShellAccess(['Customer'])).toBe(false);
  });

  it('normalizes raw admin roles into business roles and workflow capabilities', () => {
    expect(normalizeRoles([' Admin ', 'Support '])).toEqual(['admin', 'support']);
    expect(resolveAdminBusinessRole(['Support'])).toBe('staff');
    expect(resolveAdminBusinessRole(['Staff'])).toBe('staff');
    expect(resolveAdminBusinessRole(['Admin'])).toBe('admin');
    expect(resolveAdminBusinessRole(['Customer'])).toBe('customer');
    expect(resolveAdminWorkflowAccess(['Support'])).toEqual({
      rawRoles: ['support'],
      businessRole: 'staff',
      canManageReturnWorkflow: true,
      canManageRefundWorkflow: false,
      canAccessAdminShell: true,
    });
    expect(resolveAdminWorkflowAccess(undefined)).toEqual({
      rawRoles: [],
      businessRole: 'guest',
      canManageReturnWorkflow: false,
      canManageRefundWorkflow: false,
      canAccessAdminShell: false,
    });
    expect(canManageReturnWorkflow('staff')).toBe(true);
    expect(canManageReturnWorkflow('admin')).toBe(true);
    expect(canManageReturnWorkflow('customer')).toBe(false);
    expect(canManageRefundWorkflow('admin')).toBe(true);
    expect(canManageRefundWorkflow('staff')).toBe(false);
  });

  it('routes support users to the returns landing page', () => {
    expect(getAdminLandingPath(['Support'])).toBe('/admin/returns');
    expect(getAdminLandingPath(['Staff'])).toBe('/admin/returns');
    expect(getAdminLandingPath(['Admin'])).toBe('/admin');
  });

  it('restricts support access to the returns route only', () => {
    expect(canAccessAdminPath('/admin/returns', ['Support'])).toBe(true);
    expect(canAccessAdminPath('/admin/returns', ['Staff'])).toBe(true);
    expect(canAccessAdminPath('/admin/orders', ['Support'])).toBe(false);
    expect(canAccessAdminPath('/admin/orders', ['Staff'])).toBe(false);
    expect(canAccessAdminPath('/admin/orders/:id', ['Support'])).toBe(false);
    expect(canAccessAdminPath('/admin/products', ['Admin'])).toBe(true);
  });
});
