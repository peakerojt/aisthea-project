import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
        case 'detail.infoExpectedRefund':
          return 'Hoàn tiền dự kiến';
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
        default:
          return key;
      }
    },
  }),
}));

vi.mock('@/common/services/return.service', () => ({
  returnService: {
    detail: (...args: any[]) => detailMock(...args),
  },
}));

vi.mock('@/common/components/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('@/common/components/ReturnItemsTable', () => ({
  ReturnItemsTable: ({ items }: { items: unknown[] }) => (
    <div data-testid="return-items-table">{items.length} items</div>
  ),
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
      totalRefundAmount: '125000',
      createdAt: '2026-03-20T10:00:00.000Z',
      note: 'Khach yeu cau tra vi loi vai',
      items: [{ orderItemId: 1, quantity: 1 }],
      attachments: [{ attachmentId: 1, fileUrl: 'https://cdn.example.com/attachment-1.jpg' }],
      statusLogs: [{ logId: 1, toStatus: 'REQUESTED', createdAt: '2026-03-20T10:00:00.000Z' }],
      refundTransactions: [
        {
          transactionId: 99,
          amount: 125000,
          method: 'ORIGINAL_PAYMENT',
          status: 'SUCCESS',
          transactionRef: 'REF-123',
        },
      ],
    });

    renderPage();

    expect((await screen.findAllByRole('heading', { name: 'Yêu cầu #12' }))[0]).toBeInTheDocument();
    expect(screen.getByText(/Đơn hàng #101 · Tạo lúc/)).toBeInTheDocument();
    expect(screen.getAllByText('REFUNDED')).not.toHaveLength(0);
    expect(screen.getByText('Khach yeu cau tra vi loi vai')).toBeInTheDocument();
    expect(screen.getByText('Sản phẩm trả')).toBeInTheDocument();
    expect(screen.getByText('Ảnh minh chứng')).toBeInTheDocument();
    expect(screen.getAllByText('Lịch sử trạng thái')).not.toHaveLength(0);
    expect(screen.getByTestId('return-items-table')).toHaveTextContent('1 items');
    expect(screen.getByTestId('return-timeline')).toHaveTextContent('1 logs');
    expect(screen.getByRole('link', { name: 'Ảnh minh chứng 1' })).toHaveAttribute(
      'href',
      'https://cdn.example.com/attachment-1.jpg',
    );
    expect(screen.getByText('💰 125.000đ')).toBeInTheDocument();
    expect(screen.getByText('REF-123')).toBeInTheDocument();
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
});
