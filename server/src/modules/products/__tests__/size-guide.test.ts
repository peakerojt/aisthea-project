import {
  listSizeGuideTemplates,
  resolveProductSizeGuide,
} from '../size-guide';

describe('product size guide resolver', () => {
  it('returns the configured template when product metadata is present', () => {
    const guide = resolveProductSizeGuide({
      sizeGuideTemplateKey: 'tops-oversized',
      fitType: 'oversized',
      fitNote: 'Form rộng, thích gọn hơn có thể giảm 1 size.',
      modelHeightCm: 172,
      modelWeightKg: 52,
      modelWearSize: 'M',
      category: { name: 'Áo khoác', slug: 'ao-khoac' },
    });

    expect(guide).not.toBeNull();
    expect(guide?.templateKey).toBe('tops-oversized');
    expect(guide?.category).toBe('tops');
    expect(guide?.fitType).toBe('oversized');
    expect(guide?.fitNote).toBe('Form rộng, thích gọn hơn có thể giảm 1 size.');
    expect(guide?.modelInfo).toEqual({
      heightCm: 172,
      weightKg: 52,
      wearSize: 'M',
    });
    expect(guide?.columns).toEqual(['Size', 'Vai', 'Ngực', 'Dài áo', 'Tay áo']);
    expect(guide?.summary).toContain('Bảng size Áo / Blazer / Coat Oversized.');
    expect(guide?.summary).toContain('Fit oversized.');
  });

  it('infers a shoe template from category metadata', () => {
    const guide = resolveProductSizeGuide({
      category: { name: 'Giày da', slug: 'giay-da' },
    });

    expect(guide).not.toBeNull();
    expect(guide?.templateKey).toBe('shoes-standard');
    expect(guide?.category).toBe('shoes');
    expect(guide?.columns).toEqual(['Size', 'Chiều dài bàn chân', 'EU', 'VN']);
  });

  it('exposes templates for admin selection', () => {
    const templates = listSizeGuideTemplates();

    expect(templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'tops-regular', category: 'tops' }),
        expect.objectContaining({ key: 'dresses-regular', category: 'dresses' }),
        expect.objectContaining({ key: 'pants-regular', category: 'pants' }),
        expect.objectContaining({ key: 'shoes-standard', category: 'shoes' }),
        expect.objectContaining({ key: 'accessories-standard', category: 'accessories' }),
      ]),
    );
  });
});
