import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

vi.mock('@/common/services/order.service', async () => {
  const actual = await vi.importActual<any>('@/common/services/order.service');
  return {
    ...actual,
    orderService: {
      ...actual.orderService,
      fetchOrderDetail: (...args: any[]) => fetchOrderDetail(...args),
      cancelOrderUser: vi.fn(),
    }
  };
});

describe('OrderDetailPage return CTA', () => {
  it('navigates to return create path without full reload', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      id: '10',
      orderCode: 'OD20260001',
      status: 'delivered',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      createdAt: '2026-02-24T08:00:00.000Z',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
      shippingAddress: {
        recipientName: 'A', recipientPhone: '090', addressLine: '123', ward: 'W', district: 'D', city: 'C',
      },
      items: [],
      pricing: { itemsTotal: 1, shippingFee: 0, discount: 0, tax: 0, grandTotal: 1 },
      timeline: [{ status: 'delivered', at: '2026-02-24T08:00:00.000Z' }],
      note: null,
    });

    const pushSpy = vi.spyOn(window.history, 'pushState');

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/orders/10']}>
          <Routes>
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const btn = await screen.findByRole('button', { name: 'actions.requestReturn' });
    await userEvent.click(btn);

    expect(pushSpy).toHaveBeenCalled();
  });
});
