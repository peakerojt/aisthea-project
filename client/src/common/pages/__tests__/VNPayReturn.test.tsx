import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { VNPayReturn } from '@/common/pages/VNPayReturn';

const navigate = vi.fn();

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useSearchParams: () => [new URLSearchParams('')],
}));

vi.mock('@/store/components/Header', () => ({
  Header: () => <div data-testid="store-header" />,
}));

vi.mock('@/common/components/CheckoutProgress', () => ({
  CheckoutProgress: ({ steps }: { steps: Array<{ label: string }> }) => (
    <div data-testid="checkout-progress">{steps.map((step) => step.label).join(' | ')}</div>
  ),
}));

vi.mock('@/common/components/OrderSummaryRail', () => ({
  OrderSummaryRail: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock('@/common/components/PaymentStatusBadge', () => ({
  PaymentStatusBadge: () => <span>Đang xác nhận thanh toán</span>,
  PaymentMethodLabel: () => <span>VNPay</span>,
}));

vi.mock('@/common/utils/orderSnapshot', () => ({
  getLatestOrderData: () => null,
}));

describe('VNPayReturn', () => {
  beforeEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders translated payment-return chrome with fallback-safe labels', async () => {
    render(<VNPayReturn />);

    expect(screen.getByText('Hoàn tất xác thực thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Kết quả thanh toán VNPAY')).toBeInTheDocument();
    expect(await screen.findByText('Lỗi khi xác thực thanh toán VNPAY.')).toBeInTheDocument();
    expect(screen.getByText('Trạng thái thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Phương thức thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Tiếp theo')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng (0 sản phẩm)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quản lý đơn hàng' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tiếp tục mua hàng' })).toBeInTheDocument();
  });
});
