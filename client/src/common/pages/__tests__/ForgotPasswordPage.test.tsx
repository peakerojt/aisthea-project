import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

import { ForgotPasswordPage } from '@/common/pages/ForgotPasswordPage';

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('surfaces invalid email errors in the helper row without firing the request', async () => {
    const { container } = render(<ForgotPasswordPage />);

    await userEvent.type(screen.getByRole('textbox'), 'bad-email');
    fireEvent.submit(screen.getByRole('button', { name: 'actions.sendLink' }).closest('form') as HTMLFormElement);

    expect(postMock).not.toHaveBeenCalled();
    expect(await screen.findByText('messages.emailInvalid')).toBeInTheDocument();
    expect(container.querySelector('[data-auth-status-rail="true"]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-auth-helper="true"]').length).toBeGreaterThanOrEqual(1);
  });
});
