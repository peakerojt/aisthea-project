import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
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
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps helper rows and password guidance mounted when validation fails', async () => {
    const { container } = render(<Signup />);

    expect(screen.getByText('password.requirementsTitle')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-auth-helper="true"]').length).toBeGreaterThanOrEqual(4);

    await userEvent.click(screen.getByRole('button', { name: 'actions.create' }));

    expect(registerMock).not.toHaveBeenCalled();
    expect(container.querySelectorAll('[data-auth-helper="true"]').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('password.requirementsTitle')).toBeInTheDocument();
  });
});
