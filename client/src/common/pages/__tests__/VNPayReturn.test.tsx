import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VNPayReturn } from '@/common/pages/VNPayReturn';

const navigate = vi.fn();
const apiGetMock = vi.hoisted(() => vi.fn());
const redirectToVnpayPaymentMock = vi.hoisted(() => vi.fn());
const latestOrderDataMock = vi.hoisted(() => vi.fn(() => null));
const searchParamMode = vi.hoisted(() => ({ value: '' }));

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
  useSearchParams: () => [new URLSearchParams(searchParamMode.value)],
}));

vi.mock('@/common/utils/api', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}));

vi.mock('@/common/services/vnpay.service', () => ({
  redirectToVnpayPayment: (...args: unknown[]) => redirectToVnpayPaymentMock(...args),
  canRetryVnpayPayment: ({
    orderStatus,
    paymentMethod,
    paymentStatus,
  }: {
    orderStatus?: string | null;
    paymentMethod?: string | null;
    paymentStatus?: string | null;
  }) =>
    (paymentMethod ?? '').trim().toUpperCase() === 'VNPAY'
      && (orderStatus ?? '').trim().toUpperCase() === 'PENDING'
      && ['PENDING_VNPAY', 'FAILED', 'CANCELLED'].includes((paymentStatus ?? '').trim().toUpperCase()),
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
  PaymentStatusBadge: ({ paymentStatus }: { paymentStatus: string }) => <span data-testid="payment-status-badge">{paymentStatus}</span>,
  PaymentMethodLabel: () => <span>VNPay</span>,
}));

vi.mock('@/common/utils/orderSnapshot', () => ({
  getLatestOrderData: () => latestOrderDataMock(),
}));

describe('VNPayReturn', () => {
  beforeEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.useRealTimers();
    searchParamMode.value = '';
    latestOrderDataMock.mockReturnValue(null);
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

  it('normalizes lowercase completed payment responses before showing success state', async () => {
    searchParamMode.value = 'vnp_TransactionStatus=00';
    apiGetMock.mockResolvedValue({
      paymentStatus: 'completed',
      code: '00',
    });

    render(<VNPayReturn />);

    expect(await screen.findByText('Thanh toán VNPAY thành công!')).toBeInTheDocument();
    expect(screen.getByTestId('payment-status-badge')).toHaveTextContent('PAID');
    expect(screen.getByRole('button', { name: 'Xem xác nhận đơn' })).toBeInTheDocument();
  });

  it('keeps pending VNPay responses in the loading bucket with a canonical pending-vnpay status', async () => {
    searchParamMode.value = 'vnp_TransactionStatus=01';
    apiGetMock.mockResolvedValue({
      paymentStatus: 'pending_vnpay',
      code: 'PENDING',
    });

    render(<VNPayReturn />);

    expect(await screen.findByText('Đang xác thực kết quả thanh toán...')).toBeInTheDocument();
    expect(screen.getByTestId('payment-status-badge')).toHaveTextContent('PENDING_VNPAY');
  });

  it('renders a dedicated review state when the backend flags NEEDS_REVIEW', async () => {
    searchParamMode.value = 'vnp_TransactionStatus=99';
    apiGetMock.mockResolvedValue({
      paymentStatus: 'needs_review',
      code: '99',
    });

    render(<VNPayReturn />);

    expect(await screen.findByText('Thanh toán cần được kiểm tra thêm.')).toBeInTheDocument();
    expect(screen.getByTestId('payment-status-badge')).toHaveTextContent('NEEDS_REVIEW');
  });

  it('renders a dedicated cancelled state when the backend flags CANCELLED', async () => {
    searchParamMode.value = 'vnp_TransactionStatus=24';
    apiGetMock.mockResolvedValue({
      paymentStatus: 'canceled',
      code: '24',
    });

    render(<VNPayReturn />);

    expect(await screen.findByText('Thanh toán đã bị hủy.')).toBeInTheDocument();
    expect(screen.getByTestId('payment-status-badge')).toHaveTextContent('CANCELLED');
  });

  it('retries VNPay payment on the same order instead of sending the customer back to checkout', async () => {
    searchParamMode.value = 'vnp_TransactionStatus=24';
    apiGetMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/vnpay/vnpay_return')) {
        return Promise.resolve({
          paymentStatus: 'canceled',
          code: '24',
        });
      }

      if (url === '/api/orders/my/321') {
        return Promise.resolve({
          status: 'Pending',
          paymentMethod: 'VNPAY',
          paymentStatus: 'PENDING_VNPAY',
        });
      }

      return Promise.reject(new Error(`Unexpected API url: ${url}`));
    });
    redirectToVnpayPaymentMock.mockResolvedValue(undefined);
    latestOrderDataMock.mockReturnValue({
      orderId: 321,
      paymentMethod: 'VNPAY',
      items: [],
      shippingFee: 0,
      discountValue: 0,
      subtotal: 0,
      total: 0,
      fullName: '',
      email: '',
      phone: '',
      address: '',
      district: '',
      city: '',
      ward: '',
      note: '',
      shippingMethod: 'STANDARD',
    });

    render(<VNPayReturn />);

    await screen.findByText('Thanh toán đã bị hủy.');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại thanh toán' }));

    expect(redirectToVnpayPaymentMock).toHaveBeenCalledWith(321);
    expect(navigate).not.toHaveBeenCalledWith('/checkout');
  });

  it('hides retry payment when the live order is no longer eligible even if local snapshot still exists', async () => {
    searchParamMode.value = 'vnp_TransactionStatus=24';
    apiGetMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/vnpay/vnpay_return')) {
        return Promise.resolve({
          paymentStatus: 'canceled',
          code: '24',
        });
      }

      if (url === '/api/orders/my/321') {
        return Promise.resolve({
          status: 'Cancelled',
          paymentMethod: 'VNPAY',
          paymentStatus: 'CANCELLED',
        });
      }

      return Promise.reject(new Error(`Unexpected API url: ${url}`));
    });
    latestOrderDataMock.mockReturnValue({
      orderId: 321,
      paymentMethod: 'VNPAY',
      items: [],
      shippingFee: 0,
      discountValue: 0,
      subtotal: 0,
      total: 0,
      fullName: '',
      email: '',
      phone: '',
      address: '',
      district: '',
      city: '',
      ward: '',
      note: '',
      shippingMethod: 'STANDARD',
    });

    render(<VNPayReturn />);

    expect(await screen.findByText('Thanh toán đã bị hủy.')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Đơn hàng này không còn đủ điều kiện để tạo lại liên kết thanh toán. Vui lòng mở quản lý đơn hàng để xem trạng thái mới nhất hoặc liên hệ hỗ trợ.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thử lại thanh toán' })).not.toBeInTheDocument();
  });
});
