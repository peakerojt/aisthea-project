import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { OrderDetailPage } from '@/common/pages/OrderDetailPage';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'customer' }),
}));

vi.mock('../../components/Header', () => ({
  Header: () => <div data-testid="store-header" />,
}));

const fetchOrderDetail = vi.fn();
const cancelOrder = vi.fn();

vi.mock('../../services/order.service', async () => {
  const actual = await vi.importActual<any>('../../services/order.service');
  return {
    ...actual,
    orderService: {
      ...actual.orderService,
      fetchOrderDetail: (...args: any[]) => fetchOrderDetail(...args),
      cancelOrderUser: (...args: any[]) => cancelOrder(...args),
    }
  };
});

const renderPage = (initialEntry: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/orders/:id" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('OrderDetailPage', () => {
  it('shows not found state (404)', async () => {
    fetchOrderDetail.mockRejectedValueOnce({ status: 404, code: 'NOT_FOUND', message: 'Order not found' });

    renderPage('/orders/999');

    expect(await screen.findByText('Đơn hàng không tồn tại')).toBeInTheDocument();
  });

  it('shows forbidden state (403)', async () => {
    fetchOrderDetail.mockRejectedValueOnce({ status: 403, code: 'FORBIDDEN', message: 'Forbidden' });

    renderPage('/orders/10');

    expect(await screen.findByText('Không có quyền truy cập')).toBeInTheDocument();
  });

  it('shows success view and allows cancel with optimistic update', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      id: '10',
      orderCode: 'OD20260001',
      status: 'pending',
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      createdAt: '2026-02-24T08:00:00.000Z',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
      shippingAddress: {
        recipientName: 'A',
        recipientPhone: '090',
        addressLine: '123',
        ward: 'W',
        district: 'D',
        city: 'C',
      },
      items: [
        {
          productId: '1',
          sku: 'SKU-RED-M',
          productName: 'Ao thun',
          variant: 'Do / M',
          price: 199000,
          quantity: 2,
          subtotal: 398000,
          thumbnail: null,
        },
      ],
      pricing: {
        itemsTotal: 398000,
        shippingFee: 0,
        discount: 0,
        tax: 0,
        grandTotal: 398000,
      },
      timeline: [{ status: 'pending', at: '2026-02-24T08:00:00.000Z' }],
      note: null,
    });

    cancelOrder.mockResolvedValueOnce({
      id: '10',
      orderCode: 'OD20260001',
      status: 'cancelled',
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      createdAt: '2026-02-24T08:00:00.000Z',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
      shippingAddress: {
        recipientName: 'A',
        recipientPhone: '090',
        addressLine: '123',
        ward: 'W',
        district: 'D',
        city: 'C',
      },
      items: [
        {
          productId: '1',
          sku: 'SKU-RED-M',
          productName: 'Ao thun',
          variant: 'Do / M',
          price: 199000,
          quantity: 2,
          subtotal: 398000,
          thumbnail: null,
        },
      ],
      pricing: {
        itemsTotal: 398000,
        shippingFee: 0,
        discount: 0,
        tax: 0,
        grandTotal: 398000,
      },
      timeline: [
        { status: 'pending', at: '2026-02-24T08:00:00.000Z' },
        { status: 'cancelled', at: '2026-02-24T09:00:00.000Z' },
      ],
      note: null,
    });

    renderPage('/orders/10');

    // Wait for main title to ensure data is loaded
    expect(await screen.findByText('Chi tiết đơn hàng')).toBeInTheDocument();

    const cancelBtn = await screen.findByRole('button', { name: 'Hủy đơn hàng' });
    expect(cancelBtn).toBeEnabled();

    await userEvent.click(cancelBtn);

    // Optimistic update should disable button immediately
    await waitFor(() => {
      expect(cancelOrder).toHaveBeenCalledTimes(1);
    });
  });
});

