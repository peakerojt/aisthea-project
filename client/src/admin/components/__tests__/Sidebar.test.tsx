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
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows only the returns entry for support users and preloads it', () => {
    render(<Sidebar />);

    expect(screen.getByText('Hoàn trả')).toBeInTheDocument();
    expect(screen.queryByText('sidebar:nav.dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('sidebar:nav.products')).not.toBeInTheDocument();
    expect(screen.queryByText('sidebar:nav.orders')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(preloadAdminRouteMock).toHaveBeenCalledWith('/admin/returns');
  });
});
