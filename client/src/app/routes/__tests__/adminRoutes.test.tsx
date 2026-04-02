import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div>navigate:{to}</div>,
}));

import { adminRoutes } from '@/app/routes/adminRoutes';

describe('adminRoutes access gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects support users away from admin-only routes', () => {
    useAuthMock.mockReturnValue({
      isInitialized: true,
      user: { roles: ['Support'] },
    });

    const ordersRoute = adminRoutes.find((route) => route.path === '/admin/orders');
    expect(ordersRoute).toBeDefined();

    render(<>{ordersRoute?.element}</>);

    expect(screen.getByText('navigate:/admin/returns')).toBeInTheDocument();
  });

  it('redirects support users from the admin root to the returns landing page', () => {
    useAuthMock.mockReturnValue({
      isInitialized: true,
      user: { roles: ['Support'] },
    });

    const rootRoute = adminRoutes.find((route) => route.path === '/admin');
    expect(rootRoute).toBeDefined();

    render(<>{rootRoute?.element}</>);

    expect(screen.getByText('navigate:/admin/returns')).toBeInTheDocument();
  });

  it('allows support users to access the returns route', () => {
    useAuthMock.mockReturnValue({
      isInitialized: true,
      user: { roles: ['Support'] },
    });

    const returnsRoute = adminRoutes.find((route) => route.path === '/admin/returns');
    expect(returnsRoute).toBeDefined();

    render(<>{returnsRoute?.element}</>);

    expect(screen.queryByText('navigate:/admin/returns')).not.toBeInTheDocument();
  });
});
