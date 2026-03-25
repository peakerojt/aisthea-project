import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MyOrders } from '@/store/pages/MyOrders';

const getMyOrders = vi.fn();

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'customer' }),
}));

vi.mock('@/store/components/Header', () => ({
  Header: () => <div data-testid="store-header" />,
}));

vi.mock('@/common/components/PaymentStatusBadge', () => ({
  PaymentStatusBadge: () => <div data-testid="payment-badge" />,
}));

vi.mock('@/common/services/order.service', async () => {
  const actual = await vi.importActual<any>('@/common/services/order.service');
  return {
    ...actual,
    orderService: {
      ...actual.orderService,
      getMyOrders: (...args: any[]) => getMyOrders(...args),
    },
  };
});

describe('MyOrders', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders translated empty-state chrome', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đơn hàng của tôi')).toBeInTheDocument();
    expect(screen.getByText('Xem lịch sử và chi tiết đơn hàng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tra cứu đơn hàng' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quay lại tài khoản' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Làm mới' })).toBeInTheDocument();
    expect(screen.getByText('Không tìm thấy đơn hàng.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bắt đầu mua sắm' })).toBeInTheDocument();
  });
});
