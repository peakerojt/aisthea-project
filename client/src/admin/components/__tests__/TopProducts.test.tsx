import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        const translations: Record<string, string> = {
          'topProducts.title': 'Sản phẩm bán chạy nhất',
          'topProducts.subtitle': 'Top 5 trong kỳ',
          'topProducts.empty': 'Chưa có dữ liệu',
        };

        if (key === 'topProducts.soldCount') {
          return `${String(options?.count ?? '0')} đã bán`;
        }

        return translations[key] ?? key;
      },
    }),
  };
});

import { TopProducts } from '@/admin/components/TopProducts';

describe('TopProducts', () => {
  it('renders translated header and sold count', () => {
    render(
      <TopProducts
        isLoading={false}
        products={[
          {
            productId: 1,
            name: 'Ao so mi',
            totalSold: 12,
            imageUrl: null,
          },
        ]}
      />,
    );

    expect(screen.getByText('Sản phẩm bán chạy nhất')).toBeInTheDocument();
    expect(screen.getByText('Top 5 trong kỳ')).toBeInTheDocument();
    expect(screen.getByText('12 đã bán')).toBeInTheDocument();
  });

  it('renders translated empty state', () => {
    render(<TopProducts isLoading={false} products={[]} />);

    expect(screen.getByText('Chưa có dữ liệu')).toBeInTheDocument();
  });
});
