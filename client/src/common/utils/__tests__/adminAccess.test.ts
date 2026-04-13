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
    expect(hasAdminShellAccess(['Support'])).toBe(false);
    expect(hasAdminShellAccess(['Staff'])).toBe(false);
    expect(hasAdminShellAccess(['Support'], ['VIEW_RETURNS'])).toBe(true);
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
      canManageReturnWorkflow: false,
      canManageRefundWorkflow: false,
      canAccessAdminShell: false,
    });
    expect(resolveAdminWorkflowAccess(['Support'], ['VIEW_RETURNS'])).toEqual({
      rawRoles: ['support'],
      businessRole: 'staff',
      canManageReturnWorkflow: false,
      canManageRefundWorkflow: false,
      canAccessAdminShell: true,
    });
    expect(resolveAdminWorkflowAccess(['Support'], ['MANAGE_RETURNS'])).toEqual({
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
    expect(getAdminLandingPath(['Support'])).toBe('/');
    expect(getAdminLandingPath(['Staff'])).toBe('/');
    expect(getAdminLandingPath(['Admin'])).toBe('/admin');
    expect(getAdminLandingPath(['Support'], ['VIEW_RETURNS'])).toBe('/admin/returns');
    expect(getAdminLandingPath(['Support'], ['VIEW_ORDER'])).toBe('/admin/orders');
    expect(getAdminLandingPath(['Support'], ['REFUND_BENEFIT_VIEW'])).toBe('/');
    expect(getAdminLandingPath(['Customer'])).toBe('/');
  });

  it('requires explicit returns permissions for staff returns access', () => {
    expect(canAccessAdminPath('/admin/returns', ['Support'])).toBe(false);
    expect(canAccessAdminPath('/admin/returns', ['Staff'])).toBe(false);
    expect(canAccessAdminPath('/admin/orders', ['Support'])).toBe(false);
    expect(canAccessAdminPath('/admin/orders', ['Staff'])).toBe(false);
    expect(canAccessAdminPath('/admin/orders/:id', ['Support'])).toBe(false);
    expect(canAccessAdminPath('/admin/returns', ['Support'], ['VIEW_ORDER'])).toBe(false);
    expect(canAccessAdminPath('/admin/returns', ['Support'], ['VIEW_RETURNS'])).toBe(true);
    expect(canAccessAdminPath('/admin/returns', ['Support'], ['MANAGE_RETURNS'])).toBe(true);
  });

  it('uses assigned permission codes to resolve staff route access', () => {
    expect(canAccessAdminPath('/admin/returns', ['Support'], ['VIEW_RETURNS'])).toBe(true);
    expect(canAccessAdminPath('/admin/returns', ['Support'], ['MANAGE_RETURNS'])).toBe(true);
    expect(canAccessAdminPath('/admin/orders', ['Support'], ['VIEW_ORDER'])).toBe(true);
    expect(canAccessAdminPath('/admin/orders/:id', ['Support'], ['VIEW_ORDER'])).toBe(true);
    expect(canAccessAdminPath('/admin/customers', ['Support'], ['VIEW_CUSTOMER'])).toBe(true);
    expect(canAccessAdminPath('/admin/restock', ['Support'], ['VIEW_INVENTORY'])).toBe(true);
    expect(canAccessAdminPath('/admin/restock', ['Support'], ['EDIT_INVENTORY'])).toBe(true);
    expect(canAccessAdminPath('/admin/coupons', ['Support'], ['MANAGE_COUPON'])).toBe(true);
    expect(canAccessAdminPath('/admin/coupons', ['Support'], ['REFUND_BENEFIT_VIEW'])).toBe(false);
    expect(hasAdminShellAccess(['Support'], ['CUSTOMER_BANK_ACCOUNT_MANAGE'])).toBe(false);
    expect(hasAdminShellAccess(['Support'], ['RETURN_REFUND_FINANCE_VIEW'])).toBe(false);
    expect(hasAdminShellAccess(['Support'], ['RETURN_REFUND_FINANCE_COMPLETE'])).toBe(false);
    expect(canAccessAdminPath('/admin/analytics', ['Support'], ['VIEW_REVENUE'])).toBe(true);
    expect(canAccessAdminPath('/admin/products', ['Support'], ['VIEW_PRODUCT'])).toBe(true);
    expect(canAccessAdminPath('/admin/products/create', ['Support'], ['CREATE_PRODUCT'])).toBe(true);
    expect(canAccessAdminPath('/admin/products/12/edit', ['Support'], ['EDIT_PRODUCT'])).toBe(true);
    expect(canAccessAdminPath('/admin/categories', ['Support'], ['EDIT_PRODUCT'])).toBe(true);
    expect(canAccessAdminPath('/admin/roles', ['Support'], ['MANAGE_RETURNS'])).toBe(false);
    expect(canAccessAdminPath('/admin/products', ['Admin'])).toBe(true);
  });
});
