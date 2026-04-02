import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const postMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/common/layouts/AuthLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/common/utils/api', () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

import { ResetPasswordPage } from '@/common/pages/ResetPasswordPage';

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps validation feedback in helper rows when confirmation does not match', async () => {
    const { container } = render(<ResetPasswordPage />);
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');

    await userEvent.type(screen.getByLabelText('form.code'), '123456');
    await userEvent.type(passwordInputs[0], 'StrongPass1!');
    await userEvent.type(passwordInputs[1], 'OtherPass1!');
    await userEvent.click(screen.getByRole('button', { name: 'actions.resetPassword' }));

    expect(postMock).not.toHaveBeenCalled();
    expect(await screen.findByText('messages.passwordMismatch')).toBeInTheDocument();
    expect(container.querySelector('[data-auth-status-rail="true"]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-auth-helper="true"]').length).toBeGreaterThanOrEqual(3);
  });
});
