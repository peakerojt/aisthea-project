import { describe, expect, it } from 'vitest';
import {
  canAccessAdminPath,
  getAdminLandingPath,
  hasAdminShellAccess,
  hasFullAdminAccess,
  hasSupportAdminAccess,
} from '@/common/utils/adminAccess';

describe('adminAccess', () => {
  it('recognizes admin and support shell access separately', () => {
    expect(hasFullAdminAccess(['Admin'])).toBe(true);
    expect(hasSupportAdminAccess(['Support'])).toBe(true);
    expect(hasAdminShellAccess(['Support'])).toBe(true);
    expect(hasAdminShellAccess(['Customer'])).toBe(false);
  });

  it('routes support users to the returns landing page', () => {
    expect(getAdminLandingPath(['Support'])).toBe('/admin/returns');
    expect(getAdminLandingPath(['Admin'])).toBe('/admin');
  });

  it('restricts support access to the returns route only', () => {
    expect(canAccessAdminPath('/admin/returns', ['Support'])).toBe(true);
    expect(canAccessAdminPath('/admin/orders', ['Support'])).toBe(false);
    expect(canAccessAdminPath('/admin/orders/:id', ['Support'])).toBe(false);
    expect(canAccessAdminPath('/admin/products', ['Admin'])).toBe(true);
  });
});
