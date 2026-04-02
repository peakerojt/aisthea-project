import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.unmock('@/admin/services/return-review.service');

let adminReturnReviewService: typeof import('@/admin/services/return-review.service').adminReturnReviewService;
let adminReturnRuntimeService: typeof import('@/admin/services/returns.command').adminReturnRuntimeService;

describe('adminReturnReviewService compatibility', () => {
  beforeAll(async () => {
    ({ adminReturnReviewService } = await import('@/admin/services/return-review.service'));
    ({ adminReturnRuntimeService } = await import('@/admin/services/returns.command'));
  });

  it('keeps the legacy review service path as a direct compatibility alias', () => {
    expect(adminReturnReviewService).toBe(adminReturnRuntimeService);
  });
});
