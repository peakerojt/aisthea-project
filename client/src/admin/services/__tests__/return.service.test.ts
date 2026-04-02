import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.unmock('@/admin/services');
vi.unmock('@/admin/services/return.service');

let canonicalServices: typeof import('@/admin/services');
let legacyServices: typeof import('@/admin/services/return.service');

describe('admin services legacy barrel compatibility', () => {
  beforeAll(async () => {
    canonicalServices = await import('@/admin/services');
    legacyServices = await import('@/admin/services/return.service');
  });

  it('re-exports the canonical admin service boundary from the legacy barrel path', () => {
    expect(legacyServices.adminReturnReadService).toBe(canonicalServices.adminReturnReadService);
    expect(legacyServices.adminReturnRuntimeService).toBe(canonicalServices.adminReturnRuntimeService);
    expect(legacyServices.adminReturnReviewService).toBe(canonicalServices.adminReturnReviewService);
  });
});
