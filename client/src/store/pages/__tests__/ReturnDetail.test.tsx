import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RETURN_SUMMARY_CHANGED_EVENT } from '@/common/events/returnSummary.events';
import { RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS } from '@/common/utils/returnRefresh';

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

const detailMock = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      switch (key) {
        case 'detail.notFound':
          return `Không tìm thấy yêu cầu trả hàng #${String(options?.id ?? '')}.`;
        case 'detail.retry':
          return 'Thử lại';
        case 'detail.headerTitle':
          return `Yêu cầu #${String(options?.id ?? '')}`;
        case 'detail.headerSubtitle':
          return `Đơn hàng #${String(options?.orderId ?? '')} · Tạo lúc ${String(options?.date ?? '')}`;
        case 'detail.backToList':
          return 'Quay lại danh sách';
        case 'detail.infoTitle':
          return 'Thông tin yêu cầu';
        case 'detail.infoReason':
          return 'Lý do';
        case 'detail.infoStatus':
          return 'Trạng thái';
        case 'detail.infoRefundStatus':
          return 'Trạng thái hoàn tiền';
        case 'detail.infoFinanceUpdate':
          return 'Cập nhật hoàn tiền';
        case 'detail.infoFinanceUpdateMeta':
          return `Cập nhật ${String(options?.date ?? '')} bởi ${String(options?.actor ?? '')}`;
        case 'detail.infoExpectedRefund':
          return 'Hoàn tiền dự kiến';
        case 'detail.infoExpectedRefundHint':
          return 'Đã giới hạn theo số tiền thực trả của các sản phẩm trong yêu cầu này.';
        case 'detail.infoCreatedAt':
          return 'Ngày tạo';
        case 'detail.infoNote':
          return 'Ghi chú';
        case 'detail.attachmentAlt':
          return `Ảnh minh chứng ${String(options?.index ?? '')}`;
        case 'detail.transactionsTitle':
          return 'Giao dịch hoàn tiền';
        case 'detail.refundOriginal':
          return 'Hoàn về phương thức gốc';
        case 'detail.refundWallet':
          return 'Ví điện tử';
        case 'detail.refundBankTransfer':
          return 'Chuyển khoản ngân hàng';
        case 'detail.refundLocked':
          return 'Hoàn tiền đang bị khóa cho tới khi đơn hàng được xác nhận thanh toán.';
        case 'detail.refundLockedHint':
          return 'Mở đơn hàng và xác nhận đã nhận hàng để tiếp tục xử lý hoàn trả.';
        case 'detail.goToOrderForPaymentConfirmation':
          return 'Mở đơn hàng để xác nhận đã nhận hàng';
        case 'detail.transactionStatus.COMPLETED':
        case 'detail.transactionStatus.SUCCESS':
          return 'Hoàn tiền thành công';
        case 'detail.transactionStatus.PENDING':
          return 'Chờ hoàn tiền';
        case 'detail.transactionStatus.PROCESSING':
          return 'Đang hoàn tiền';
        case 'detail.transactionStatus.FAILED':
          return 'Hoàn tiền thất bại';
        case 'refundStatus.LOCKED_UNTIL_PAYMENT_CONFIRMED':
          return 'Khóa tới khi xác nhận thanh toán';
        case 'refundStatus.PARTIALLY_REFUNDED':
          return 'Hoàn tiền một phần';
        default:
          return key;
      }
    },
  }),
}));

vi.mock('@/common/services/return.detail-read.service', () => ({
  returnDetailReadService: {
    detail: (...args: any[]) => detailMock(...args),
  },
}));

vi.mock('@/common/components/ReturnTimeline', () => ({
  ReturnTimeline: ({ logs }: { logs: unknown[] }) => (
    <div data-testid="return-timeline">{logs.length} logs</div>
  ),
}));

vi.mock('@/common/components/ReasonLabel', () => ({
  ReasonLabel: ({ reason }: { reason: string }) => <span>{reason}</span>,
}));

import { ReturnDetail } from '@/store/pages/ReturnDetail';

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ReturnDetail returnId={12} onBack={vi.fn()} />
    </QueryClientProvider>,
  );
};

