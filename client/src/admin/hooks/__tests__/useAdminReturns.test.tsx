import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.unmock('@/admin/hooks/useAdminReturns');
vi.unmock('@/admin/hooks/useReturns');

let legacyHookModule: typeof import('@/admin/hooks/useAdminReturns');
let canonicalHookModule: typeof import('@/admin/hooks/useReturns');

describe('useAdminReturns compatibility', () => {
  beforeAll(async () => {
    legacyHookModule = await import('@/admin/hooks/useAdminReturns');
    canonicalHookModule = await import('@/admin/hooks/useReturns');
  });

  it('re-exports the canonical hook module from the legacy path', () => {
    expect(legacyHookModule.useAdminReturns).toBe(canonicalHookModule.useAdminReturns);
  });
});
