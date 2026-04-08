import React from 'react';
import { render, screen } from '@testing-library/react';

import ProductVariantSelector from '@/common/components/ProductVariantSelector';
import type { ProductVariant } from '@/common/services/product.service';

const buildVariant = (
  variantId: number,
  sku: string,
  attributes: Array<{ attributeName: string; attributeValue: string }>,
): ProductVariant => ({
  variantId,
  productId: 1,
  sku,
  price: 100000,
  stockQuantity: 10,
  isDefault: variantId === 1,
  attributes,
});

describe('ProductVariantSelector size guide CTA', () => {
  it('shows the size-guide CTA only for a real size axis', () => {
    render(
      <ProductVariantSelector
        variants={[
          buildVariant(1, 'SKU-RED-S', [
            { attributeName: 'Màu sắc', attributeValue: 'Đỏ' },
            { attributeName: 'Kích thước', attributeValue: 'S' },
          ]),
          buildVariant(2, 'SKU-RED-M', [
            { attributeName: 'Màu sắc', attributeValue: 'Đỏ' },
            { attributeName: 'Kích thước', attributeValue: 'M' },
          ]),
        ]}
        basePrice={100000}
        sizeGuide={{
          available: true,
          templateKey: 'tops-regular',
          templateName: 'Áo / Blazer / Coat',
          category: 'tops',
          fitType: 'regular',
          fitNote: 'Form chuẩn.',
          unit: 'cm',
          columns: ['Size', 'Vai'],
          rows: [{ Size: 'S', Vai: 42 }],
          howToMeasure: [],
          modelInfo: { heightCm: 172, weightKg: 52, wearSize: 'M' },
          summary: 'Bảng size Áo / Blazer / Coat.',
        }}
        onVariantChange={() => {}}
        onAddToCart={() => {}}
      />,
    );

    expect(screen.getAllByText('variantSelector.viewSizeGuide')).toHaveLength(2);
  });

  it('does not show the size-guide CTA for non-size text attributes', () => {
    render(
      <ProductVariantSelector
        variants={[
          buildVariant(1, 'SKU-COTTON-RED', [
            { attributeName: 'Màu sắc', attributeValue: 'Đỏ' },
            { attributeName: 'Chất liệu', attributeValue: 'Cotton' },
          ]),
          buildVariant(2, 'SKU-SILK-BLACK', [
            { attributeName: 'Màu sắc', attributeValue: 'Đen' },
            { attributeName: 'Chất liệu', attributeValue: 'Silk' },
          ]),
        ]}
        basePrice={100000}
        onVariantChange={() => {}}
        onAddToCart={() => {}}
      />,
    );

    expect(screen.queryByText('variantSelector.viewSizeGuide')).not.toBeInTheDocument();
  });
});
