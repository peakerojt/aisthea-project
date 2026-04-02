import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { OrderDetailPage } from '@/common/pages/OrderDetailPage';
import { RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS } from '@/common/utils/returnRefresh';

vi.mock('@/common/utils/returnRefresh', async () => {
  const actual = await vi.importActual<any>('@/common/utils/returnRefresh');
  return {
    ...actual,
    RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS: 10,
  };
});

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
const getReturnForOrder = vi.fn();
const getReturnDetail = vi.fn();

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

vi.mock('@/common/services/return.order-read.service', () => ({
  returnOrderReadService: {
    getForOrder: (...args: any[]) => getReturnForOrder(...args),
  },
}));

vi.mock('@/common/services/return.detail-read.service', () => ({
  returnDetailReadService: {
    detail: (...args: any[]) => getReturnDetail(...args),
  },
}));

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
    getReturnForOrder.mockResolvedValue(null);
    getReturnDetail.mockResolvedValue(null);
  });

  const buildOrderDetail = (status: string) => ({
    id: '11',
    orderCode: 'ORD-20260011',
    status,
    paymentMethod: 'cod',
    paymentStatus: 'PENDING_COD',
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
    expect(await screen.findByText('Xác nhận hủy đơn?')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Khác' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));

    await waitFor(() => {
      expect(cancelOrder).toHaveBeenCalledWith('10', {
        note: 'Khách hàng hủy đơn trước khi xử lý. Chưa chọn lý do hủy.',
        reason: undefined,
      });
    });
  });

  it('shows cancel-and-refund action for paid pending orders', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      ...buildOrderDetail('pending'),
      paymentMethod: 'VNPAY',
      paymentStatus: 'PAID',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
    });

    renderPage('/orders/11');

    expect(await screen.findByRole('button', { name: 'Hủy đơn và yêu cầu hoàn tiền' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hủy đơn hàng' })).not.toBeInTheDocument();
  });

  it('shows cancel-and-refund action for paid processing orders', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      ...buildOrderDetail('Processing'),
      paymentMethod: 'VNPAY',
      paymentStatus: 'PAID',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
    });

    renderPage('/orders/11');

    expect(await screen.findByRole('button', { name: 'Hủy đơn và yêu cầu hoàn tiền' })).toBeInTheDocument();
  });

  it('refetches linked refund-review data after cancelling a paid VNPay order', async () => {
    const pendingRefundSummary = {
      returnId: 211,
      orderId: 11,
      reason: 'PRE_DELIVERY_CANCELLATION',
      status: 'REQUESTED',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'PENDING',
      proofImages: [],
      adminNote: null,
      createdAt: '2026-04-01T08:10:00.000Z',
      updatedAt: '2026-04-01T08:12:00.000Z',
    };
    fetchOrderDetail.mockResolvedValueOnce({
      ...buildOrderDetail('pending'),
      paymentMethod: 'VNPAY',
      paymentStatus: 'PAID',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
    });
    getReturnForOrder
      .mockResolvedValueOnce(null)
      .mockResolvedValue(pendingRefundSummary);
    getReturnDetail.mockResolvedValue({
      returnRequestId: 211,
      orderId: 11,
      reason: 'PRE_DELIVERY_CANCELLATION',
      status: 'REQUESTED',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'PENDING',
      totalRefundAmount: '100000',
      createdAt: '2026-04-01T08:10:00.000Z',
      items: [],
      attachments: [],
      statusLogs: [],
      refundTransactions: [],
    });
    cancelOrder.mockResolvedValueOnce({
      ...buildOrderDetail('cancelled'),
      paymentMethod: 'VNPAY',
      paymentStatus: 'PAID',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
    });

    renderPage('/orders/11');

    const cancelBtn = await screen.findByRole('button', {
      name: 'Hủy đơn và yêu cầu hoàn tiền',
    });
    await userEvent.click(cancelBtn);
    expect(await screen.findByText('Xác nhận hủy đơn?')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Khác' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));

    await waitFor(() => {
      expect(cancelOrder).toHaveBeenCalledWith('11', {
        note: 'Khách hàng hủy đơn và yêu cầu hoàn tiền trước khi xử lý. Chưa chọn lý do hủy.',
        reason: undefined,
      });
    });
    await waitFor(() => {
      expect(getReturnForOrder.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    expect(await screen.findByText('Tiến trình hoàn trả')).toBeInTheDocument();
    expect(screen.getByText('Chờ hoàn tiền')).toBeInTheDocument();
  });

  it('sends the selected cancel reason and generated note for paid refund-review orders', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      ...buildOrderDetail('pending'),
      paymentMethod: 'VNPAY',
      paymentStatus: 'PAID',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
    });
    cancelOrder.mockResolvedValueOnce({
      ...buildOrderDetail('cancelled'),
      paymentMethod: 'VNPAY',
      paymentStatus: 'PAID',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
    });

    renderPage('/orders/11');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Hủy đơn và yêu cầu hoàn tiền' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Đổi ý, không còn nhu cầu' }),
    );
    expect(screen.getByRole('textbox', { name: 'Khác' })).toHaveValue('');

    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));

    await waitFor(() => {
      expect(cancelOrder).toHaveBeenCalledWith('11', {
        reason: 'CHANGED_MIND',
        note: 'Khách hàng hủy đơn và yêu cầu hoàn tiền trước khi xử lý. Lý do: Đổi ý, không còn nhu cầu.',
      });
    });
  });

  it('prefers the custom "Khác" reason when the customer types one manually', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      ...buildOrderDetail('pending'),
      paymentMethod: 'VNPAY',
      paymentStatus: 'PAID',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
    });
    cancelOrder.mockResolvedValueOnce({
      ...buildOrderDetail('cancelled'),
      paymentMethod: 'VNPAY',
      paymentStatus: 'PAID',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
    });

    renderPage('/orders/11');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Hủy đơn và yêu cầu hoàn tiền' }),
    );
    const otherReasonInput = screen.getByRole('textbox', { name: 'Khác' });
    await userEvent.type(otherReasonInput, 'Cần đổi sang đơn khác');

    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy' }));

    await waitFor(() => {
      expect(cancelOrder).toHaveBeenCalledWith('11', {
        reason: undefined,
        note: 'Khách hàng hủy đơn và yêu cầu hoàn tiền trước khi xử lý. Lý do: Cần đổi sang đơn khác.',
      });
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

  it('refetches linked return data after confirming receipt', async () => {
    fetchOrderDetail.mockResolvedValue({
      id: '14',
      orderCode: 'OD20260014',
      status: 'shipping',
      paymentMethod: 'cod',
      paymentStatus: 'PENDING_COD',
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
      items: [],
      pricing: {
        itemsTotal: 398000,
        shippingFee: 0,
        discount: 0,
        tax: 0,
        grandTotal: 398000,
      },
      timeline: [{ status: 'shipping', at: '2026-02-24T08:00:00.000Z' }],
      note: null,
    });
    getReturnForOrder.mockResolvedValue({
      returnId: 140,
      orderId: 14,
      reason: 'DEFECTIVE',
      status: 'PENDING_PAYMENT_CONFIRMATION',
      workflowStatus: 'PENDING_PAYMENT_CONFIRMATION',
      refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
      proofImages: [],
      adminNote: null,
      createdAt: '2026-02-24T08:00:00.000Z',
      updatedAt: '2026-02-24T08:00:00.000Z',
    });
    getReturnDetail.mockResolvedValue({
      returnRequestId: 140,
      orderId: 14,
      reason: 'DEFECTIVE',
      status: 'PENDING_PAYMENT_CONFIRMATION',
      workflowStatus: 'PENDING_PAYMENT_CONFIRMATION',
      refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
      totalRefundAmount: '398000',
      createdAt: '2026-02-24T08:00:00.000Z',
      items: [],
      attachments: [],
      statusLogs: [],
      refundTransactions: [],
    });
    confirmReceipt.mockResolvedValueOnce({ success: true, orderId: 14, newStatus: 'Delivered' });

    renderPage('/orders/14');

    expect(await screen.findByRole('button', { name: 'Đã nhận được hàng' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Đã nhận được hàng' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Đã nhận hàng' }));

    await waitFor(() => {
      expect(confirmReceipt).toHaveBeenCalledWith('14');
    });
    await waitFor(() => {
      expect(getReturnForOrder.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(getReturnDetail.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows a receipt-confirmation hint when COD refund is still locked', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      id: '15',
      orderCode: 'OD20260015',
      status: 'shipping',
      paymentMethod: 'cod',
      paymentStatus: 'PENDING_COD',
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
      items: [],
      pricing: {
        itemsTotal: 398000,
        shippingFee: 0,
        discount: 0,
        tax: 0,
        grandTotal: 398000,
      },
      timeline: [{ status: 'shipping', at: '2026-02-24T08:00:00.000Z' }],
      note: null,
    });
    getReturnForOrder.mockResolvedValue({
      returnId: 150,
      orderId: 15,
      reason: 'DEFECTIVE',
      status: 'PENDING_PAYMENT_CONFIRMATION',
      workflowStatus: 'PENDING_PAYMENT_CONFIRMATION',
      refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
      proofImages: [],
      adminNote: null,
      createdAt: '2026-02-24T08:00:00.000Z',
      updatedAt: '2026-02-24T08:00:00.000Z',
    });
    getReturnDetail.mockResolvedValue({
      returnRequestId: 150,
      orderId: 15,
      reason: 'DEFECTIVE',
      status: 'PENDING_PAYMENT_CONFIRMATION',
      workflowStatus: 'PENDING_PAYMENT_CONFIRMATION',
      refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
      totalRefundAmount: '398000',
      createdAt: '2026-02-24T08:00:00.000Z',
      items: [],
      attachments: [],
      statusLogs: [],
      refundTransactions: [],
    });

    renderPage('/orders/15');

    expect(
      await screen.findByText('Hoàn tiền đang bị khóa cho tới khi đơn hàng được xác nhận thanh toán.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Xác nhận đã nhận hàng ở phần hành động để mở khóa bước hoàn tiền.'),
    ).toBeInTheDocument();
  });

  it('polls locked COD linked returns until payment confirmation unlocks them', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      id: '16',
      orderCode: 'OD20260016',
      status: 'shipping',
      paymentMethod: 'cod',
      paymentStatus: 'PENDING_COD',
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
      items: [],
      pricing: {
        itemsTotal: 398000,
        shippingFee: 0,
        discount: 0,
        tax: 0,
        grandTotal: 398000,
      },
      timeline: [{ status: 'shipping', at: '2026-02-24T08:00:00.000Z' }],
      note: null,
    });
    getReturnForOrder
      .mockResolvedValueOnce({
        returnId: 160,
        orderId: 16,
        reason: 'DEFECTIVE',
        status: 'PENDING_PAYMENT_CONFIRMATION',
        workflowStatus: 'PENDING_PAYMENT_CONFIRMATION',
        refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
        proofImages: [],
        adminNote: null,
        createdAt: '2026-02-24T08:00:00.000Z',
        updatedAt: '2026-02-24T08:00:00.000Z',
      })
      .mockResolvedValueOnce({
        returnId: 160,
        orderId: 16,
        reason: 'DEFECTIVE',
        status: 'PENDING_ADMIN_REVIEW',
        workflowStatus: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'NOT_APPLICABLE',
        proofImages: [],
        adminNote: null,
        createdAt: '2026-02-24T08:00:00.000Z',
        updatedAt: '2026-02-24T08:05:00.000Z',
      });
    getReturnDetail
      .mockResolvedValueOnce({
        returnRequestId: 160,
        orderId: 16,
        reason: 'DEFECTIVE',
        status: 'PENDING_PAYMENT_CONFIRMATION',
        workflowStatus: 'PENDING_PAYMENT_CONFIRMATION',
        refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
        totalRefundAmount: '398000',
        createdAt: '2026-02-24T08:00:00.000Z',
        items: [],
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      })
      .mockResolvedValueOnce({
        returnRequestId: 160,
        orderId: 16,
        reason: 'DEFECTIVE',
        status: 'PENDING_ADMIN_REVIEW',
        workflowStatus: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'NOT_APPLICABLE',
        totalRefundAmount: '398000',
        createdAt: '2026-02-24T08:00:00.000Z',
        items: [],
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      });

    renderPage('/orders/16');

    expect(
      await screen.findByText('Hoàn tiền đang bị khóa cho tới khi đơn hàng được xác nhận thanh toán.'),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(getReturnForOrder).toHaveBeenCalledTimes(2);
      expect(getReturnDetail).toHaveBeenCalledTimes(2);
    }, { timeout: RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS * 20 });

    await waitFor(() => {
      expect(
        screen.queryByText('Hoàn tiền đang bị khóa cho tới khi đơn hàng được xác nhận thanh toán.'),
      ).not.toBeInTheDocument();
    });
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

  it('shows return summary when the order already has a return request', async () => {
    fetchOrderDetail.mockResolvedValueOnce(buildOrderDetail('RETURN_REQUESTED'));
    getReturnForOrder.mockResolvedValueOnce({
      returnId: 44,
      orderId: 11,
      reason: 'DEFECTIVE',
      status: 'REQUESTED',
      workflowStatus: 'ACCEPTED_FOR_REFUND',
      refundStatus: 'PENDING',
      proofImages: [],
      adminNote: null,
      createdAt: '2026-02-24T08:00:00.000Z',
      updatedAt: '2026-02-24T08:00:00.000Z',
    });
    getReturnDetail.mockResolvedValueOnce({
      returnRequestId: 44,
      orderId: 11,
      reason: 'DEFECTIVE',
      status: 'RECEIVED',
      workflowStatus: 'ACCEPTED_FOR_REFUND',
      refundStatus: 'PENDING',
      totalRefundAmount: '50000',
      createdAt: '2026-02-24T08:00:00.000Z',
      items: [],
      attachments: [],
      statusLogs: [],
      refundTransactions: [],
    });

    renderPage('/orders/11');

    expect(await screen.findByText('Tiến trình hoàn trả')).toBeInTheDocument();
    expect(screen.getByText('Chờ hoàn tiền')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem chi tiết hoàn trả' })).toBeInTheDocument();
  });

  it('renders canonical cancelled payment labels on the customer order detail page', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      ...buildOrderDetail('PROCESSING'),
      paymentMethod: 'VNPAY',
      paymentStatus: 'canceled',
    });

    renderPage('/orders/11');

    expect(await screen.findByText('Đã hủy thanh toán')).toBeInTheDocument();
    expect(screen.queryByText('Thanh toán thất bại')).not.toBeInTheDocument();
  });

  it('renders canonical needs-review payment labels on the customer order detail page', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      ...buildOrderDetail('PROCESSING'),
      paymentMethod: 'VNPAY',
      paymentStatus: 'needs_review',
    });

    renderPage('/orders/11');

    expect(await screen.findByText('Cần kiểm tra thanh toán')).toBeInTheDocument();
    expect(screen.queryByText('Thanh toán thất bại')).not.toBeInTheDocument();
  });
});

