import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { OrderFinancials } from '@/admin/components/OrderFinancials';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/admin/services/refund.service', () => ({}));

describe('OrderFinancials', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders fallback-safe refund history chrome and rows', () => {
    render(
      <OrderFinancials
        loading={false}
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
    expect(screen.getByText('Ngày tạo')).toBeInTheDocument();
    expect(screen.getByText('Mã đối soát')).toBeInTheDocument();
    expect(screen.getByText('Số tiền')).toBeInTheDocument();
    expect(screen.getAllByText('Phương thức')[0]).toBeInTheDocument();
    expect(screen.getByText('Trạng thái')).toBeInTheDocument();
    expect(screen.getByText('Hoàn qua cổng thanh toán gốc')).toBeInTheDocument();
    expect(screen.getByText('Thành công')).toBeInTheDocument();
    expect(screen.getByText('(Toàn bộ)')).toBeInTheDocument();
  });

  it('renders fallback-safe empty state', () => {
    render(<OrderFinancials loading={false} refunds={[]} />);

    expect(screen.getByText('Chưa có giao dịch hoàn tiền nào')).toBeInTheDocument();
  });
});
