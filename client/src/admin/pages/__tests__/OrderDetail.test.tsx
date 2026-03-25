import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getDetailMock = vi.hoisted(() => vi.fn());
const listRefundsMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const showToastMock = vi.hoisted(() => vi.fn());
const i18nMode = vi.hoisted(() => ({ rawKeys: false }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      i18nMode.rawKeys ? key : String(options?.defaultValue ?? key),
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useParams: () => ({ id: '101' }),
}));

vi.mock('@/common/services/order.service', () => ({
  adminOrderService: {
    getDetail: (...args: unknown[]) => getDetailMock(...args),
  },
}));

vi.mock('@/admin/services/refund.service', () => ({
  adminRefundService: {
    list: (...args: unknown[]) => listRefundsMock(...args),
  },
}));

vi.mock('@/common/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}));

vi.mock('@/admin/pages/Orders', () => ({
  formatVND: (value: string | number) => `VND:${String(value)}`,
}));

vi.mock('@/common/utils/cloudinary', () => ({
  getImageUrl: (url: string) => url,
}));

vi.mock('@/common/utils/paymentStatus', () => ({
  getPaymentStatusMeta: () => ({
    isPaidLike: true,
    textClass: 'text-emerald-300',
    labelKey: 'paymentStatus.PAID',
    defaultLabel: 'Đã thanh toán',
  }),
}));

vi.mock('@/admin/components/OrderActionPanel', () => ({
  OrderActionPanel: () => <div data-testid="order-action-panel" />,
}));

vi.mock('@/admin/components/OrderTimeline', () => ({
  OrderTimeline: () => <div data-testid="order-timeline" />,
}));

vi.mock('@/admin/components/OrderStatusBadge', () => ({
  OrderStatusBadge: ({ status }: { status: string }) => <div data-testid="status-pill">{status}</div>,
}));

vi.mock('@/common/utils/orderUiStatus', () => ({
  getOrderStatusDisplayMeta: (status: string) => ({
    meta: {
      label: status === 'RETURN_REQUESTED' ? 'Yêu cầu trả hàng' : status,
      badgeClass: 'badge',
      textClass: 'text-white',
    },
  }),
}));

vi.mock('@/admin/components/RefundDialog', () => ({
  RefundDialog: () => <div data-testid="refund-dialog" />,
}));

vi.mock('@/admin/components/OrderFinancials', () => ({
  OrderFinancials: () => <div data-testid="order-financials" />,
}));

vi.mock('@/common/components/PaymentStatusBadge', () => ({
  PaymentMethodLabel: ({ paymentMethod }: { paymentMethod?: string | null }) => <span>{paymentMethod}</span>,
  PaymentStatusBadge: () => <span>payment-status</span>,
}));

vi.mock('@/admin/components/AdminUI', () => ({
  AdminPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AdminSectionCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AdminSecondaryButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  AdminPageHeader: ({
    eyebrow,
    title,
    subtitle,
    meta,
  }: {
    eyebrow?: React.ReactNode;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    meta?: React.ReactNode;
  }) => (
    <header>
      {eyebrow ? <div>{eyebrow}</div> : null}
      <div>{title}</div>
      {subtitle ? <div>{subtitle}</div> : null}
      {meta ? <div>{meta}</div> : null}
    </header>
  ),
}));

import { OrderDetail } from '@/admin/pages/OrderDetail';

describe('Admin OrderDetail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18nMode.rawKeys = false;
    listRefundsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    i18nMode.rawKeys = false;
  });

  it('keeps admin order detail chrome readable when translations return raw keys', async () => {
    i18nMode.rawKeys = true;
    getDetailMock.mockResolvedValue({
      orderId: 101,
      orderNumber: 'OD-101',
      trackingCode: 'TRK-101',
      status: 'RETURN_REQUESTED',
      paymentStatus: 'PAID',
      paymentMethod: 'COD',
      totalAmount: '450000',
      note: 'Khách muốn đổi size',
      createdAt: '2026-03-25T10:00:00.000Z',
      deliveryProof: {
        images: ['https://cdn.example.com/proof-1.jpg'],
        reviewed: false,
      },
      shippingAddress: {
        recipientName: 'Nguyen Van A',
        phone: '0900000000',
        city: 'Ho Chi Minh',
        district: 'District 1',
        addressDetail: '123 Nguyen Hue',
      },
      user: null,
      items: [
        {
          orderItemId: 1,
          productId: 'p-1',
          productName: 'Ao khoac',
          sku: 'SKU-1',
          variantName: 'Den',
          quantity: 1,
          unitPrice: '450000',
          lineTotal: '450000',
          image: null,
        },
      ],
      payments: [
        {
          paymentId: 1,
          method: 'COD',
          amount: '450000',
          status: 'PAID',
          paidAt: '2026-03-25T10:05:00.000Z',
        },
      ],
      statusHistory: [],
    });

    render(<OrderDetail />);

    await waitFor(() => {
      expect(screen.getByText('Quay lại danh sách')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Quay lại danh sách').length).toBeGreaterThan(0);
    expect(screen.getByText('Hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng')).toBeInTheDocument();
    expect(screen.getAllByText(/Đặt lúc /i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Mã vận đơn/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Sản phẩm (1)')).toBeInTheDocument();
    expect(screen.getByText('Khách vãng lai')).toBeInTheDocument();
    expect(screen.getByText('Lịch sử trạng thái')).toBeInTheDocument();
    expect(screen.getByText('Bằng chứng giao hàng')).toBeInTheDocument();
    expect(screen.getByText('Chưa duyệt bằng chứng')).toBeInTheDocument();
    expect(screen.getByText('Xem ảnh 1')).toBeInTheDocument();
  });
});
