import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderSuccess from '@/common/pages/OrderSuccess';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock('@/store/components/Header', () => ({
  Header: () => <div data-testid="store-header" />,
}));

vi.mock('@/common/components/CheckoutProgress', () => ({
  CheckoutProgress: ({ steps }: { steps: Array<{ label: string }> }) => (
    <div data-testid="checkout-progress">{steps.map((step) => step.label).join(' | ')}</div>
  ),
}));

vi.mock('@/common/components/OrderSummaryRail', () => ({
  OrderSummaryRail: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('@/common/utils/orderSnapshot', () => ({
  getLatestOrderData: () => null,
}));

describe('OrderSuccess', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders translated order-success chrome with fallback-safe labels', () => {
    render(
      <MemoryRouter>
        <OrderSuccess />
      </MemoryRouter>,
    );

    expect(screen.getByText('Bước 3 · Hoàn tất đơn hàng')).toBeInTheDocument();
    expect(screen.getByText('Xác nhận đơn hàng')).toBeInTheDocument();
    expect(screen.getByText('Cảm ơn bạn đã đặt hàng!')).toBeInTheDocument();
    expect(screen.getByText('Trạng thái')).toBeInTheDocument();
    expect(screen.getByText('Thông tin mua hàng')).toBeInTheDocument();
    expect(screen.getAllByText('Phương thức thanh toán')).not.toHaveLength(0);
    expect(screen.getByText('Địa chỉ nhận hàng')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng (0 sản phẩm)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem đơn hàng' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tiếp tục mua hàng' })).toBeInTheDocument();
  });
});
