import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const verifyEmailMock = vi.fn();
const resendVerificationMock = vi.fn();
const refreshSessionMock = vi.fn();
const syncWithMergeMock = vi.fn();
const getGuestCartMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({ state: { email: 'verify@example.com' } }),
}));

vi.mock('@/common/layouts/AuthLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({
    refreshSession: (...args: unknown[]) => refreshSessionMock(...args),
  }),
}));

vi.mock('@/common/contexts/CartContext', () => ({
  useCart: () => ({
    syncWithMerge: (...args: unknown[]) => syncWithMergeMock(...args),
  }),
}));

vi.mock('@/common/services/auth.service', () => ({
  authService: {
    verifyEmail: (...args: unknown[]) => verifyEmailMock(...args),
    resendVerification: (...args: unknown[]) => resendVerificationMock(...args),
  },
}));

vi.mock('@/common/services/cart.service', () => ({
  getGuestCart: () => getGuestCartMock(),
}));

import { EmailVerification } from '@/common/pages/EmailVerification';

describe('EmailVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshSessionMock.mockResolvedValue(undefined);
    syncWithMergeMock.mockResolvedValue(undefined);
    getGuestCartMock.mockReturnValue([{ variantId: 101, quantity: 2 }]);
  });

  afterEach(() => {
    cleanup();
  });

  it('transitions from pending to success after a valid verification code', async () => {
    verifyEmailMock.mockResolvedValue({ message: 'messages.verifySuccess' });

    const { container } = render(<EmailVerification />);
    const codeInputs = screen.getAllByRole('textbox');

    expect(screen.getByText('states.pendingTitle')).toBeInTheDocument();
    expect(container.querySelector('[data-auth-status-rail="true"]')).toBeInTheDocument();

    for (let index = 0; index < 6; index += 1) {
      await userEvent.type(codeInputs[index], `${index + 1}`);
    }

    await waitFor(() => {
      expect(verifyEmailMock).toHaveBeenCalledWith('verify@example.com', '123456');
    });

    expect(await screen.findByText('states.successTitle')).toBeInTheDocument();
    expect(screen.getByText('messages.verifySuccess')).toBeInTheDocument();
    expect(refreshSessionMock).toHaveBeenCalled();
    expect(syncWithMergeMock).toHaveBeenCalledWith([{ variantId: 101, quantity: 2 }]);
  });
});
