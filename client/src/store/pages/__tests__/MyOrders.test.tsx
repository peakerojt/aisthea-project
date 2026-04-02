import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { MyOrders } from '@/store/pages/MyOrders';
import { RETURN_SUMMARY_CHANGED_EVENT } from '@/common/events/returnSummary.events';
import { RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS } from '@/common/utils/returnRefresh';
import * as returnRefreshUtils from '@/common/utils/returnRefresh';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/common/utils/returnRefresh', async () => {
  const actual = await vi.importActual<any>('@/common/utils/returnRefresh');
  return {
    ...actual,
    RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS: 10,
  };
});

const getMyOrders = vi.fn();
const getMyReturnSummaries = vi.fn();
const paymentBadgePropsMock = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'customer' }),
}));

vi.mock('@/store/components/Header', () => ({
  Header: () => <div data-testid="store-header" />,
}));

vi.mock('@/common/components/PaymentStatusBadge', () => ({
  PaymentStatusBadge: (props: Record<string, unknown>) => {
    paymentBadgePropsMock(props);
    return <div data-testid="payment-badge" />;
  },
}));

vi.mock('@/common/services/order.service', async () => {
  const actual = await vi.importActual<any>('@/common/services/order.service');
  return {
    ...actual,
    orderService: {
      ...actual.orderService,
      getMyOrders: (...args: any[]) => getMyOrders(...args),
    },
  };
});

vi.mock('@/common/services/return.summary.service', async () => {
  const actual = await vi.importActual<any>('@/common/services/return.summary.service');
  return {
    ...actual,
    returnSummaryService: {
      ...actual.returnSummaryService,
      myReturnSummaries: (...args: any[]) => getMyReturnSummaries(...args),
    },
  };
});

