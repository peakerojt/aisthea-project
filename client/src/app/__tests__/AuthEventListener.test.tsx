import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const logoutMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({
    logout: (...args: unknown[]) => logoutMock(...args),
  }),
}));

import { AuthEventListener } from '@/app/AuthEventListener';

describe('AuthEventListener', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('logs out and redirects to the banned login route when auth:banned is dispatched', async () => {
    logoutMock.mockResolvedValue(undefined);

    render(<AuthEventListener />);

    window.dispatchEvent(new CustomEvent('auth:banned'));

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith('/login?reason=banned', { replace: true });
    });
  });

  it('still redirects when logout fails', async () => {
    logoutMock.mockRejectedValue(new Error('Logout failed'));

    render(<AuthEventListener />);

    window.dispatchEvent(new CustomEvent('auth:banned'));

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith('/login?reason=banned', { replace: true });
    });
  });
});
