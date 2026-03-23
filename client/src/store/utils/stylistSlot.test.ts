import { describe, expect, it } from 'vitest';
import type { Product } from '@/common/services/product.service';
import { detectProductSlotFromCategory } from './stylistSlot';

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

describe('stylistSlot', () => {
  it('maps menswear pants categories to the bottom slot', () => {
    const product = createProduct({
      categoryId: 2,
      category: {
        categoryId: 2,
        name: 'Nam - Quần',
        slug: 'nam-quan',
      },
    });

    expect(detectProductSlotFromCategory(product)).toBe('bottom');
  });

  it('maps accessory categories to accessories even when the product name contains "quàng"', () => {
    const product = createProduct({
      categoryId: 7,
      name: 'Khăn quàng cổ Casual',
      category: {
        categoryId: 7,
        name: 'Phụ kiện',
        slug: 'phu-kien',
      },
    });

    expect(detectProductSlotFromCategory(product)).toBe('accessories');
  });

  it('maps shoe categories to the shoes slot', () => {
    const product = createProduct({
      categoryId: 8,
      category: {
        categoryId: 8,
        name: 'Giày dép',
        slug: 'giay-dep',
      },
    });

    expect(detectProductSlotFromCategory(product)).toBe('shoes');
  });
});
