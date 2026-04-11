import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChatWidget } from '@/common/components/ChatWidget';

vi.mock('@/common/components/ChatWidgetRuntime', () => ({
  ChatWidgetRuntime: ({
    isOpen,
    page,
    onClose,
  }: {
    isOpen: boolean;
    page: string;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="chat-widget-runtime">
        <span>{page}</span>
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}));

describe('ChatWidget shell', () => {
  it('does not mount the runtime before the launcher is opened', async () => {
    render(<ChatWidget page="support" />);

    expect(screen.queryByTestId('chat-widget-runtime')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý chat' }));

    await waitFor(() => {
      expect(screen.getByTestId('chat-widget-runtime')).toBeInTheDocument();
    });
  });

  it('keeps product pages on the lightweight shell until the user opens chat', async () => {
    render(<ChatWidget page="product" productId={12} />);

    expect(screen.queryByTestId('chat-widget-runtime')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý chat' }));

    await waitFor(() => {
      expect(screen.getByTestId('chat-widget-runtime')).toBeInTheDocument();
      expect(screen.getByText('product')).toBeInTheDocument();
    });
  });

  it('keeps stylist pages on the lightweight shell until the user opens chat', async () => {
    render(<ChatWidget page="stylist" />);

    expect(screen.queryByTestId('chat-widget-runtime')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý chat' }));

    await waitFor(() => {
      expect(screen.getByTestId('chat-widget-runtime')).toBeInTheDocument();
      expect(screen.getByText('stylist')).toBeInTheDocument();
    });
  });

  it('opens immediately when initialOpen is provided', async () => {
    render(<ChatWidget page="home" initialOpen />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-widget-runtime')).toBeInTheDocument();
    });
  });

  it('keeps the runtime mounted after closing so state can be preserved on reopen', async () => {
    render(<ChatWidget page="product" initialOpen productId={12} />);

    await waitFor(() => {
      expect(screen.getByTestId('chat-widget-runtime')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.queryByTestId('chat-widget-runtime')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở trợ lý chat' }));

    await waitFor(() => {
      expect(screen.getByTestId('chat-widget-runtime')).toBeInTheDocument();
    });
  });
});
