import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const loginMock = vi.fn();
const syncWithMergeMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/common/layouts/AuthLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: (...args: unknown[]) => loginMock(...args),
    isLoading: false,
  }),
}));

vi.mock('@/common/contexts/CartContext', () => ({
  useCart: () => ({
    syncWithMerge: (...args: unknown[]) => syncWithMergeMock(...args),
  }),
}));

vi.mock('@/common/services/cart.service', () => ({
  getGuestCart: () => [],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { Login } from '@/common/pages/Login';

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    syncWithMergeMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects support users to admin returns after login', async () => {
    loginMock.mockResolvedValue({
      roles: ['Support'],
      permissions: ['MANAGE_RETURNS'],
    });

    render(<Login />);

    const emailInput = screen.getByRole('textbox');
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;

    await userEvent.type(emailInput, 'support@example.com');
    await userEvent.type(passwordInput, 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: 'actions.signIn' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('support@example.com', 'Password123!');
    });

    expect(syncWithMergeMock).toHaveBeenCalledWith([]);
    expect(navigateMock).toHaveBeenCalledWith('/admin/returns');
  });

  it('shows invalid credential errors inside the auth status rail without removing the forgot password action', async () => {
    loginMock.mockRejectedValue({
      status: 401,
    });

    const { container } = render(<Login />);

    const emailInput = screen.getByRole('textbox');
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;

    await userEvent.type(emailInput, 'customer@example.com');
    await userEvent.type(passwordInput, 'WrongPass123!');
    await userEvent.click(screen.getByRole('button', { name: 'actions.signIn' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('errors.invalidCredentials');
    expect(container.querySelector('[data-auth-status-rail="true"]')).toBeInTheDocument();
    expect(container.querySelector('[data-auth-status-variant="compact"]')).toBe(alert);
    expect(screen.getByRole('button', { name: 'actions.forgotPassword' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'actions.signIn' })).toBeInTheDocument();
  });
});
