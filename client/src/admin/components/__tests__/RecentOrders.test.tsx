import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const i18nMode = vi.hoisted(() => ({ rawKeys: false }));

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        if (i18nMode.rawKeys) {
          return key;
        }

        const translations: Record<string, string> = {
          'recentOrders.title': 'Đơn hàng gần đây',
          'recentOrders.viewAll': 'Xem tất cả',
          'recentOrders.empty': 'Chưa có đơn hàng nào',
          'orders:table.orderId': 'Mã đơn',
          'orders:table.customer': 'Khách hàng',
          'orders:table.total': 'Tổng tiền',
          'orders:table.status': 'Trạng thái',
          'orders:table.date': 'Ngày đặt',
          'orders:status.PENDING': 'Chờ xác nhận',
          'orders:status.DELIVERED': 'Đã giao hàng',
          'orders:status.CANCELLED': 'Đã hủy',
          'orders:status.RETURN_REQUESTED': 'Yêu cầu trả hàng',
          'orders:status.other': 'Khác',
        };

        return translations[key] ?? String(options?.defaultValue ?? key);
      },
    }),
  };
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

import { RecentOrders } from '@/admin/components/RecentOrders';

describe('RecentOrders', () => {
  afterEach(() => {
    i18nMode.rawKeys = false;
    cleanup();
  });

  it('renders translated status labels for recent orders', () => {
    render(
      <RecentOrders
        isLoading={false}
        orders={[
          {
            orderId: 1,
            orderNumber: 'OD-001',
            customerName: 'Nguyen Van A',
            userFullName: 'Nguyen Van A',
            totalAmount: 250000,
            status: 'RETURN_REQUESTED',
            createdAt: '2026-03-25T10:00:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('Đơn hàng gần đây')).toBeInTheDocument();
    expect(screen.getAllByText('Yêu cầu trả hàng').length).toBeGreaterThan(0);
    expect(screen.getByText('#OD-001')).toBeInTheDocument();
  });

  it('normalizes hyphenated return requested statuses before rendering labels', () => {
    render(
      <RecentOrders
        isLoading={false}
        orders={[
          {
            orderId: 3,
            orderNumber: 'OD-003',
            customerName: 'Le Thi C',
            userFullName: 'Le Thi C',
            totalAmount: 450000,
            status: 'return-requested',
            createdAt: '2026-03-25T10:00:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getAllByText('Yêu cầu trả hàng').length).toBeGreaterThan(0);
  });

  it('normalizes canceled aliases before rendering labels', () => {
    render(
      <RecentOrders
        isLoading={false}
        orders={[
          {
            orderId: 4,
            orderNumber: 'OD-004',
            customerName: 'Pham Thi D',
            userFullName: 'Pham Thi D',
            totalAmount: 150000,
            status: ' canceled ',
            createdAt: '2026-03-25T10:00:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('Đã hủy')).toBeInTheDocument();
  });

  it('normalizes completed aliases before rendering delivered labels', () => {
    render(
      <RecentOrders
        isLoading={false}
        orders={[
          {
            orderId: 5,
            orderNumber: 'OD-005',
            customerName: 'Hoang Van E',
            userFullName: 'Hoang Van E',
            totalAmount: 550000,
            status: ' completed ',
            createdAt: '2026-03-25T10:00:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('Đã giao hàng')).toBeInTheDocument();
    expect(screen.getByText('Đã giao hàng')).toHaveClass('bg-emerald-500/10', 'border-emerald-500/30');
  });

  it('keeps dashboard chrome and return labels readable when translations return raw keys', () => {
    i18nMode.rawKeys = true;

    render(
      <RecentOrders
        isLoading={false}
        orders={[
          {
            orderId: 2,
            orderNumber: 'OD-002',
            customerName: 'Tran Thi B',
            userFullName: 'Tran Thi B',
            totalAmount: 350000,
            status: 'RETURN_REQUESTED',
            createdAt: '2026-03-25T10:00:00.000Z',
          },
        ]}
      />,
    );

    expect(screen.getByText('Đơn hàng gần đây')).toBeInTheDocument();
    expect(screen.getByText('Mã đơn')).toBeInTheDocument();
    expect(screen.getAllByText('Yêu cầu trả hàng').length).toBeGreaterThan(0);
  });

  it('renders translated empty state and keeps view-all navigation', async () => {
    render(<RecentOrders isLoading={false} orders={[]} />);

    expect(screen.getByText('Chưa có đơn hàng nào')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /xem tất cả/i }));

    expect(navigateMock).toHaveBeenCalledWith('/admin/orders');
  });
});
