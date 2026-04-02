import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.unmock('@/admin/utils/adminReturn.utils');
vi.unmock('@/admin/utils/returns.utils');

let legacyUtils: typeof import('@/admin/utils/adminReturn.utils');
let canonicalUtils: typeof import('@/admin/utils/returns.utils');

describe('adminReturn.utils compatibility', () => {
  beforeAll(async () => {
    legacyUtils = await import('@/admin/utils/adminReturn.utils');
    canonicalUtils = await import('@/admin/utils/returns.utils');
  });

  it('re-exports canonical admin return utilities from the legacy path', () => {
    expect(legacyUtils.getAdminReturnStatusLabel).toBe(canonicalUtils.getAdminReturnStatusLabel);
    expect(legacyUtils.getAdminRefundStatusLabel).toBe(canonicalUtils.getAdminRefundStatusLabel);
    expect(legacyUtils.formatAdminReturnDateTime).toBe(canonicalUtils.formatAdminReturnDateTime);
  });
});