describe('MyOrders', () => {
  const originalVisibilityState = Object.getOwnPropertyDescriptor(document, 'visibilityState');

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
    navigateMock.mockReset();
    paymentBadgePropsMock.mockReset();
    getMyReturnSummaries.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalVisibilityState) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityState);
    }
  });

  it('renders translated empty-state chrome', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đơn hàng của tôi')).toBeInTheDocument();
    expect(screen.getByText('Xem lịch sử và chi tiết đơn hàng')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tra cứu đơn hàng' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quay lại tài khoản' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Làm mới' })).toBeInTheDocument();
    expect(screen.getByText('Không tìm thấy đơn hàng.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bắt đầu mua sắm' })).toBeInTheDocument();
  });

  it('renders canonical cancelled label for drifted canceled statuses', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [
        {
          orderId: 10,
          orderNumber: 'ORD-10',
          orderCode: 'OD20260010',
          status: ' canceled ',
          paymentMethod: 'cod',
          paymentStatus: 'PENDING_COD',
          totalAmount: '199000',
          itemCount: 1,
          createdAt: '2026-02-24T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đã hủy')).toBeInTheDocument();
    expect(screen.queryByText(' canceled ')).not.toBeInTheDocument();
  });

  it('renders canonical return requested label for drifted return-requested statuses', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [
        {
          orderId: 11,
          orderNumber: 'ORD-11',
          orderCode: 'OD20260011',
          status: ' return-requested ',
          paymentMethod: 'cod',
          paymentStatus: 'PENDING_COD',
          totalAmount: '299000',
          itemCount: 1,
          createdAt: '2026-02-24T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Yêu cầu trả hàng')).toBeInTheDocument();
    expect(screen.queryByText(' return-requested ')).not.toBeInTheDocument();
  });

  it('renders canonical delivered label for legacy completed statuses', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [
        {
          orderId: 12,
          orderNumber: 'ORD-12',
          orderCode: 'OD20260012',
          status: ' completed ',
          paymentMethod: 'cod',
          paymentStatus: 'PENDING_COD',
          totalAmount: '399000',
          itemCount: 1,
          createdAt: '2026-02-24T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đã giao hàng')).toBeInTheDocument();
    expect(screen.queryByText(' completed ')).not.toBeInTheDocument();
  });

  it('passes canonical cancelled-like payment aliases through the shared payment badge', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [
        {
          orderId: 20,
          orderNumber: 'ORD-20',
          orderCode: 'OD20260020',
          status: 'processing',
          paymentMethod: 'vnpay',
          paymentStatus: 'canceled',
          totalAmount: '399000',
          itemCount: 1,
          createdAt: '2026-02-24T08:00:00.000Z',
        },
        {
          orderId: 21,
          orderNumber: 'ORD-21',
          orderCode: 'OD20260021',
          status: 'processing',
          paymentMethod: 'vnpay',
          paymentStatus: 'needs_review',
          totalAmount: '499000',
          itemCount: 1,
          createdAt: '2026-02-24T09:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('#ORD-20')).toBeInTheDocument();

    expect(paymentBadgePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: 'vnpay',
        paymentStatus: 'canceled',
      }),
    );
    expect(paymentBadgePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: 'vnpay',
        paymentStatus: 'needs_review',
      }),
    );
  });

  it('hides pending payment badges when the order itself is already cancelled', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [
        {
          orderId: 22,
          orderNumber: 'ORD-22',
          orderCode: 'OD20260022',
          status: 'cancelled',
          paymentMethod: 'vnpay',
          paymentStatus: 'PENDING_VNPAY',
          totalAmount: '431000',
          itemCount: 1,
          createdAt: '2026-04-01T12:45:14.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('#ORD-22')).toBeInTheDocument();
    expect(screen.queryByTestId('payment-badge')).not.toBeInTheDocument();
    expect(paymentBadgePropsMock).not.toHaveBeenCalled();
  });

  it('still shows terminal payment badges for cancelled orders', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [
        {
          orderId: 23,
          orderNumber: 'ORD-23',
          orderCode: 'OD20260023',
          status: 'cancelled',
          paymentMethod: 'vnpay',
          paymentStatus: 'paid',
          totalAmount: '531000',
          itemCount: 1,
          createdAt: '2026-04-01T12:55:14.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('#ORD-23')).toBeInTheDocument();
    expect(screen.getByTestId('payment-badge')).toBeInTheDocument();
    expect(paymentBadgePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: 'vnpay',
        paymentStatus: 'paid',
      }),
    );
  });

  it('renders refund update summary on an order card when a linked return exists', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [
        {
          orderId: 13,
          orderNumber: 'ORD-13',
          orderCode: 'OD20260013',
          status: 'delivered',
          paymentMethod: 'vnpay',
          paymentStatus: 'paid',
          totalAmount: '499000',
          itemCount: 2,
          createdAt: '2026-03-26T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getMyReturnSummaries.mockResolvedValueOnce([
      {
        returnRequestId: 201,
        orderId: 13,
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'FAILED',
        totalRefundAmount: '100000',
        refundableCapAmount: '80000',
        economicsSummary: {
          totalGrossAmount: '100000',
          totalDiscountAmount: '20000',
          totalNetPaidAmount: '80000',
          totalRequestedRefundAmount: '80000',
          hasSnapshotBreakdown: true,
        },
        financeNote: 'Bộ phận hoàn tiền đang đối soát lại giao dịch.',
        financeNoteUpdatedAt: '2026-03-26T10:15:00.000Z',
        financeNoteUpdatedBy: { fullName: 'Bộ phận hỗ trợ' },
      },
    ]);

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đã chấp nhận hoàn tiền')).toBeInTheDocument();
    expect(screen.queryByText('Trạng thái hoàn tiền')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Xem thông tin hoàn hàng' }));

    await waitFor(() => {
      expect(screen.queryAllByText('Trạng thái hoàn tiền').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Hoàn tiền dự kiến')).toBeInTheDocument();
    expect(screen.getByText('80.000đ')).toBeInTheDocument();
    expect(screen.getByText('Theo tổng cũ: 100.000đ')).toBeInTheDocument();
    expect(screen.getByText(/Thực trả theo đơn gốc:\s*80\.000\s*đ/)).toBeInTheDocument();
    expect(screen.getByText(/Giá gốc 100\.000\s*đ · Giảm giá 20\.000\s*đ/)).toBeInTheDocument();
    expect(screen.getByText('Hoàn tiền thất bại')).toBeInTheDocument();
    expect(screen.getByText('Cập nhật hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('Bộ phận hoàn tiền đang đối soát lại giao dịch.')).toBeInTheDocument();
    expect(screen.getByText(/Bộ phận hỗ trợ/)).toBeInTheDocument();
    expect(getMyReturnSummaries).toHaveBeenCalledWith(1, 1, { orderIds: [13] });
  });

  it('shows a dedicated returns tab and filters to orders with return requests only', async () => {
    getMyOrders.mockResolvedValue({
      orders: [
        {
          orderId: 31,
          orderNumber: 'ORD-31',
          orderCode: 'OD20260031',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          totalAmount: '199000',
          itemCount: 1,
          createdAt: '2026-03-26T08:00:00.000Z',
        },
        {
          orderId: 32,
          orderNumber: 'ORD-32',
          orderCode: 'OD20260032',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          totalAmount: '259000',
          itemCount: 1,
          createdAt: '2026-03-27T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
    });
    getMyReturnSummaries.mockResolvedValue([
      {
        returnRequestId: 3201,
        orderId: 32,
        workflowStatus: 'REJECTED',
        refundStatus: 'FAILED',
      },
    ]);

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('#ORD-31')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hoàn hàng' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Hoàn hàng' }));

    await waitFor(() => {
      expect(
        screen.getByText((_, node) => node?.textContent?.trim() === '#ORD-32'),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText((_, node) => node?.textContent?.trim() === '#ORD-31')).not.toBeInTheDocument();
    expect(screen.getByText('Đã từ chối')).toBeInTheDocument();
  });

  it('uses the return badge as the primary headline and hides payment badge for cards with returns', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [
        {
          orderId: 33,
          orderNumber: 'ORD-33',
          orderCode: 'OD20260033',
          status: 'delivered',
          paymentMethod: 'vnpay',
          paymentStatus: 'paid',
          totalAmount: '359000',
          itemCount: 1,
          createdAt: '2026-03-27T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getMyReturnSummaries.mockResolvedValueOnce([
      {
        returnRequestId: 3301,
        orderId: 33,
        workflowStatus: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'NOT_APPLICABLE',
      },
    ]);

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Chờ duyệt')).toBeInTheDocument();
    expect(screen.queryByTestId('payment-badge')).not.toBeInTheDocument();
  });

  it('navigates to the return route directly from an order card when an active return exists', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [
        {
          orderId: 21,
          orderNumber: 'ORD-21',
          orderCode: 'OD20260021',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          totalAmount: '499000',
          itemCount: 2,
          createdAt: '2026-03-26T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getMyReturnSummaries.mockResolvedValueOnce([
      {
        returnRequestId: 211,
        orderId: 21,
        workflowStatus: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'NOT_APPLICABLE',
      },
    ]);

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Xem thông tin hoàn hàng' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Xem hoàn trả' }));

    expect(navigateMock).toHaveBeenCalledWith('/orders/21/return');
  });

  it('falls back to totalRefundAmount on an order card when refundableCapAmount is unavailable', async () => {
    getMyOrders.mockResolvedValue({
      orders: [
        {
          orderId: 18,
          orderNumber: 'ORD-18',
          orderCode: 'OD20260018',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          totalAmount: '199000',
          itemCount: 1,
          createdAt: '2026-03-26T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getMyReturnSummaries.mockResolvedValue([
      {
        returnRequestId: 202,
        orderId: 18,
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PENDING',
        refundableCapAmount: null,
        totalRefundAmount: '50000',
        financeNote: null,
        financeNoteUpdatedAt: null,
        financeNoteUpdatedBy: null,
      },
    ]);

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Xem thông tin hoàn hàng' }));

    expect(await screen.findByText('Hoàn tiền dự kiến')).toBeInTheDocument();
    expect(screen.getByText('50.000đ')).toBeInTheDocument();
    expect(screen.queryByText(/Theo tổng cũ:/)).not.toBeInTheDocument();
  });

  it('still renders orders when the return-summary batch request fails', async () => {
    getMyOrders.mockResolvedValueOnce({
      orders: [
        {
          orderId: 14,
          orderNumber: 'ORD-14',
          orderCode: 'OD20260014',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          totalAmount: '199000',
          itemCount: 1,
          createdAt: '2026-03-26T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getMyReturnSummaries.mockRejectedValueOnce(new Error('batch return fetch failed'));

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('#ORD-14')).toBeInTheDocument();
    expect(screen.queryByText('Trạng thái hoàn tiền')).not.toBeInTheDocument();
    expect(screen.queryByText('Cập nhật hoàn tiền')).not.toBeInTheDocument();
    expect(getMyReturnSummaries).toHaveBeenCalledWith(1, 1, { orderIds: [14] });
  });

  it('uses updatedSince on refresh when the visible order set is unchanged', async () => {
    getMyOrders.mockResolvedValue({
      orders: [
        {
          orderId: 15,
          orderNumber: 'ORD-15',
          orderCode: 'OD20260015',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          totalAmount: '159000',
          itemCount: 1,
          createdAt: '2026-03-26T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getMyReturnSummaries
      .mockResolvedValueOnce([
        {
          returnRequestId: 301,
          orderId: 15,
          workflowStatus: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'FAILED',
          updatedAt: '2026-03-26T10:45:00.000Z',
          financeNote: null,
        },
      ])
      .mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đã chấp nhận hoàn tiền')).toBeInTheDocument();
    expect(getMyReturnSummaries).toHaveBeenNthCalledWith(1, 1, 1, { orderIds: [15] });

    await userEvent.click(screen.getByRole('button', { name: 'Làm mới' }));

    await waitFor(() => expect(getMyReturnSummaries).toHaveBeenCalledTimes(2));
    expect(getMyReturnSummaries).toHaveBeenNthCalledWith(
      2,
      1,
      1,
      {
        orderIds: [15],
        updatedSince: '2026-03-26T10:45:00.000Z',
      },
    );
  });

  it('reloads visible summaries when a return-summary invalidation event is dispatched', async () => {
    getMyOrders.mockResolvedValue({
      orders: [
        {
          orderId: 16,
          orderNumber: 'ORD-16',
          orderCode: 'OD20260016',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          totalAmount: '259000',
          itemCount: 1,
          createdAt: '2026-03-26T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getMyReturnSummaries
      .mockResolvedValueOnce([
        {
          returnRequestId: 401,
          orderId: 16,
          workflowStatus: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'FAILED',
          updatedAt: '2026-03-26T09:45:00.000Z',
          financeNote: null,
        },
      ])
      .mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đã chấp nhận hoàn tiền')).toBeInTheDocument();
    expect(getMyOrders).toHaveBeenCalledTimes(1);
    expect(getMyReturnSummaries).toHaveBeenNthCalledWith(1, 1, 1, { orderIds: [16] });

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(RETURN_SUMMARY_CHANGED_EVENT, {
          detail: { orderId: 16, returnRequestId: 401 },
        }),
      );
    });

    await waitFor(() => expect(getMyOrders).toHaveBeenCalledTimes(2));
    expect(getMyReturnSummaries).toHaveBeenNthCalledWith(2, 1, 1, {
      orderIds: [16],
      updatedSince: '2026-03-26T09:45:00.000Z',
    });
  });

  it('guides customers back to order detail when COD refund is still locked', async () => {
    const shouldAutoRefreshSpy = vi
      .spyOn(returnRefreshUtils, 'shouldAutoRefreshRefundState')
      .mockReturnValue(false);

    getMyOrders.mockResolvedValue({
      orders: [
        {
          orderId: 18,
          orderNumber: 'ORD-18',
          orderCode: 'OD20260018',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'PENDING_COD',
          totalAmount: '199000',
          itemCount: 1,
          createdAt: '2026-03-26T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getMyReturnSummaries.mockResolvedValueOnce([
      {
        returnRequestId: 501,
        orderId: 18,
        workflowStatus: 'PENDING_PAYMENT_CONFIRMATION',
        refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
        totalRefundAmount: '199000',
        updatedAt: '2026-03-26T09:45:00.000Z',
        financeNote: null,
      },
    ]);

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Xem thông tin hoàn hàng' }));

    await waitFor(() => {
      expect(screen.queryAllByText('Khóa tới khi xác nhận thanh toán').length).toBeGreaterThan(0);
    });
    expect(
      screen.getByText('Mở đơn hàng và xác nhận đã nhận hàng để tiếp tục xử lý hoàn trả.'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mở đơn hàng để xác nhận đã nhận hàng' }));

    expect(navigateMock).toHaveBeenCalledWith('/orders/18');
    shouldAutoRefreshSpy.mockRestore();
  });

  it('polls visible refund-active summaries automatically', async () => {
    getMyOrders.mockResolvedValue({
      orders: [
        {
          orderId: 17,
          orderNumber: 'ORD-17',
          orderCode: 'OD20260017',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          totalAmount: '259000',
          itemCount: 1,
          createdAt: '2026-03-26T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getMyReturnSummaries
      .mockResolvedValueOnce([
        {
          returnRequestId: 402,
          orderId: 17,
          workflowStatus: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PROCESSING',
          updatedAt: '2026-03-26T09:55:00.000Z',
          financeNote: null,
        },
      ])
      .mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đã chấp nhận hoàn tiền')).toBeInTheDocument();

    await waitFor(() => expect(getMyReturnSummaries.mock.calls.length).toBeGreaterThanOrEqual(2), {
      timeout: RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS * 20,
    });
    expect(
      getMyReturnSummaries.mock.calls.slice(1).some((args) => (
        args[0] === 1
        && args[1] === 1
        && JSON.stringify(args[2]) === JSON.stringify({
          orderIds: [17],
          updatedSince: '2026-03-26T09:55:00.000Z',
        })
      )),
    ).toBe(true);
  });

  it('does not poll refund-active summaries while the tab is hidden', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });

    getMyOrders.mockResolvedValue({
      orders: [
        {
          orderId: 18,
          orderNumber: 'ORD-18',
          orderCode: 'OD20260018',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          totalAmount: '259000',
          itemCount: 1,
          createdAt: '2026-03-26T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getMyReturnSummaries.mockResolvedValue([
      {
        returnRequestId: 403,
        orderId: 18,
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PROCESSING',
        updatedAt: '2026-03-26T09:55:00.000Z',
        financeNote: null,
      },
    ]);

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đã chấp nhận hoàn tiền')).toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS * 4));
    });

    expect(getMyReturnSummaries).toHaveBeenCalledTimes(1);
  });

  it('refreshes refund-active summaries immediately when the tab becomes visible again', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });

    getMyOrders.mockResolvedValue({
      orders: [
        {
          orderId: 19,
          orderNumber: 'ORD-19',
          orderCode: 'OD20260019',
          status: 'delivered',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          totalAmount: '259000',
          itemCount: 1,
          createdAt: '2026-03-26T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
    getMyReturnSummaries
      .mockResolvedValueOnce([
        {
          returnRequestId: 404,
          orderId: 19,
          workflowStatus: 'ACCEPTED_FOR_REFUND',
          refundStatus: 'PROCESSING',
          updatedAt: '2026-03-26T09:55:00.000Z',
          financeNote: null,
        },
      ])
      .mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <MyOrders />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Đã chấp nhận hoàn tiền')).toBeInTheDocument();
    expect(getMyReturnSummaries).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(getMyReturnSummaries.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(
      getMyReturnSummaries.mock.calls.slice(1).some((args) => (
        args[0] === 1
        && args[1] === 1
        && JSON.stringify(args[2]) === JSON.stringify({
          orderIds: [19],
          updatedSince: '2026-03-26T09:55:00.000Z',
        })
      )),
    ).toBe(true);
  });
});