describe('ReturnDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders detail, attachments, and refund transactions', async () => {
    detailMock.mockResolvedValueOnce({
      returnRequestId: 12,
      orderId: 101,
      reason: 'DEFECTIVE',
      status: 'REFUNDED',
      workflowStatus: 'IN_RETURN_TRANSIT',
      refundStatus: 'PARTIALLY_REFUNDED',
      financeNote: 'Bộ phận hoàn tiền đang đối soát lại giao dịch trước khi xử lý tiếp.',
      financeNoteUpdatedAt: '2026-03-21T09:00:00.000Z',
      financeNoteUpdatedBy: { fullName: 'Bộ phận hỗ trợ' },
      totalRefundAmount: '125000',
      refundableCapAmount: '100000',
      createdAt: '2026-03-20T10:00:00.000Z',
      note: 'Khach yeu cau tra vi loi vai',
      items: [
        {
          orderItemId: 1,
          quantity: 1,
          requestedRefundAmount: 100000,
          orderItemGrossAmount: 125000,
          orderItemAllocatedDiscountAmount: 25000,
          orderItemNetPaidAmount: 100000,
        },
      ],
      attachments: [{ attachmentId: 1, fileUrl: 'https://cdn.example.com/attachment-1.jpg' }],
      statusLogs: [
        {
          logId: 1,
          toStatus: 'APPROVED',
          toWorkflowStatus: 'IN_RETURN_TRANSIT',
          createdAt: '2026-03-20T10:00:00.000Z',
        },
      ],
      refundTransactions: [
        {
          transactionId: 99,
          amount: 125000,
          method: 'ORIGINAL_GATEWAY',
          status: 'SUCCESS',
          transactionRef: 'REF-123',
        },
        {
          transactionId: 100,
          amount: 5000,
          method: 'BANK_TRANSFER',
          status: 'PENDING',
        },
      ],
    });

    renderPage();

    expect((await screen.findAllByRole('heading', { name: 'Yêu cầu #12' }))[0]).toBeInTheDocument();
    expect(screen.getByText(/Đơn hàng #101 · Tạo lúc/)).toBeInTheDocument();
    expect(screen.getAllByText('Đang hoàn về kho').length).toBeGreaterThan(0);
    expect(screen.getByText('Trạng thái hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('Hoàn tiền một phần')).toBeInTheDocument();
    expect(screen.getByText('Cập nhật hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('Bộ phận hoàn tiền đang đối soát lại giao dịch trước khi xử lý tiếp.')).toBeInTheDocument();
    expect(screen.getByText(/Cập nhật .* bởi Bộ phận hỗ trợ/)).toBeInTheDocument();
    expect(screen.getAllByText('100.000đ').length).toBeGreaterThan(0);
    expect(screen.getByText('Thực trả theo đơn gốc: 100.000đ')).toBeInTheDocument();
    expect(screen.getByText('Giá gốc 125.000đ · Giảm giá 25.000đ')).toBeInTheDocument();
    expect(screen.getByText('Theo tổng cũ: 125.000đ')).toBeInTheDocument();
    expect(
      screen.getByText('Đã giới hạn theo số tiền thực trả của các sản phẩm trong yêu cầu này.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Khach yeu cau tra vi loi vai')).toBeInTheDocument();
    expect(screen.getByText('Sản phẩm trả')).toBeInTheDocument();
    expect(screen.getByText('Chi tiết sản phẩm, lý do và số tiền hoàn theo từng dòng trong yêu cầu này.')).toBeInTheDocument();
    expect(screen.getByText('Ảnh minh chứng')).toBeInTheDocument();
    expect(screen.getByText('1 ảnh')).toBeInTheDocument();
    expect(screen.getByText('Nhấn vào ảnh để xem lớn')).toBeInTheDocument();
    expect(screen.getAllByText('Lịch sử trạng thái')).not.toHaveLength(0);
    expect(screen.getByText('Sản phẩm #1')).toBeInTheDocument();
    expect(screen.queryByText('Hoàn dự kiến')).not.toBeInTheDocument();
    expect(screen.queryByText('Tổng hoàn dự kiến:')).not.toBeInTheDocument();
    expect(screen.getByTestId('return-timeline')).toHaveTextContent('1 logs');
    await userEvent.click(screen.getByRole('button', { name: 'Xem ảnh minh chứng 1' }));
    expect(screen.getByRole('dialog', { name: 'Xem ảnh minh chứng' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog', { name: 'Xem ảnh minh chứng' })).getByRole('img', {
        name: 'Ảnh minh chứng 1',
      }),
    ).toHaveAttribute('src', 'https://cdn.example.com/attachment-1.jpg');
    await userEvent.click(screen.getByRole('button', { name: 'Đóng xem ảnh minh chứng' }));
    expect(screen.queryByRole('dialog', { name: 'Xem ảnh minh chứng' })).not.toBeInTheDocument();
    expect(screen.getAllByText('125.000đ').length).toBeGreaterThan(0);
    expect(screen.getByText('5.000đ')).toBeInTheDocument();
    expect(screen.getByText('Hoàn về phương thức gốc')).toBeInTheDocument();
    expect(screen.getByText('Chuyển khoản ngân hàng')).toBeInTheDocument();
    expect(screen.getByText('Hoàn tiền thành công')).toBeInTheDocument();
    expect(screen.getByText('Chờ hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('REF-123')).toBeInTheDocument();
  });

  it('shows refund lock notice when payment confirmation is still pending', async () => {
    detailMock.mockResolvedValue({
      returnRequestId: 12,
      orderId: 101,
      reason: 'WRONG_ITEM',
      status: 'REQUESTED',
      workflowStatus: 'PENDING_PAYMENT_CONFIRMATION',
      refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
      totalRefundAmount: '50000',
      createdAt: '2026-03-20T10:00:00.000Z',
      items: [],
      attachments: [],
      statusLogs: [],
      refundTransactions: [],
    });

    renderPage();

    expect((await screen.findAllByText('Chờ xác nhận thanh toán')).length).toBeGreaterThan(0);
    expect(
      screen.getByText('Hoàn tiền đang bị khóa cho tới khi đơn hàng được xác nhận thanh toán.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Mở đơn hàng và xác nhận đã nhận hàng để tiếp tục xử lý hoàn trả.'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Mở đơn hàng để xác nhận đã nhận hàng' }));

    expect(navigateMock).toHaveBeenCalledWith('/orders/101');
  });

  it('falls back to legacy total refund amount when refundable cap is unavailable', async () => {
    detailMock.mockResolvedValueOnce({
      returnRequestId: 12,
      orderId: 101,
      reason: 'WRONG_ITEM',
      status: 'REQUESTED',
      workflowStatus: 'ACCEPTED_FOR_REFUND',
      refundStatus: 'PENDING',
      totalRefundAmount: '50000',
      refundableCapAmount: null,
      createdAt: '2026-03-20T10:00:00.000Z',
      items: [],
      attachments: [],
      statusLogs: [],
      refundTransactions: [],
    });

    renderPage();

    expect(await screen.findByText('50.000đ')).toBeInTheDocument();
    expect(screen.queryByText(/Theo tổng cũ:/)).not.toBeInTheDocument();
    expect(
      screen.queryByText('Đã giới hạn theo số tiền thực trả của các sản phẩm trong yêu cầu này.'),
    ).not.toBeInTheDocument();
  });

  it('passes canonical workflow status to the status badge when detail lacks workflowStatus', async () => {
    detailMock.mockResolvedValueOnce({
      returnRequestId: 12,
      orderId: 101,
      reason: 'WRONG_ITEM',
      status: 'COMPLETED',
      workflowStatus: null,
      refundStatus: 'REFUNDED',
      totalRefundAmount: '50000',
      createdAt: '2026-03-20T10:00:00.000Z',
      items: [],
      attachments: [],
      statusLogs: [],
      refundTransactions: [],
    });

    renderPage();

    expect((await screen.findAllByText('Đã đóng')).length).toBeGreaterThan(0);
  });

  it('shows error state and retries fetching detail', async () => {
    detailMock
      .mockRejectedValueOnce(new Error('Không tải được chi tiết'))
      .mockResolvedValueOnce({
        returnRequestId: 12,
        orderId: 101,
        reason: 'WRONG_ITEM',
        status: 'REQUESTED',
        totalRefundAmount: '50000',
        createdAt: '2026-03-20T10:00:00.000Z',
        items: [],
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      });

    renderPage();

    expect(await screen.findByText('Không tải được chi tiết')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    await waitFor(() => {
      expect(detailMock).toHaveBeenCalledTimes(2);
    });
    expect((await screen.findAllByRole('heading', { name: 'Yêu cầu #12' }))[0]).toBeInTheDocument();
  });

  it('refetches the visible return detail when a matching summary event is dispatched', async () => {
    detailMock
      .mockResolvedValueOnce({
        returnRequestId: 12,
        orderId: 101,
        reason: 'DEFECTIVE',
        status: 'REQUESTED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'FAILED',
        totalRefundAmount: '50000',
        createdAt: '2026-03-20T10:00:00.000Z',
        items: [],
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      })
      .mockResolvedValueOnce({
        returnRequestId: 12,
        orderId: 101,
        reason: 'DEFECTIVE',
        status: 'REQUESTED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'FAILED',
        financeNote: 'Bộ phận hoàn tiền cần kiểm tra lại giao dịch.',
        financeNoteUpdatedAt: '2026-03-26T11:15:00.000Z',
        financeNoteUpdatedBy: { fullName: 'Bộ phận hỗ trợ' },
        totalRefundAmount: '50000',
        createdAt: '2026-03-20T10:00:00.000Z',
        items: [],
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      });

    renderPage();

    expect(await screen.findByText('Hoàn tiền thất bại')).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(RETURN_SUMMARY_CHANGED_EVENT, {
          detail: { orderId: 101, returnRequestId: 12 },
        }),
      );
    });

    await waitFor(() => {
      expect(detailMock).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('Hoàn tiền thất bại')).toBeInTheDocument();
    expect(screen.getByText('Bộ phận hoàn tiền cần kiểm tra lại giao dịch.')).toBeInTheDocument();
  });

  it('polls refund-active return detail automatically', async () => {
    detailMock
      .mockResolvedValueOnce({
        returnRequestId: 12,
        orderId: 101,
        reason: 'DEFECTIVE',
        status: 'REQUESTED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'PROCESSING',
        totalRefundAmount: '50000',
        createdAt: '2026-03-20T10:00:00.000Z',
        items: [],
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      })
      .mockResolvedValueOnce({
        returnRequestId: 12,
        orderId: 101,
        reason: 'DEFECTIVE',
        status: 'REQUESTED',
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'FAILED',
        financeNote: 'Cần kiểm tra lại cổng thanh toán.',
        financeNoteUpdatedAt: '2026-03-26T11:15:00.000Z',
        financeNoteUpdatedBy: { fullName: 'Bộ phận hỗ trợ' },
        totalRefundAmount: '50000',
        createdAt: '2026-03-20T10:00:00.000Z',
        items: [],
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      });

    renderPage();

    expect(await screen.findByText('Đang hoàn tiền')).toBeInTheDocument();

    await waitFor(() => {
      expect(detailMock).toHaveBeenCalledTimes(2);
    }, { timeout: RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS * 20 });
    expect(await screen.findByText('Hoàn tiền thất bại')).toBeInTheDocument();
    expect(screen.getByText('Cần kiểm tra lại cổng thanh toán.')).toBeInTheDocument();
  });

  it('polls locked COD return detail automatically until the request is unlocked', async () => {
    detailMock
      .mockResolvedValueOnce({
        returnRequestId: 12,
        orderId: 101,
        reason: 'DEFECTIVE',
        status: 'PENDING_PAYMENT_CONFIRMATION',
        workflowStatus: 'PENDING_PAYMENT_CONFIRMATION',
        refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
        totalRefundAmount: '50000',
        createdAt: '2026-03-20T10:00:00.000Z',
        items: [],
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      })
      .mockResolvedValueOnce({
        returnRequestId: 12,
        orderId: 101,
        reason: 'DEFECTIVE',
        status: 'PENDING_ADMIN_REVIEW',
        workflowStatus: 'PENDING_ADMIN_REVIEW',
        refundStatus: 'NOT_APPLICABLE',
        totalRefundAmount: '50000',
        createdAt: '2026-03-20T10:00:00.000Z',
        items: [],
        attachments: [],
        statusLogs: [],
        refundTransactions: [],
      });

    renderPage();

    expect(
      await screen.findByText('Hoàn tiền đang bị khóa cho tới khi đơn hàng được xác nhận thanh toán.'),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(detailMock).toHaveBeenCalledTimes(2);
    }, { timeout: RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS * 20 });

    await waitFor(() => {
      expect(
        screen.queryByText('Hoàn tiền đang bị khóa cho tới khi đơn hàng được xác nhận thanh toán.'),
      ).not.toBeInTheDocument();
    });
  });
});
