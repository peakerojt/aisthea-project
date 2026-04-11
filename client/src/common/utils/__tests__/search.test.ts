import { describe, expect, it } from 'vitest';

import { matchesSearchQuery, normalizeSearchText } from '@/common/utils/search';

describe('search utils', () => {
  it('normalizes vietnamese diacritics for search', () => {
    expect(normalizeSearchText('Áo Sơ Mi Nam')).toBe('ao so mi nam');
  });

  it('matches a conversational query against normalized product text', () => {
    expect(
      matchesSearchQuery('áo sơ mi cho nam', ['Áo sơ mi nam', 'Nam - Áo', 'cotton basic shirt']),
    ).toBe(true);
  });

  it('matches tokens across multiple candidate fields', () => {
    expect(
      matchesSearchQuery('so mi nam', ['Oxford Shirt', 'Nam - Áo', 'áo sơ mi trắng']),
    ).toBe(true);
  });

  it('returns false when the meaningful tokens are absent', () => {
    expect(
      matchesSearchQuery('áo sơ mi nam', ['Váy dự tiệc nữ', 'Women Dresses', 'lụa mềm']),
    ).toBe(false);
  });
});
