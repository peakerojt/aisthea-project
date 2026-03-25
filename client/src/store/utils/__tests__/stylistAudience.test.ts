import { describe, expect, it } from 'vitest';
import type { Product } from '@/common/services/product.service';
import { detectProductAudience, matchesProfileAudience } from '../stylistAudience';

const createProduct = (overrides: Partial<Product>): Product => ({
  productId: 1,
  categoryId: 1,
  name: 'Test product',
  slug: 'test-product',
  basePrice: 100000,
  status: 'Active',
  createdAt: '2026-03-22T00:00:00.000Z',
  ...overrides,
});

describe('stylistAudience', () => {
  it('detects menswear from category metadata first', () => {
    const product = createProduct({
      category: {
        categoryId: 1,
        name: 'Nam - Áo',
        slug: 'nam-ao',
      },
    });

    expect(detectProductAudience(product)).toBe('male');
    expect(matchesProfileAudience(product, 'male')).toBe(true);
    expect(matchesProfileAudience(product, 'female')).toBe(false);
  });

  it('detects womenswear from category metadata first', () => {
    const product = createProduct({
      category: {
        categoryId: 5,
        name: 'Váy & Đầm',
        slug: 'vay-dam',
      },
    });

    expect(detectProductAudience(product)).toBe('female');
    expect(matchesProfileAudience(product, 'female')).toBe(true);
    expect(matchesProfileAudience(product, 'male')).toBe(false);
  });

  it('keeps neutral accessory categories available for both audiences', () => {
    const product = createProduct({
      category: {
        categoryId: 7,
        name: 'Phụ kiện',
        slug: 'phu-kien',
      },
    });

    expect(detectProductAudience(product)).toBe('neutral');
    expect(matchesProfileAudience(product, 'female')).toBe(true);
    expect(matchesProfileAudience(product, 'male')).toBe(true);
  });
});
