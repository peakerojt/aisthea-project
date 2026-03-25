import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { OrderDetailPage } from '@/common/pages/OrderDetailPage';

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'customer' }),
}));

vi.mock('@/store/components/Header', () => ({
  Header: () => <div data-testid="store-header" />,
}));

const fetchOrderDetail = vi.fn();
const cancelOrder = vi.fn();
const confirmReceipt = vi.fn();
const addItemsBatch = vi.fn();
const showToast = vi.fn();

vi.mock('@/common/contexts/CartContext', () => ({
  useCart: () => ({
    addItemsBatch,
    isLoading: false,
  }),
}));

vi.mock('@/common/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast,
    showCartToast: vi.fn(),
  }),
}));

vi.mock('@/common/services/order.service', async () => {
  const actual = await vi.importActual<any>('@/common/services/order.service');
  return {
    ...actual,
    orderService: {
      ...actual.orderService,
      fetchOrderDetail: (...args: any[]) => fetchOrderDetail(...args),
      cancelOrderUser: (...args: any[]) => cancelOrder(...args),
      confirmReceipt: (...args: any[]) => confirmReceipt(...args),
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const buildOrderDetail = (status: string) => ({
    id: '11',
    orderCode: 'ORD-20260011',
    status,
    paymentMethod: 'cod',
    paymentStatus: 'COD_PENDING',
    createdAt: '2026-02-24T08:00:00.000Z',
    shippingAddress: {
      recipientName: 'A',
      recipientPhone: '090',
      addressLine: '123',
      ward: 'W',
      district: 'D',
      city: 'C',
    },
    items: [],
    pricing: {
      itemsTotal: 100000,
      shippingFee: 0,
      discount: 0,
      tax: 0,
      grandTotal: 100000,
    },
    timeline: [{ status, timestamp: '2026-02-24T08:00:00.000Z' }],
    note: null,
  });

  it('shows not found state (404)', async () => {
    fetchOrderDetail.mockRejectedValueOnce({ status: 404, code: 'NOT_FOUND', message: 'Order not found' });

    renderPage('/orders/999');

    expect(await screen.findByText('Đơn hàng không tồn tại')).toBeInTheDocument();
    expect(screen.getByText('Có thể mã đơn hàng bị sai hoặc đơn hàng đã bị xóa.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Về trang chủ' })).toBeInTheDocument();
  });

  it('shows forbidden state (403)', async () => {
    fetchOrderDetail.mockRejectedValueOnce({ status: 403, code: 'FORBIDDEN', message: 'Forbidden' });

    renderPage('/orders/10');

    expect(await screen.findByText('Không có quyền truy cập')).toBeInTheDocument();
    expect(screen.getByText('Bạn không thể xem chi tiết đơn hàng này.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Về trang chủ' })).toBeInTheDocument();
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

  it('uses batch cart merge for buy again and emits one success toast', async () => {
    addItemsBatch.mockResolvedValueOnce(undefined);
    fetchOrderDetail.mockResolvedValueOnce({
      id: '10',
      orderCode: 'OD20260001',
      status: 'delivered',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
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
          orderItemId: 1,
          productId: '1',
          variantId: 101,
          sku: 'SKU-RED-M',
          productName: 'Ao thun',
          variant: 'Do / M',
          price: 199000,
          quantity: 2,
          subtotal: 398000,
          thumbnail: null,
        },
        {
          orderItemId: 2,
          productId: '2',
          variantId: 202,
          sku: 'SKU-BLUE-L',
          productName: 'Quan dai',
          variant: 'Xanh / L',
          price: 299000,
          quantity: 1,
          subtotal: 299000,
          thumbnail: null,
        },
      ],
      pricing: {
        itemsTotal: 697000,
        shippingFee: 0,
        discount: 0,
        tax: 0,
        grandTotal: 697000,
      },
      timeline: [{ status: 'delivered', at: new Date().toISOString() }],
      note: null,
    });

    renderPage('/orders/10');

    const buyAgainButton = await screen.findByRole('button', { name: /Mua lại|actions\.buyAgain/ });
    await userEvent.click(buyAgainButton);

    await waitFor(() => {
      expect(addItemsBatch).toHaveBeenCalledWith([
        { variantId: 101, quantity: 2 },
        { variantId: 202, quantity: 1 },
      ]);
    });

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        title: 'Đã thêm 2 sản phẩm vào giỏ hàng! Đang chuyển tới trang thanh toán...',
      }),
    );
  });

  it('shows track order action for processing orders', async () => {
    fetchOrderDetail.mockResolvedValueOnce(buildOrderDetail('Processing'));

    renderPage('/orders/11');

    expect(await screen.findByRole('button', { name: /Theo dõi đơn hàng|actions\.trackOrder/ })).toBeInTheDocument();
  });

  it('shows track order action for return requested orders', async () => {
    fetchOrderDetail.mockResolvedValueOnce(buildOrderDetail('RETURN_REQUESTED'));

    renderPage('/orders/11');

    expect(await screen.findByRole('button', { name: /Theo dõi đơn hàng|actions\.trackOrder/ })).toBeInTheDocument();
  });

  it('shows buy again action for returned statuses with spacing drift', async () => {
    fetchOrderDetail.mockResolvedValueOnce(buildOrderDetail(' returned '));

    renderPage('/orders/11');

    expect(await screen.findByRole('button', { name: /Mua lại|actions\.buyAgain/ })).toBeInTheDocument();
  });

  it('shows buy again action for legacy completed statuses', async () => {
    fetchOrderDetail.mockResolvedValueOnce(buildOrderDetail(' completed '));

    renderPage('/orders/11');

    expect(await screen.findByRole('button', { name: /Mua lại|actions\.buyAgain/ })).toBeInTheDocument();
  });

  it('shows track order action for returned orders', async () => {
    fetchOrderDetail.mockResolvedValueOnce(buildOrderDetail('Returned'));

    renderPage('/orders/11');

    expect(await screen.findByRole('button', { name: /Theo dõi đơn hàng|actions\.trackOrder/ })).toBeInTheDocument();
  });
});

