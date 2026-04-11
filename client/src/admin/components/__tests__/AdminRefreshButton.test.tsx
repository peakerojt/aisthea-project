import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { AdminRefreshButton } from '@/admin/components/AdminUI';

describe('AdminRefreshButton', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the spinner visible briefly after a fast refresh completes', () => {
    vi.useFakeTimers();

    const { rerender, container } = render(
      <AdminRefreshButton type="button" label="Lam moi" isRefreshing={false} />,
    );

    rerender(<AdminRefreshButton type="button" label="Lam moi" isRefreshing />);

    const button = screen.getByRole('button', { name: 'Lam moi' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('svg')).toHaveClass('animate-spin');

    rerender(<AdminRefreshButton type="button" label="Lam moi" isRefreshing={false} />);

    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('svg')).toHaveClass('animate-spin');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(button).toHaveAttribute('aria-busy', 'false');
    expect(container.querySelector('svg')).not.toHaveClass('animate-spin');
  });
});
