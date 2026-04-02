import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { OrderDetailPage } from '@/common/pages/OrderDetailPage';
import { RETURN_SUMMARY_CHANGED_EVENT } from '@/common/events/returnSummary.events';
import { RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS } from '@/common/utils/returnRefresh';

vi.mock('@/common/utils/returnRefresh', async () => {
  const actual = await vi.importActual<any>('@/common/utils/returnRefresh');
  return {
    ...actual,
    RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS: 10,
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'customer' }),
}));

vi.mock('@/store/components/Header', () => ({
  Header: () => <div data-testid="store-header" />,
}));

const fetchOrderDetail = vi.fn();
const getReturnForOrder = vi.fn();
const getReturnDetail = vi.fn();

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

describe('OrderDetailPage return CTA', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
    getReturnForOrder.mockResolvedValue(null);
    getReturnDetail.mockResolvedValue(null);
  });

  it('navigates to return create path without full reload', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      id: '10',
      orderCode: 'OD20260001',
      status: 'delivered',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      createdAt: '2026-03-24T08:00:00.000Z',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
      shippingAddress: {
        recipientName: 'A', recipientPhone: '090', addressLine: '123', ward: 'W', district: 'D', city: 'C',
      },
      items: [
        {
          orderItemId: 1,
          quantity: 1,
          orderItemGrossAmount: '100000',
          orderItemAllocatedDiscountAmount: '20000',
          orderItemNetPaidAmount: '80000',
        },
      ],
      pricing: { itemsTotal: 1, shippingFee: 0, discount: 0, tax: 0, grandTotal: 1 },
      timeline: [{ status: 'delivered', at: '2026-03-24T08:00:00.000Z' }],
      note: null,
    });

    const pushSpy = vi.spyOn(window.history, 'pushState');

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/orders/10']}>
          <Routes>
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/orders/:id/return" element={<div data-testid="return-create-page" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const btn = await screen.findByRole('button', { name: 'Yêu cầu trả hàng' });
    await userEvent.click(btn);

    expect(pushSpy).toHaveBeenCalled();
    expect(await screen.findByTestId('return-create-page')).toBeInTheDocument();
  });

  it('keeps the tracking CTA for return requested statuses with spacing drift', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      id: '11',
      orderCode: 'OD20260011',
      status: ' return-requested ',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      createdAt: '2026-02-24T08:00:00.000Z',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
      shippingAddress: {
        recipientName: 'A', recipientPhone: '090', addressLine: '123', ward: 'W', district: 'D', city: 'C',
      },
      items: [],
      pricing: { itemsTotal: 1, shippingFee: 0, discount: 0, tax: 0, grandTotal: 1 },
      timeline: [{ status: 'returned', at: '2026-02-24T08:00:00.000Z' }],
      note: null,
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/orders/11']}>
          <Routes>
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('button', { name: 'Theo dõi đơn hàng' })).toBeInTheDocument();
  });

  it('opens the return route from the existing return summary card', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      id: '12',
      orderCode: 'OD20260012',
      status: 'RETURN_REQUESTED',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      createdAt: '2026-02-24T08:00:00.000Z',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
      shippingAddress: {
        recipientName: 'A', recipientPhone: '090', addressLine: '123', ward: 'W', district: 'D', city: 'C',
      },
      items: [],
      pricing: { itemsTotal: 1, shippingFee: 0, discount: 0, tax: 0, grandTotal: 1 },
      timeline: [{ status: 'return_requested', at: '2026-02-24T08:00:00.000Z' }],
      note: null,
    });
    getReturnForOrder.mockResolvedValue({
      returnId: 98,
      orderId: 12,
      reason: 'DEFECTIVE',
      status: 'REQUESTED',
      workflowStatus: 'IN_RETURN_TRANSIT',
      refundStatus: 'PENDING',
      proofImages: [],
      adminNote: null,
      createdAt: '2026-02-24T08:00:00.000Z',
      updatedAt: '2026-02-24T08:00:00.000Z',
    });
    getReturnDetail.mockResolvedValue({
      returnRequestId: 98,
      orderId: 12,
      reason: 'DEFECTIVE',
      status: 'APPROVED',
      workflowStatus: 'IN_RETURN_TRANSIT',
      refundStatus: 'PENDING',
      totalRefundAmount: '1',
      createdAt: '2026-02-24T08:00:00.000Z',
      items: [],
      attachments: [],
      statusLogs: [],
      refundTransactions: [],
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/orders/12']}>
          <Routes>
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/orders/:id/return" element={<div data-testid="return-summary-route" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Xem chi tiết hoàn trả' }));

    expect(await screen.findByTestId('return-summary-route')).toBeInTheDocument();
  });

  it('hides the create-return CTA when the order already has an active return request', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      id: '12',
      orderCode: 'OD20260012',
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
    getReturnForOrder.mockResolvedValue({
      returnId: 108,
      orderId: 12,
      reason: 'DEFECTIVE',
      status: 'REQUESTED',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'NOT_APPLICABLE',
      proofImages: [],
      adminNote: null,
      createdAt: '2026-02-24T08:00:00.000Z',
      updatedAt: '2026-02-24T08:00:00.000Z',
    });
    getReturnDetail.mockResolvedValue({
      returnRequestId: 108,
      orderId: 12,
      reason: 'DEFECTIVE',
      status: 'REQUESTED',
      workflowStatus: 'PENDING_ADMIN_REVIEW',
      refundStatus: 'NOT_APPLICABLE',
      totalRefundAmount: '1',
      createdAt: '2026-02-24T08:00:00.000Z',
      items: [],
      attachments: [],
      statusLogs: [],
      refundTransactions: [],
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/orders/12']}>
          <Routes>
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('button', { name: 'Xem chi tiết hoàn trả' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yêu cầu trả hàng' })).not.toBeInTheDocument();
  });

  it('shows refund update summary on the order detail return card', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      id: '13',
      orderCode: 'OD20260013',
      status: 'RETURN_REQUESTED',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      createdAt: '2026-02-24T08:00:00.000Z',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
      shippingAddress: {
        recipientName: 'A', recipientPhone: '090', addressLine: '123', ward: 'W', district: 'D', city: 'C',
      },
      items: [],
      pricing: { itemsTotal: 1, shippingFee: 0, discount: 0, tax: 0, grandTotal: 1 },
      timeline: [{ status: 'return_requested', at: '2026-02-24T08:00:00.000Z' }],
      note: null,
    });
    getReturnForOrder.mockResolvedValue({
      returnId: 99,
      orderId: 13,
      reason: 'DEFECTIVE',
      status: 'REQUESTED',
      workflowStatus: 'ACCEPTED_FOR_REFUND',
      refundStatus: 'MANUAL_REVIEW',
      totalRefundAmount: '100000',
      refundableCapAmount: '80000',
      financeNote: 'Bộ phận hoàn tiền đang đối soát lại giao dịch với cổng thanh toán.',
      financeNoteUpdatedAt: '2026-03-26T10:15:00.000Z',
      financeNoteUpdatedBy: { fullName: 'Bộ phận hỗ trợ' },
      proofImages: [],
      adminNote: null,
      createdAt: '2026-02-24T08:00:00.000Z',
      updatedAt: '2026-02-24T08:00:00.000Z',
    });
    getReturnDetail.mockResolvedValue({
      returnRequestId: 99,
      orderId: 13,
      reason: 'DEFECTIVE',
      status: 'APPROVED',
      workflowStatus: 'ACCEPTED_FOR_REFUND',
      refundStatus: 'MANUAL_REVIEW',
      financeNote: 'Bộ phận hoàn tiền đang đối soát lại giao dịch với cổng thanh toán.',
      financeNoteUpdatedAt: '2026-03-26T10:15:00.000Z',
      financeNoteUpdatedBy: { fullName: 'Bộ phận hỗ trợ' },
      totalRefundAmount: '100000',
      refundableCapAmount: '80000',
      createdAt: '2026-02-24T08:00:00.000Z',
      items: [],
      attachments: [],
      statusLogs: [],
      refundTransactions: [],
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/orders/13']}>
          <Routes>
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Cập nhật hoàn tiền')).toBeInTheDocument();
    expect(await screen.findByText('Hoàn tiền dự kiến')).toBeInTheDocument();
    expect(await screen.findByText('80.000đ')).toBeInTheDocument();
    expect(await screen.findByText('Theo tổng cũ: 100.000đ')).toBeInTheDocument();
    expect(
      screen.getByText('Bộ phận hoàn tiền đang đối soát lại giao dịch với cổng thanh toán.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Cập nhật .* bởi Bộ phận hỗ trợ/)).toBeInTheDocument();
  });

  it('shows snapshot economics context on the order detail return card when item snapshots are present', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      id: '14',
      orderCode: 'OD20260014',
      status: 'RETURN_REQUESTED',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      createdAt: '2026-02-24T08:00:00.000Z',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
      shippingAddress: {
        recipientName: 'A', recipientPhone: '090', addressLine: '123', ward: 'W', district: 'D', city: 'C',
      },
      items: [],
      pricing: { itemsTotal: 1, shippingFee: 0, discount: 0, tax: 0, grandTotal: 1 },
      timeline: [{ status: 'return_requested', at: '2026-02-24T08:00:00.000Z' }],
      note: null,
    });
    getReturnForOrder.mockResolvedValue({
      returnId: 100,
      orderId: 14,
      reason: 'DEFECTIVE',
      status: 'REQUESTED',
      workflowStatus: 'ACCEPTED_FOR_REFUND',
      refundStatus: 'PENDING',
      totalRefundAmount: '100000',
      refundableCapAmount: '80000',
      proofImages: [],
      adminNote: null,
      createdAt: '2026-02-24T08:00:00.000Z',
      updatedAt: '2026-02-24T08:00:00.000Z',
    });
    getReturnDetail.mockResolvedValue({
      returnRequestId: 100,
      orderId: 14,
      reason: 'DEFECTIVE',
      status: 'APPROVED',
      workflowStatus: 'ACCEPTED_FOR_REFUND',
      refundStatus: 'PENDING',
      totalRefundAmount: '100000',
      refundableCapAmount: '80000',
      createdAt: '2026-02-24T08:00:00.000Z',
      items: [
        {
          orderItemId: 1,
          quantity: 1,
          orderItemGrossAmount: '100000',
          orderItemAllocatedDiscountAmount: '20000',
          orderItemNetPaidAmount: '80000',
        },
      ],
      attachments: [],
      statusLogs: [],
      refundTransactions: [],
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/orders/14']}>
          <Routes>
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Thực trả theo đơn gốc:\s*80\.000/i)).toBeInTheDocument();
    expect(await screen.findByText(/100\.000.*20\.000/)).toBeInTheDocument();
  });

  it('falls back to totalRefundAmount on the order detail return card when refundableCapAmount is unavailable', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      id: '16',
      orderCode: 'OD20260016',
      status: 'RETURN_REQUESTED',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      createdAt: '2026-02-24T08:00:00.000Z',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
      shippingAddress: {
        recipientName: 'A', recipientPhone: '090', addressLine: '123', ward: 'W', district: 'D', city: 'C',
      },
      items: [],
      pricing: { itemsTotal: 1, shippingFee: 0, discount: 0, tax: 0, grandTotal: 1 },
      timeline: [{ status: 'return_requested', at: '2026-02-24T08:00:00.000Z' }],
      note: null,
    });
    getReturnForOrder.mockResolvedValue({
      returnId: 102,
      orderId: 16,
      reason: 'DEFECTIVE',
      status: 'REQUESTED',
      workflowStatus: 'ACCEPTED_FOR_REFUND',
      refundStatus: 'PENDING',
      totalRefundAmount: '50000',
      proofImages: [],
      adminNote: null,
      createdAt: '2026-02-24T08:00:00.000Z',
      updatedAt: '2026-02-24T08:00:00.000Z',
    });
    getReturnDetail.mockResolvedValue({
      returnRequestId: 102,
      orderId: 16,
      reason: 'DEFECTIVE',
      status: 'APPROVED',
      workflowStatus: 'ACCEPTED_FOR_REFUND',
      refundStatus: 'PENDING',
      totalRefundAmount: '50000',
      refundableCapAmount: null,
      createdAt: '2026-02-24T08:00:00.000Z',
      items: [],
      attachments: [],
      statusLogs: [],
      refundTransactions: [],
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/orders/16']}>
          <Routes>
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Hoàn tiền dự kiến')).toBeInTheDocument();
    expect(await screen.findByText(/50\.000/)).toBeInTheDocument();
    expect(screen.queryByText(/Theo tổng cũ:/)).not.toBeInTheDocument();
    expect(
      screen.queryByText('Đã giới hạn theo số tiền thực trả của các sản phẩm trong yêu cầu này.'),
    ).not.toBeInTheDocument();
  });

  it('refetches linked return summary when a return-summary event targets the visible order', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      id: '14',
      orderCode: 'OD20260014',
      status: 'RETURN_REQUESTED',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      createdAt: '2026-02-24T08:00:00.000Z',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
      shippingAddress: {
        recipientName: 'A', recipientPhone: '090', addressLine: '123', ward: 'W', district: 'D', city: 'C',
      },
      items: [],
      pricing: { itemsTotal: 1, shippingFee: 0, discount: 0, tax: 0, grandTotal: 1 },
      timeline: [{ status: 'return_requested', at: '2026-02-24T08:00:00.000Z' }],
      note: null,
    });
    getReturnForOrder
      .mockResolvedValueOnce({
        returnId: 100,
        orderId: 14,
        reason: 'DEFECTIVE',
        status: 'REQUESTED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PENDING',
        proofImages: [],
        adminNote: null,
        createdAt: '2026-02-24T08:00:00.000Z',
        updatedAt: '2026-02-24T08:00:00.000Z',
      })
      .mockResolvedValueOnce({
        returnId: 100,
        orderId: 14,
        reason: 'DEFECTIVE',
        status: 'REQUESTED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'FAILED',
        financeNote: 'Cổng thanh toán đang được kiểm tra lại.',
        financeNoteUpdatedAt: '2026-03-26T10:15:00.000Z',
        financeNoteUpdatedBy: { fullName: 'Bộ phận hỗ trợ' },
        proofImages: [],
        adminNote: null,
        createdAt: '2026-02-24T08:00:00.000Z',
        updatedAt: '2026-03-26T10:15:00.000Z',
      });
    getReturnDetail
      .mockResolvedValueOnce({
        returnRequestId: 100,
        orderId: 14,
        reason: 'DEFECTIVE',
        status: 'APPROVED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PENDING',
        totalRefundAmount: '1',
        createdAt: '2026-02-24T08:00:00.000Z',
        items: [],
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      })
      .mockResolvedValueOnce({
        returnRequestId: 100,
        orderId: 14,
        reason: 'DEFECTIVE',
        status: 'APPROVED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'FAILED',
        financeNote: 'Cổng thanh toán đang được kiểm tra lại.',
        financeNoteUpdatedAt: '2026-03-26T10:15:00.000Z',
        financeNoteUpdatedBy: { fullName: 'Bộ phận hỗ trợ' },
        totalRefundAmount: '1',
        createdAt: '2026-02-24T08:00:00.000Z',
        items: [],
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/orders/14']}>
          <Routes>
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Chờ hoàn tiền')).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(RETURN_SUMMARY_CHANGED_EVENT, {
          detail: { orderId: 14, returnRequestId: 100 },
        }),
      );
    });

    await waitFor(() => {
      expect(getReturnForOrder).toHaveBeenCalledTimes(2);
      expect(getReturnDetail).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('Hoàn tiền thất bại')).toBeInTheDocument();
    expect(screen.getByText('Cổng thanh toán đang được kiểm tra lại.')).toBeInTheDocument();
  });

  it('polls linked refund-active return data automatically', async () => {
    fetchOrderDetail.mockResolvedValueOnce({
      id: '15',
      orderCode: 'OD20260015',
      status: 'RETURN_REQUESTED',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      createdAt: '2026-02-24T08:00:00.000Z',
      customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
      shippingAddress: {
        recipientName: 'A', recipientPhone: '090', addressLine: '123', ward: 'W', district: 'D', city: 'C',
      },
      items: [],
      pricing: { itemsTotal: 1, shippingFee: 0, discount: 0, tax: 0, grandTotal: 1 },
      timeline: [{ status: 'return_requested', at: '2026-02-24T08:00:00.000Z' }],
      note: null,
    });
    getReturnForOrder
      .mockResolvedValueOnce({
        returnId: 101,
        orderId: 15,
        reason: 'DEFECTIVE',
        status: 'REQUESTED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PROCESSING',
        proofImages: [],
        adminNote: null,
        createdAt: '2026-02-24T08:00:00.000Z',
        updatedAt: '2026-03-26T10:00:00.000Z',
      })
      .mockResolvedValueOnce({
        returnId: 101,
        orderId: 15,
        reason: 'DEFECTIVE',
        status: 'REQUESTED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'FAILED',
        financeNote: 'Refund gateway timed out.',
        financeNoteUpdatedAt: '2026-03-26T10:15:00.000Z',
        financeNoteUpdatedBy: { fullName: 'Support' },
        proofImages: [],
        adminNote: null,
        createdAt: '2026-02-24T08:00:00.000Z',
        updatedAt: '2026-03-26T10:15:00.000Z',
      });
    getReturnDetail
      .mockResolvedValueOnce({
        returnRequestId: 101,
        orderId: 15,
        reason: 'DEFECTIVE',
        status: 'APPROVED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PROCESSING',
        totalRefundAmount: '1',
        createdAt: '2026-02-24T08:00:00.000Z',
        items: [],
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      })
      .mockResolvedValueOnce({
        returnRequestId: 101,
        orderId: 15,
        reason: 'DEFECTIVE',
        status: 'APPROVED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'FAILED',
        financeNote: 'Refund gateway timed out.',
        financeNoteUpdatedAt: '2026-03-26T10:15:00.000Z',
        financeNoteUpdatedBy: { fullName: 'Support' },
        totalRefundAmount: '1',
        createdAt: '2026-02-24T08:00:00.000Z',
        items: [],
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/orders/15']}>
          <Routes>
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Đang hoàn tiền')).toBeInTheDocument();

    await waitFor(() => {
      expect(getReturnForOrder).toHaveBeenCalledTimes(2);
      expect(getReturnDetail).toHaveBeenCalledTimes(2);
    }, { timeout: RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS * 20 });
    expect(await screen.findByText('Hoàn tiền thất bại')).toBeInTheDocument();
  });
});
