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

  it('renders canonical cancelled label for drifted canceled statuses', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [
        {
          orderId: 10,
          orderNumber: 'ORD-10',
          orderCode: 'OD20260010',
          status: ' canceled ',
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          totalAmount: '199000',
          itemCount: 1,
          createdAt: '2026-02-24T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đã hủy')).toBeInTheDocument();
    expect(screen.queryByText(' canceled ')).not.toBeInTheDocument();
  });

  it('renders canonical return requested label for drifted return-requested statuses', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [
        {
          orderId: 11,
          orderNumber: 'ORD-11',
          orderCode: 'OD20260011',
          status: ' return-requested ',
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          totalAmount: '299000',
          itemCount: 1,
          createdAt: '2026-02-24T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Yêu cầu trả hàng')).toBeInTheDocument();
    expect(screen.queryByText(' return-requested ')).not.toBeInTheDocument();
  });

  it('renders canonical delivered label for legacy completed statuses', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [
        {
          orderId: 12,
          orderNumber: 'ORD-12',
          orderCode: 'OD20260012',
          status: ' completed ',
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          totalAmount: '399000',
          itemCount: 1,
          createdAt: '2026-02-24T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đã giao hàng')).toBeInTheDocument();
    expect(screen.queryByText(' completed ')).not.toBeInTheDocument();
  });
});
