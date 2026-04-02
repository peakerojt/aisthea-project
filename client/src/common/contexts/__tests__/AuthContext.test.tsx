import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();

vi.unmock('@/common/contexts/AuthContext');

vi.mock('@/common/services/auth.service', () => ({
  authService: {
    getSession: (...args: unknown[]) => getSessionMock(...args),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
  },
}));

import { AuthProvider, useAuth } from '@/common/contexts/AuthContext';

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps support sessions to the staff role', async () => {
    getSessionMock.mockResolvedValue({
      isAuthenticated: false,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    act(() => {
      result.current.setUserFromSession({
        isAuthenticated: true,
        user: {
          userId: 9,
          email: 'support@example.com',
          fullName: 'Support Agent',
          roles: ['Support'],
          permissions: [],
        },
      });
    });

    await waitFor(() => {
      expect(result.current.role).toBe('staff');
    });

    expect(result.current.user).toEqual(
      expect.objectContaining({
        email: 'support@example.com',
        roles: ['Support'],
      }),
    );
  });
});
