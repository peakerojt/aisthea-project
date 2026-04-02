import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const setUserFromSessionMock = vi.fn();
const apiGetMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({
    setUserFromSession: setUserFromSessionMock,
  }),
}));

vi.mock('@/common/utils/api', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}));

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { changeLanguage: vi.fn() },
    }),
  };
});

import { OAuthCallback } from '@/common/pages/OAuthCallback';

describe('OAuthCallback', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useRealTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('sets the authenticated session and redirects admins to /admin', async () => {
    apiGetMock.mockResolvedValue({
      isAuthenticated: true,
      user: {
        userId: 1,
        email: 'admin@example.com',
        fullName: 'Admin User',
        roles: ['Admin'],
      },
    });

    await act(async () => {
      render(<OAuthCallback />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(setUserFromSessionMock).toHaveBeenCalledWith(expect.objectContaining({
      isAuthenticated: true,
    }));
    expect(navigateMock).toHaveBeenCalledWith('/admin');
  });

  it('redirects support users to the returns admin route', async () => {
    apiGetMock.mockResolvedValue({
      isAuthenticated: true,
      user: {
        userId: 2,
        email: 'support@example.com',
        fullName: 'Support User',
        roles: ['Support'],
      },
    });

    await act(async () => {
      render(<OAuthCallback />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(setUserFromSessionMock).toHaveBeenCalledWith(expect.objectContaining({
      isAuthenticated: true,
    }));
    expect(navigateMock).toHaveBeenCalledWith('/admin/returns');
  });

  it('shows an error and redirects to /login when no session is found', async () => {
    vi.useFakeTimers();
    apiGetMock.mockResolvedValue({
      isAuthenticated: false,
      user: undefined,
    });

    await act(async () => {
      render(<OAuthCallback />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('states.failedTitle')).toBeInTheDocument();
    expect(screen.getByText('errors.sessionNotFound')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('renders the thrown error message and redirects to /login after failure', async () => {
    vi.useFakeTimers();
    apiGetMock.mockRejectedValue(new Error('Session check failed'));

    await act(async () => {
      render(<OAuthCallback />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('Session check failed')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(navigateMock).toHaveBeenCalledWith('/login');
    expect(console.error).toHaveBeenCalled();
  });
});
