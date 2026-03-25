import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { ReturnItemsTable } from '@/common/components/ReturnItemsTable';

describe('ReturnItemsTable', () => {
  beforeEach(() => {
    cleanup();
  });

  it('uses readable fallbacks when return translations are unavailable', () => {
    render(
      <ReturnItemsTable
        items={[
          {
            orderItemId: 24,
            quantity: 2,
            unitPrice: 125000,
            reason: 'DEFECTIVE',
          },
        ]}
      />,
    );

    expect(screen.getByText('Sản phẩm')).toBeInTheDocument();
    expect(screen.getByText('SL trả')).toBeInTheDocument();
    expect(screen.getByText('Đơn giá')).toBeInTheDocument();
    expect(screen.getByText('Thành tiền')).toBeInTheDocument();
    expect(screen.getByText('Lý do')).toBeInTheDocument();
    expect(screen.getByText('Sản phẩm #24')).toBeInTheDocument();
    expect(screen.getByText('DEFECTIVE')).toBeInTheDocument();
    expect(screen.getByText('Tổng hoàn dự kiến:')).toBeInTheDocument();
  });
});
