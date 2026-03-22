import type { Product } from '@/common/services/product.service';

export type ProfileAudience = 'male' | 'female' | 'unisex';

const FEMALE_PRODUCT_KEYWORDS = ['nu', 'nữ', 'women', 'female', 'girl', 'dress', 'skirt', 'blouse', 'legging', 'heel', 'vay', 'đầm', 'dam'];
const MALE_PRODUCT_KEYWORDS = ['nam', 'men', 'male', 'boy'];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasAnyKeyword = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(normalizeText(keyword)));

const detectAudienceFromCategory = (product: Product): ProfileAudience | 'neutral' | null => {
  const slug = normalizeText(product.category?.slug || '');
  const name = normalizeText(product.category?.name || '');

  if (slug.startsWith('nam-') || name.startsWith('nam ')) return 'male';
  if (slug.startsWith('nu-') || slug === 'vay-dam' || name.startsWith('nu ') || name.includes('vay') || name.includes('dam')) return 'female';
  if (slug === 'phu-kien' || slug === 'giay-dep' || name.includes('phu kien') || name.includes('giay')) return 'neutral';

  return null;
};

export const detectProductAudience = (product: Product): ProfileAudience | 'neutral' => {
  const fromCategory = detectAudienceFromCategory(product);
  if (fromCategory) return fromCategory;

  const searchBlob = normalizeText([
    product.name,
    product.description || '',
    product.category?.name || '',
    product.category?.slug || '',
    product.brand?.name || '',
  ].join(' '));

  const isMaleProduct = hasAnyKeyword(searchBlob, MALE_PRODUCT_KEYWORDS);
  const isFemaleProduct = hasAnyKeyword(searchBlob, FEMALE_PRODUCT_KEYWORDS);

  if (isMaleProduct && !isFemaleProduct) return 'male';
  if (isFemaleProduct && !isMaleProduct) return 'female';

  return 'neutral';
};

export const matchesProfileAudience = (product: Product, audience: ProfileAudience | null) => {
  if (!audience || audience === 'unisex') return true;
  const productAudience = detectProductAudience(product);
  return productAudience === audience || productAudience === 'neutral';
};
