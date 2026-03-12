import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CreateReturnRequest } from '@/store/pages/CreateReturnRequest';

const createMock = vi.fn();
const getOrderByIdMock = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', name: 'A' } }),
}));

vi.mock('@/common/services/return.service', () => ({
  returnService: {
    create: (...args: any[]) => createMock(...args),
  },
}));

vi.mock('@/common/services/order.service', () => ({
  orderService: {
    getOrderById: (...args: any[]) => getOrderByIdMock(...args),
  },
}));

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSuccess = vi.fn();

  render(
    <QueryClientProvider client={qc}>
      <CreateReturnRequest onSuccess={onSuccess} orderIdForReturn={100} />
    </QueryClientProvider>,
  );

  return { onSuccess };
};

describe('CreateReturnRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOrderByIdMock.mockResolvedValue({
      data: {
        data: {
          orderId: 100,
          orderNumber: 'OD100',
          status: 'DELIVERED',
          items: [
            {
              orderItemId: 10,
              productName: 'Shirt',
              variantName: 'M',
              quantity: 2,
            },
          ],
        },
      },
    });
  });

  it('shows validation when no item selected', async () => {
    renderPage();

    expect(await screen.findByText('Yêu cầu trả hàng')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    expect(await screen.findByText('Chọn ít nhất 1 item để trả')).toBeInTheDocument();
  });

  it('submits selected item', async () => {
    const { onSuccess } = renderPage();
    createMock.mockResolvedValue({ data: { success: true } });

    expect(await screen.findByText('Yêu cầu trả hàng')).toBeInTheDocument();

    const checkbox = screen.getAllByRole('checkbox')[0];
    await userEvent.click(checkbox);
    await userEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
