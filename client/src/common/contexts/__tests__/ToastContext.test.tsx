import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('@/common/contexts/ToastContext');

import { ToastProvider, useToast } from '@/common/contexts/ToastContext';

const ToastHarness: React.FC = () => {
  const { showToast } = useToast();

  return (
    <div>
      <button
        type="button"
        onClick={() => showToast({ type: 'success', title: 'Đã xóa khỏi giỏ hàng' })}
      >
        show plain toast
      </button>
      <button
        type="button"
        onClick={() => showToast({ type: 'success', title: 'Đã thêm vào giỏ hàng', subtitle: 'Áo polo Sporty' })}
      >
        show detailed toast
      </button>
    </div>
  );
};

describe('ToastContext', () => {
  it('renders a compact toast layout when no subtitle is provided', async () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'show plain toast' }));

    const toast = await screen.findByRole('alert');

    await waitFor(() => {
      expect(toast).toHaveAttribute('data-has-subtitle', 'false');
    });

    expect(toast).toHaveTextContent('Đã xóa khỏi giỏ hàng');
    expect(toast).not.toHaveTextContent('Áo polo Sporty');
  });

  it('keeps the two-line layout when a subtitle is provided', async () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'show detailed toast' }));

    const toast = await screen.findByRole('alert');

    await waitFor(() => {
      expect(toast).toHaveAttribute('data-has-subtitle', 'true');
    });

    expect(toast).toHaveTextContent('Đã thêm vào giỏ hàng');
    expect(toast).toHaveTextContent('Áo polo Sporty');
  });
});
