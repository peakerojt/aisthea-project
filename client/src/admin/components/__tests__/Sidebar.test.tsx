import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const logoutMock = vi.fn();
const useAuthMock = vi.fn();
const navigateMock = vi.fn();
const preloadAdminRouteMock = vi.fn();

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/common/components/Logo', () => ({
  Logo: () => <div>logo</div>,
}));

vi.mock('@/app/routes/adminRoutes', () => ({
  preloadAdminRoute: (...args: unknown[]) => preloadAdminRouteMock(...args),
}));

vi.mock('react-router-dom', () => ({
  NavLink: ({
    children,
    to,
  }: {
    children: React.ReactNode | ((state: { isActive: boolean }) => React.ReactNode);
    to: string;
  }) => (
    <a href={to}>
      {typeof children === 'function' ? children({ isActive: false }) : children}
    </a>
  ),
  useNavigate: () => navigateMock,
}));

import { Sidebar } from '@/admin/components/Sidebar';

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useAuthMock.mockReturnValue({
      logout: logoutMock,
      user: {
        name: 'Support User',
        roles: ['Support'],
        permissions: [],
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows no admin entries for support users without explicit admin route permissions', () => {
    render(<Sidebar />);

    expect(screen.queryByText('Hoàn trả')).not.toBeInTheDocument();
    expect(screen.queryByText('sidebar:nav.dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('sidebar:nav.products')).not.toBeInTheDocument();
    expect(screen.queryByText('sidebar:nav.orders')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(preloadAdminRouteMock).not.toHaveBeenCalled();
  });

  it('matches sidebar visibility to explicit staff route permissions', () => {
    useAuthMock.mockReturnValue({
      logout: logoutMock,
      user: {
        name: 'Support User',
        roles: ['Support'],
        permissions: ['VIEW_ORDER', 'VIEW_NOTIFICATION_QUEUE'],
      },
    });

    render(<Sidebar />);

    expect(screen.getByText('sidebar:nav.orders')).toBeInTheDocument();
    expect(screen.getByText('sidebar:nav.notifications')).toBeInTheDocument();
    expect(screen.queryByText('Hoàn trả')).not.toBeInTheDocument();
    expect(screen.queryByText('sidebar:nav.products')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(preloadAdminRouteMock).toHaveBeenCalledWith('/admin/orders');
  });

  it('shows the notification queue entry only when the explicit notification permission exists', () => {
    useAuthMock.mockReturnValue({
      logout: logoutMock,
      user: {
        name: 'Support User',
        roles: ['Support'],
        permissions: ['VIEW_NOTIFICATION_QUEUE'],
      },
    });

    render(<Sidebar />);

    expect(screen.getByText('sidebar:nav.notifications')).toBeInTheDocument();
    expect(screen.queryByText('sidebar:nav.orders')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(preloadAdminRouteMock).toHaveBeenCalledWith('/admin/notifications');
  });

  it('shows the returns entry only when an explicit returns permission exists', () => {
    useAuthMock.mockReturnValue({
      logout: logoutMock,
      user: {
        name: 'Support User',
        roles: ['Support'],
        permissions: ['VIEW_RETURNS'],
      },
    });

    render(<Sidebar />);

    expect(screen.getByText('Hoàn trả')).toBeInTheDocument();
    expect(screen.queryByText('sidebar:nav.orders')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(preloadAdminRouteMock).toHaveBeenCalledWith('/admin/returns');
  });
});
