import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const registerMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/common/layouts/AuthLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/common/services/auth.service', () => ({
  authService: {
    register: (...args: unknown[]) => registerMock(...args),
  },
}));

import { Signup } from '@/common/pages/Signup';

describe('Signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps password guidance stable while typing and only surfaces validation after blur', async () => {
    const { container } = render(<Signup />);

    expect(screen.getByText('password.helperHint')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-auth-helper="true"]').length).toBeGreaterThanOrEqual(4);

    const passwordInput = screen.getAllByLabelText('form.password')[0];
    await userEvent.click(passwordInput);
    expect(screen.getByText('password.helperHint')).toBeInTheDocument();
    expect(container.querySelector('[data-password-guidance="expanded"]')).toBeNull();

    await userEvent.type(passwordInput, 'S');
    expect(screen.getByText('password.helperHint')).toBeInTheDocument();

    await userEvent.tab();

    await waitFor(() => {
      expect(screen.queryByText('password.helperHint')).not.toBeInTheDocument();
    });

    await userEvent.click(passwordInput);
    await userEvent.type(passwordInput, 'trong123!');

    await waitFor(() => {
      expect(screen.getByText('password.strong')).toBeInTheDocument();
      expect(container.querySelector('[data-password-guidance="expanded"]')).toBeNull();
    });

    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));

    expect(registerMock).not.toHaveBeenCalled();
    expect(container.querySelectorAll('[data-auth-helper="true"]').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('password.strong')).toBeInTheDocument();
  });

  it('redirects to email verification when the account is still pending verification', async () => {
    registerMock.mockRejectedValue(
      Object.assign(new Error('auth:errors.emailPendingVerification'), {
        code: 'EMAIL_PENDING_VERIFICATION',
        data: {
          email: 'pending@example.com',
          requiresVerification: true,
        },
      }),
    );

    render(<Signup />);

    await userEvent.type(screen.getByLabelText('form.fullName'), 'Pending User');
    await userEvent.type(screen.getByLabelText('form.email'), 'pending@example.com');
    await userEvent.type(screen.getAllByLabelText('form.password')[0], 'Secret123!');
    await userEvent.type(screen.getByLabelText('form.confirmPassword'), 'Secret123!');
    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));

    expect(registerMock).toHaveBeenCalledWith({
      email: 'pending@example.com',
      password: 'Secret123!',
      fullName: 'Pending User',
    });
    expect(window.sessionStorage.getItem('pendingVerificationEmail')).toBe('pending@example.com');
    expect(navigateMock).toHaveBeenCalledWith('/email-verification', {
      state: { email: 'pending@example.com' },
    });
  });

  it('shows the duplicate email error for active accounts', async () => {
    registerMock.mockRejectedValue(Object.assign(new Error('Email này đã được sử dụng.'), { code: 'EMAIL_EXISTS' }));

    render(<Signup />);

    await userEvent.type(screen.getByLabelText('form.fullName'), 'Active User');
    await userEvent.type(screen.getByLabelText('form.email'), 'active@example.com');
    await userEvent.type(screen.getAllByLabelText('form.password')[0], 'Secret123!');
    await userEvent.type(screen.getByLabelText('form.confirmPassword'), 'Secret123!');
    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));

    expect(await screen.findByText('Email này đã được sử dụng.')).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
