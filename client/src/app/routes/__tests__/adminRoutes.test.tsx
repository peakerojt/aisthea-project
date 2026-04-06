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
      user: { roles: ['Support'], permissions: [] },
    });

    const ordersRoute = adminRoutes.find((route) => route.path === '/admin/orders');
    expect(ordersRoute).toBeDefined();

    render(<>{ordersRoute?.element}</>);

    expect(screen.getByText('navigate:/')).toBeInTheDocument();
  });

  it('redirects support users from the admin root when no explicit admin route permissions are assigned', () => {
    useAuthMock.mockReturnValue({
      isInitialized: true,
      user: { roles: ['Support'], permissions: [] },
    });

    const rootRoute = adminRoutes.find((route) => route.path === '/admin');
    expect(rootRoute).toBeDefined();

    render(<>{rootRoute?.element}</>);

    expect(screen.getByText('navigate:/')).toBeInTheDocument();
  });

  it('blocks support users from the returns route when no explicit returns permission exists', () => {
    useAuthMock.mockReturnValue({
      isInitialized: true,
      user: { roles: ['Support'], permissions: [] },
    });

    const returnsRoute = adminRoutes.find((route) => route.path === '/admin/returns');
    expect(returnsRoute).toBeDefined();

    render(<>{returnsRoute?.element}</>);

    expect(screen.getByText('navigate:/')).toBeInTheDocument();
  });

  it('uses assigned staff permissions for direct route access and redirects to the first allowed path', () => {
    useAuthMock.mockReturnValue({
      isInitialized: true,
      user: { roles: ['Support'], permissions: ['VIEW_ORDER'] },
    });

    const returnsRoute = adminRoutes.find((route) => route.path === '/admin/returns');
    expect(returnsRoute).toBeDefined();

    render(<>{returnsRoute?.element}</>);

    expect(screen.getByText('navigate:/admin/orders')).toBeInTheDocument();
  });

  it('allows support users onto the returns route when explicit returns permissions exist', () => {
    useAuthMock.mockReturnValue({
      isInitialized: true,
      user: { roles: ['Support'], permissions: ['VIEW_RETURNS'] },
    });

    const returnsRoute = adminRoutes.find((route) => route.path === '/admin/returns');
    expect(returnsRoute).toBeDefined();

    render(<>{returnsRoute?.element}</>);

    expect(screen.queryByText('navigate:/admin/returns')).not.toBeInTheDocument();
    expect(screen.queryByText('navigate:/')).not.toBeInTheDocument();
  });

  it('allows support users onto routes granted by explicit permissions', () => {
    useAuthMock.mockReturnValue({
      isInitialized: true,
      user: { roles: ['Support'], permissions: ['VIEW_ORDER'] },
    });

    const ordersRoute = adminRoutes.find((route) => route.path === '/admin/orders');
    expect(ordersRoute).toBeDefined();

    render(<>{ordersRoute?.element}</>);

    expect(screen.queryByText('navigate:/admin/orders')).not.toBeInTheDocument();
  });
});
