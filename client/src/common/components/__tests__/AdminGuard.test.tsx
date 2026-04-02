import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useAuthMock = vi.fn();

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div>navigate:{to}</div>,
  Outlet: () => <div>admin-outlet</div>,
}));

import { AdminGuard } from '@/common/components/AdminGuard';

describe('AdminGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('allows support staff into the admin shell', () => {
    useAuthMock.mockReturnValue({
      role: 'staff',
      isInitialized: true,
    });

    render(<AdminGuard />);

    expect(screen.getByText('admin-outlet')).toBeInTheDocument();
  });

  it('redirects customers back to login', () => {
    useAuthMock.mockReturnValue({
      role: 'customer',
      isInitialized: true,
    });

    render(<AdminGuard />);

    expect(screen.getByText('navigate:/login')).toBeInTheDocument();
  });
});
