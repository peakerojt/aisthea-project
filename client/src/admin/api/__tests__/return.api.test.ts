import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.unmock('@/admin/api/return.api');
vi.unmock('@/admin/api/returns.api');

let legacyApiModule: typeof import('@/admin/api/return.api');
let canonicalApiModule: typeof import('@/admin/api/returns.api');

describe('return.api compatibility', () => {
  beforeAll(async () => {
    legacyApiModule = await import('@/admin/api/return.api');
    canonicalApiModule = await import('@/admin/api/returns.api');
  });

  it('re-exports the canonical admin return api from the legacy path', () => {
    expect(legacyApiModule.adminReturnApi).toBe(canonicalApiModule.adminReturnApi);
  });
});
