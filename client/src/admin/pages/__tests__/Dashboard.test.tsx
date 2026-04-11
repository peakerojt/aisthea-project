import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchDashboardSummaryMock = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'range.today': 'Hôm nay',
        'range.week': 'Tuần này',
        'range.month': 'Tháng này',
        'range.year': 'Năm này',
        'page.label': 'Admin portal',
        'page.title': 'Tổng quan kinh doanh',
        'toast.newOrderTitle': 'Đơn hàng mới',
        'toast.newOrderMessage': 'Có đơn hàng mới',
      };

      return translations[key] ?? key;
    },
  }),
}));

vi.mock('@/common/services/dashboard.service', () => ({
  fetchDashboardSummary: (...args: unknown[]) => fetchDashboardSummaryMock(...args),
}));

vi.mock('@/admin/hooks/useAdminSocket', () => ({
  useAdminSocket: () => undefined,
}));

vi.mock('@/admin/components/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell">Bell</div>,
}));

vi.mock('@/admin/components/DashboardCards', () => ({
  DashboardCards: ({ isLoading }: { isLoading: boolean }) => <div>cards:{String(isLoading)}</div>,
}));

vi.mock('@/admin/components/RevenueChart', () => ({
  RevenueChart: ({ range, isLoading }: { range: string; isLoading: boolean }) => (
    <div>
      chart:{range}:{String(isLoading)}
    </div>
  ),
}));

vi.mock('@/admin/components/TopProducts', () => ({
  TopProducts: ({ isLoading }: { isLoading: boolean }) => <div>top-products:{String(isLoading)}</div>,
}));

vi.mock('@/admin/components/RecentOrders', () => ({
  RecentOrders: ({ isLoading }: { isLoading: boolean }) => <div>recent-orders:{String(isLoading)}</div>,
}));

import { Dashboard } from '@/admin/pages/Dashboard';

const baseSummary = {
  kpis: {
    totalRevenue: 1000000,
    totalOrders: 5,
    totalCustomers: 3,
    lowStockCount: 1,
  },
  revenueChart: [],
  topProducts: [],
  recentOrders: [],
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    fetchDashboardSummaryMock.mockResolvedValue(baseSummary);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the shared refresh badge mounted and only toggles its state during range changes', async () => {
    let resolveWeekRequest: ((value: typeof baseSummary) => void) | null = null;

    fetchDashboardSummaryMock
      .mockResolvedValueOnce(baseSummary)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveWeekRequest = resolve as (value: typeof baseSummary) => void;
          }),
      );

    const { container } = render(<Dashboard />);

    const refreshBadge = container.querySelector('[data-admin-refresh-badge="true"]');
    expect(refreshBadge).toBeInTheDocument();
    expect(refreshBadge).toHaveAttribute('data-refreshing', 'false');
    expect(container.querySelector('[data-dashboard-refresh-rail="true"]')).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(120);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchDashboardSummaryMock).toHaveBeenCalledWith('month');

    fireEvent.click(screen.getByRole('button', { name: 'Tuần này' }));

    await act(async () => {
      vi.advanceTimersByTime(120);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchDashboardSummaryMock).toHaveBeenCalledWith('week');

    expect(refreshBadge).toHaveAttribute('data-refreshing', 'true');

    await act(async () => {
      resolveWeekRequest?.(baseSummary);
      await Promise.resolve();
    });

    expect(refreshBadge).toHaveAttribute('data-refreshing', 'false');
  });
});
