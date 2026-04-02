import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { OrderFinancials } from '@/admin/components/OrderFinancials';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/admin/services/refund.service', () => ({
  getTotalCollectedAmount: (payments: Array<{ amount?: string | number | null; status?: string | null }>) =>
    payments.reduce((sum, payment) => {
      const normalizedStatus = String(payment?.status ?? '').trim().toUpperCase();
      if (!['COMPLETED', 'PAID', 'SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(normalizedStatus)) {
        return sum;
      }
      return sum + Number(payment?.amount ?? 0);
    }, 0),
  getSuccessfulRefundedAmount: (
    refunds: Array<{ amount?: string | number | null; status?: string | null }>,
  ) =>
    refunds
      .filter((refund) => ((refund.status ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase() || 'PENDING') === 'SUCCESS')
      .reduce((sum, refund) => sum + Number(refund.amount ?? 0), 0),
  getRemainingRefundableAmount: (
    payments: Array<{ amount?: string | number | null; status?: string | null }>,
    refunds: Array<{ amount?: string | number | null; status?: string | null }>,
  ) => {
    const totalCollected = payments.reduce((sum, payment) => {
      const normalizedStatus = String(payment?.status ?? '').trim().toUpperCase();
      if (!['COMPLETED', 'PAID', 'SUCCESS', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(normalizedStatus)) {
        return sum;
      }
      return sum + Number(payment?.amount ?? 0);
    }, 0);
    const totalRefunded = refunds
      .filter((refund) => ((refund.status ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase() || 'PENDING') === 'SUCCESS')
      .reduce((sum, refund) => sum + Number(refund.amount ?? 0), 0);
    return Math.max(totalCollected - totalRefunded, 0);
  },
  normalizeRefundStatus: (status: string | null | undefined) =>
    (status ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase() || 'PENDING',
  getProcessingRefund: (refunds: Array<{ status?: string | null }>) =>
    refunds.find((refund) => ((refund.status ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase() || 'PENDING') === 'PROCESSING'),
  getRefundProcessingState: (refunds: Array<{ status?: string | null }>) => {
    const processingRefund = refunds.find(
      (refund) => ((refund.status ?? '').trim().replace(/[\s-]+/g, '_').toUpperCase() || 'PENDING') === 'PROCESSING',
    );
    return {
      processingRefund,
      isLocked: Boolean(processingRefund),
    };
  },
}));

describe('OrderFinancials', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders fallback-safe refund history chrome and rows', () => {
    render(
      <OrderFinancials
        loading={false}
        payments={[
          { amount: '200000', status: 'PAID' },
        ] as any}
        refunds={[
          {
            refundId: 1,
            orderId: 42,
            amount: 50000,
            type: 'FULL',
            method: 'ORIGINAL_GATEWAY',
            status: 'SUCCESS',
            gatewayTransactionId: 'TXN-001',
            gatewayError: null,
            createdAt: '2026-03-20T08:30:00.000Z',
          },
        ] as any}
      />,
    );

    expect(screen.getByText('Lịch sử tài chính')).toBeInTheDocument();
    expect(screen.getByText('1 giao dịch')).toBeInTheDocument();
    expect(screen.getByText('Đã thu')).toBeInTheDocument();
    expect(screen.getByText('Đã hoàn')).toBeInTheDocument();
    expect(screen.getByText('Còn có thể hoàn')).toBeInTheDocument();
    expect(screen.getByText('Ngày tạo')).toBeInTheDocument();
    expect(screen.getByText('Mã đối soát')).toBeInTheDocument();
    expect(screen.getByText('Số tiền')).toBeInTheDocument();
    expect(screen.getAllByText('Phương thức')[0]).toBeInTheDocument();
    expect(screen.getByText('Trạng thái')).toBeInTheDocument();
    expect(screen.getByText('Hoàn qua cổng thanh toán gốc')).toBeInTheDocument();
    expect(screen.getByText('Thành công')).toBeInTheDocument();
    expect(screen.getByText('(Toàn bộ)')).toBeInTheDocument();
  });

  it('renders collected, refunded, and remaining summary values from payment and refund rows', () => {
    render(
      <OrderFinancials
        loading={false}
        payments={[
          { amount: '200000', status: 'PAID' },
          { amount: '50000', status: 'PENDING' },
        ] as any}
        refunds={[
          {
            refundId: 1,
            orderId: 42,
            amount: 50000,
            type: 'PARTIAL',
            method: 'BANK_TRANSFER',
            status: 'SUCCESS',
            gatewayTransactionId: 'TXN-001',
            gatewayError: null,
            createdAt: '2026-03-20T08:30:00.000Z',
          },
        ] as any}
      />,
    );

    expect(screen.getByText(/200\.000/)).toBeInTheDocument();
    expect(screen.getAllByText(/50\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/150\.000/)).toBeInTheDocument();
  });

  it('prefers backend refund summary values when provided', () => {
    render(
      <OrderFinancials
        loading={false}
        payments={[
          { amount: '200000', status: 'PAID' },
        ] as any}
        refunds={[
          {
            refundId: 1,
            orderId: 42,
            amount: 50000,
            type: 'PARTIAL',
            method: 'BANK_TRANSFER',
            status: 'SUCCESS',
            gatewayTransactionId: 'TXN-001',
            gatewayError: null,
            createdAt: '2026-03-20T08:30:00.000Z',
          },
        ] as any}
        summary={{
          totalCollected: 180000,
          totalRefunded: 40000,
          remainingRefundable: 140000,
        }}
      />,
    );

    expect(screen.getByText(/^180\.000\s₫$/)).toBeInTheDocument();
    expect(screen.getByText(/^40\.000\s₫$/)).toBeInTheDocument();
    expect(screen.getByText(/^140\.000\s₫$/)).toBeInTheDocument();
  });

  it('renders a fully-refunded notice when no refundable balance remains', () => {
    render(
      <OrderFinancials
        loading={false}
        payments={[
          { amount: '200000', status: 'PAID' },
        ] as any}
        refunds={[
          {
            refundId: 1,
            orderId: 42,
            amount: 200000,
            type: 'FULL',
            method: 'BANK_TRANSFER',
            status: 'SUCCESS',
            gatewayTransactionId: 'TXN-001',
            gatewayError: null,
            createdAt: '2026-03-20T08:30:00.000Z',
          },
        ] as any}
      />,
    );

    expect(
      screen.getByText('Đơn hàng này đã hoàn hết số tiền đã thu. Không còn số dư để tạo thêm giao dịch hoàn tiền.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/^0\s₫$/)).toBeInTheDocument();
  });

  it('renders fallback-safe empty state', () => {
    render(<OrderFinancials loading={false} refunds={[]} />);

    expect(screen.getByText('Chưa có giao dịch hoàn tiền nào')).toBeInTheDocument();
  });

  it('normalizes lowercase failed statuses before rendering error details', () => {
    render(
      <OrderFinancials
        loading={false}
        refunds={[
          {
            refundId: 2,
            orderId: 42,
            amount: 50000,
            type: 'PARTIAL',
            method: 'BANK_TRANSFER',
            status: 'failed' as any,
            gatewayTransactionId: null,
            gatewayError: 'Gateway timeout',
            createdAt: '2026-03-20T08:30:00.000Z',
          },
        ] as any}
      />,
    );

    expect(screen.getByText('Thất bại')).toBeInTheDocument();
    expect(screen.getByText('Gateway timeout')).toBeInTheDocument();
  });

  it('renders in-flight gateway details for processing refunds', () => {
    render(
      <OrderFinancials
        loading={false}
        refunds={[
          {
            refundId: 3,
            orderId: 42,
            amount: 50000,
            type: 'PARTIAL',
            method: 'ORIGINAL_GATEWAY',
            status: 'PROCESSING',
            gatewayTransactionId: 'TXN-003',
            gatewayError: 'VNPay: Refund request is still in progress - Error code 94',
            createdAt: '2026-03-20T08:30:00.000Z',
          },
        ] as any}
      />,
    );

    expect(screen.getByText('Đang xử lý')).toBeInTheDocument();
    expect(
      screen.getByText('VNPay: Refund request is still in progress - Error code 94'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Đơn hàng này đang có một yêu cầu hoàn tiền khác đang được xử lý. Hãy chờ cổng thanh toán phản hồi hoặc cập nhật giao dịch hiện tại trước khi tạo yêu cầu mới.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tín hiệu gần nhất từ cổng: VNPay: Refund request is still in progress - Error code 94'),
    ).toBeInTheDocument();
  });
});
