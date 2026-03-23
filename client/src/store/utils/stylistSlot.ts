import type { Product } from '@/common/services/product.service';

export type OutfitSlotKey = 'top' | 'bottom' | 'shoes' | 'accessories';

const TOP_CATEGORY_IDS = new Set([1, 3, 4]);
const BOTTOM_CATEGORY_IDS = new Set([2, 5, 6]);
const ACCESSORY_CATEGORY_IDS = new Set([7]);
const SHOE_CATEGORY_IDS = new Set([8]);

const normalizeText = (value?: string | null) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

export const detectProductSlotFromCategory = (product: Product): OutfitSlotKey | null => {
  if (TOP_CATEGORY_IDS.has(product.categoryId)) return 'top';
  if (BOTTOM_CATEGORY_IDS.has(product.categoryId)) return 'bottom';
  if (ACCESSORY_CATEGORY_IDS.has(product.categoryId)) return 'accessories';
  if (SHOE_CATEGORY_IDS.has(product.categoryId)) return 'shoes';

  const slug = normalizeText(product.category?.slug);
  const name = normalizeText(product.category?.name);

  if (['nam-ao', 'nam-ao-khoac', 'nu-ao'].includes(slug) || ['nam - ao', 'nam - ao khoac', 'nu - ao'].includes(name)) {
    return 'top';
  }

  if (['nam-quan', 'nu-quan', 'vay-dam'].includes(slug) || ['nam - quan', 'nu - quan'].includes(name) || name.includes('vay') || name.includes('dam')) {
    return 'bottom';
  }

  if (slug === 'phu-kien' || name.includes('phu kien')) {
    return 'accessories';
  }

  if (slug === 'giay-dep' || name.includes('giay')) {
    return 'shoes';
  }

  return null;
};
