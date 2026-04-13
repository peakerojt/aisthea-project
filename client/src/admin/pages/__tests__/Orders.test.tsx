import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getAllMock = vi.hoisted(() => vi.fn());
const getTabCountsMock = vi.hoisted(() => vi.fn());
const bulkUpdateStatusMock = vi.hoisted(() => vi.fn());
const exportSelectedOrdersMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const searchParamsState = vi.hoisted(() => ({ value: '', params: new URLSearchParams() }));
const setSearchParamsMock = vi.hoisted(() => vi.fn());
const i18nMode = vi.hoisted(() => ({ rawKeys: false }));
const interpolateMock = (template: string, options?: Record<string, unknown>) =>
  template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token: string) => String(options?.[token] ?? ''));
const syncSearchParamsState = (nextValue: string) => {
  searchParamsState.value = nextValue;
  searchParamsState.params = new URLSearchParams(nextValue);
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const fallback = typeof options?.defaultValue === 'string'
        ? interpolateMock(options.defaultValue, options)
        : key;

      const translations: Record<string, string> = {
        'paymentStatus.CANCELLED': 'Thanh toán đã hủy',
        'paymentStatus.NEEDS_REVIEW': 'Cần kiểm tra thanh toán',
      };

      if (i18nMode.rawKeys) {
        return fallback;
      }

      return translations[key] ?? fallback;
    },
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useSearchParams: () => [searchParamsState.params, setSearchParamsMock],
}));

vi.mock('@/common/services/order.service', () => ({
  adminOrderService: {
    getAll: (...args: unknown[]) => getAllMock(...args),
    getTabCounts: (...args: unknown[]) => getTabCountsMock(...args),
    bulkUpdateStatus: (...args: unknown[]) => bulkUpdateStatusMock(...args),
    exportSelectedOrders: (...args: unknown[]) => exportSelectedOrdersMock(...args),
  },
}));

vi.mock('@/common/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('@/admin/components/AdminUI', () => ({
  AdminPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AdminSectionCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AdminBadge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AdminPageHeader: ({ title, meta }: { title: React.ReactNode; meta?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {meta ? <div>{meta}</div> : null}
    </header>
  ),
  AdminPrimaryButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  AdminToolbar: ({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) => (
    <div>
      <div>{children}</div>
      <div>{actions}</div>
    </div>
  ),
  AdminActionButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  AdminModalShell: ({ children, footer }: { children?: React.ReactNode; footer?: React.ReactNode }) => (
    <div>
      {children}
      {footer}
    </div>
  ),
  AdminTabs: ({ items }: { items: Array<{ label: React.ReactNode; count?: number }> }) => (
    <div>
      {items.map((item, index) => (
        <span key={index}>
          {item.label} {item.count}
        </span>
      ))}
    </div>
  ),
  AdminStatusFilterBar: ({
    items,
    isRefreshing,
  }: {
    items: Array<{ label: React.ReactNode; count?: number }>;
    isRefreshing?: boolean;
  }) => (
    <div data-testid="status-filter-bar" data-refreshing={isRefreshing ? 'true' : 'false'}>
      {items.map((item, index) => (
        <span key={index}>
          {item.label} {item.count}
        </span>
      ))}
    </div>
  ),
  AdminSecondaryButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  AdminEmptyState: ({ title, description }: { title: React.ReactNode; description?: React.ReactNode }) => (
    <div>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
  ),
  adminUiTokens: {
    fieldLabel: 'field-label',
    searchFieldControl: 'search-field',
    fieldControl: 'field-control',
  },
}));

import { Orders } from '@/admin/pages/Orders';

describe('Admin Orders page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18nMode.rawKeys = false;
    syncSearchParamsState('');
    setSearchParamsMock.mockImplementation((nextInit: URLSearchParams | string | string[][] | Record<string, string>) => {
      const nextParams = nextInit instanceof URLSearchParams
        ? new URLSearchParams(nextInit.toString())
        : new URLSearchParams(nextInit);

      syncSearchParamsState(nextParams.toString());
    });
    getAllMock.mockResolvedValue({
      orders: [
        {
          orderId: 101,
          orderNumber: 'ORD-101',
          customerName: 'Nguyen Van A',
          customerPhone: '0900000000',
          status: 'COMPLETED',
          statusLabel: 'COMPLETED',
          paymentStatus: 'PAID',
          paymentMethod: 'VNPAY',
          totalAmount: '450000',
          createdAt: '2026-03-25T10:00:00.000Z',
          itemCount: 1,
          user: null,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 15,
        total: 1,
        totalPages: 1,
      },
    });
    getTabCountsMock.mockResolvedValue({
      ALL: 1,
      Pending: 0,
      Processing: 0,
      Shipping: 0,
      Delivered: 1,
      Cancelled: 0,
    });
  });

  afterEach(() => {
    i18nMode.rawKeys = false;
  });

  it('keeps admin orders chrome and compact labels readable when translations return raw keys', async () => {
    i18nMode.rawKeys = true;

    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText('Đơn hàng')).toBeInTheDocument();
    });

    expect(screen.getByText('1 đơn')).toBeInTheDocument();
    expect(screen.getByText('Làm mới')).toBeInTheDocument();
    expect(screen.getByText('Chọn nhiều')).toBeInTheDocument();
    expect(screen.getByText('Tìm kiếm')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tìm tên, SĐT, mã đơn...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tất cả/i })).toBeInTheDocument();
    expect(screen.getByText('Mã đơn')).toBeInTheDocument();
    expect(screen.getByText('Thanh toán')).toBeInTheDocument();
    expect(screen.getByText('1 sản phẩm')).toBeInTheDocument();
    expect(screen.getAllByText('Đã giao').length).toBeGreaterThan(0);
    expect(screen.getByText('Đã thanh toán')).toBeInTheDocument();
    expect(screen.getByText('VNPay')).toBeInTheDocument();
    expect(screen.getByText('Chi tiết')).toBeInTheDocument();
    expect(screen.getByText('Hiển thị 1-1 / 1 đơn')).toBeInTheDocument();
  });

  it('loads the main list plus one aggregated tab-count request without re-triggering an infinite refresh loop', async () => {
    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText('Đơn hàng')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(getAllMock.mock.calls.length).toBeGreaterThan(0);
    });

    expect(getAllMock.mock.calls.length).toBeLessThanOrEqual(3);
    expect(getTabCountsMock.mock.calls.length).toBeGreaterThan(0);
    expect(getTabCountsMock.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('hydrates tab, filter, and paging state from the URL query before loading data', async () => {
    syncSearchParamsState('status=Processing&q=Nguyen&startDate=2026-03-01&endDate=2026-03-31&sort=createdAt_asc&page=2&pageSize=20');

    render(<Orders />);

    await waitFor(() => {
      expect(getAllMock).toHaveBeenCalledWith(expect.objectContaining({
        status: 'Processing',
        page: 2,
        pageSize: 20,
        search: 'Nguyen',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        sort: 'createdAt_asc',
      }));
    });

    expect(getTabCountsMock).toHaveBeenCalledWith(expect.objectContaining({
      search: 'Nguyen',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    }));
  });

  it('keeps the shared status filter bar mounted while refresh state is idle', async () => {
    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByTestId('status-filter-bar')).toBeInTheDocument();
    });

    expect(screen.getByTestId('status-filter-bar')).toHaveAttribute('data-refreshing', 'false');
  });

  it('does not refetch tab counts when only switching status tabs', async () => {
    const user = userEvent.setup();

    render(<Orders />);

    await waitFor(() => {
      expect(getAllMock.mock.calls.length).toBeGreaterThan(0);
    });

    const initialGetAllCalls = getAllMock.mock.calls.length;
    const initialTabCountsCalls = getTabCountsMock.mock.calls.length;

    await user.click(screen.getByRole('button', { name: /Chờ xác nhận/i }));

    await waitFor(() => {
      expect(getAllMock.mock.calls.length).toBeGreaterThan(initialGetAllCalls);
    });

    expect(getAllMock).toHaveBeenLastCalledWith(expect.objectContaining({
      status: 'Pending',
      page: 1,
      pageSize: 15,
      search: undefined,
      startDate: undefined,
      endDate: undefined,
      sort: 'createdAt_desc',
    }));
    expect(getTabCountsMock).toHaveBeenCalledTimes(initialTabCountsCalls);
  });

  it('normalizes hyphenated return requested statuses before rendering compact labels', async () => {
    getAllMock.mockResolvedValue({
      orders: [
        {
          orderId: 102,
          orderNumber: 'ORD-102',
          customerName: 'Tran Thi B',
          customerPhone: '0900111111',
          status: 'return-requested',
          statusLabel: 'return-requested',
          paymentStatus: 'PENDING',
          paymentMethod: 'COD',
          totalAmount: '550000',
          createdAt: '2026-03-25T10:00:00.000Z',
          itemCount: 2,
          user: null,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 15,
        total: 1,
        totalPages: 1,
      },
    });

    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText('Yêu cầu trả hàng')).toBeInTheDocument();
    });
  });

  it('normalizes canceled aliases before rendering compact labels', async () => {
    getAllMock.mockResolvedValue({
      orders: [
        {
          orderId: 104,
          orderNumber: 'ORD-104',
          customerName: 'Pham Thi D',
          customerPhone: '0900333333',
          status: ' canceled ',
          statusLabel: ' canceled ',
          paymentStatus: 'PENDING',
          paymentMethod: 'COD',
          totalAmount: '350000',
          createdAt: '2026-03-25T10:00:00.000Z',
          itemCount: 1,
          user: null,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 15,
        total: 1,
        totalPages: 1,
      },
    });

    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText('Đã hủy')).toBeInTheDocument();
    });
  });

  it('uses shared payment mapping for refund-like statuses and methods', async () => {
    i18nMode.rawKeys = true;
    getAllMock.mockResolvedValue({
      orders: [
        {
          orderId: 103,
          orderNumber: 'ORD-103',
          customerName: 'Le Thi C',
          customerPhone: '0900222222',
          status: 'DELIVERED',
          statusLabel: 'DELIVERED',
          paymentStatus: 'partially-refunded',
          paymentMethod: 'bank-transfer',
          totalAmount: '650000',
          createdAt: '2026-03-25T10:00:00.000Z',
          itemCount: 1,
          user: null,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 15,
        total: 1,
        totalPages: 1,
      },
    });

    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText('Hoàn tiền một phần')).toBeInTheDocument();
    });

    expect(screen.getByText('Chuyển khoản ngân hàng')).toBeInTheDocument();
  });

  it('upgrades generic VNPay pending values to the canonical VNPay pending label', async () => {
    getAllMock.mockResolvedValue({
      orders: [
        {
          orderId: 105,
          orderNumber: 'ORD-105',
          customerName: 'Bui Thi E',
          customerPhone: '0900444444',
          status: 'PENDING',
          statusLabel: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: 'VNPAY',
          totalAmount: '150000',
          createdAt: '2026-03-25T10:00:00.000Z',
          itemCount: 1,
          user: null,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 15,
        total: 1,
        totalPages: 1,
      },
    });

    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText('Chờ thanh toán')).toBeInTheDocument();
    });

    expect(screen.getByText('VNPay')).toBeInTheDocument();
  });

  it('renders canonical cancelled and needs-review payment labels distinctly', async () => {
    getAllMock.mockResolvedValue({
      orders: [
        {
          orderId: 107,
          orderNumber: 'ORD-107',
          customerName: 'Vo Thi G',
          customerPhone: '0900666666',
          status: 'PROCESSING',
          statusLabel: 'PROCESSING',
          paymentStatus: 'canceled',
          paymentMethod: 'VNPAY',
          totalAmount: '250000',
          createdAt: '2026-03-25T10:00:00.000Z',
          itemCount: 1,
          user: null,
        },
        {
          orderId: 108,
          orderNumber: 'ORD-108',
          customerName: 'Bui Van H',
          customerPhone: '0900777777',
          status: 'PROCESSING',
          statusLabel: 'PROCESSING',
          paymentStatus: 'needs_review',
          paymentMethod: 'VNPAY',
          totalAmount: '275000',
          createdAt: '2026-03-25T11:00:00.000Z',
          itemCount: 1,
          user: null,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 15,
        total: 2,
        totalPages: 1,
      },
    });

    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText('Thanh toán đã hủy')).toBeInTheDocument();
    });

    expect(screen.getByText('Cần kiểm tra thanh toán')).toBeInTheDocument();
  });

  it('shows the bulk toolbar after selecting an order on the current page', async () => {
    const user = userEvent.setup();

    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByLabelText('Chọn đơn ORD-101')).toBeInTheDocument();
    });
    expect(screen.queryByText('Đã chọn 1 đơn')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Chọn đơn ORD-101'));

    expect(screen.getAllByText('Đã chọn 1 đơn').length).toBeGreaterThan(0);
    expect(screen.getByText('Xuất')).toBeInTheDocument();
    expect(screen.getByText('Xử lý')).toBeInTheDocument();
    expect(screen.queryByText('Chuyển sang đã giao')).not.toBeInTheDocument();
  });

  it('guides shipping selections to the manual verification flow instead of exposing bulk delivered', async () => {
    const user = userEvent.setup();

    getAllMock.mockResolvedValue({
      orders: [
        {
          orderId: 202,
          orderNumber: 'ORD-202',
          customerName: 'Tran Van Shipping',
          customerPhone: '0900999999',
          status: 'SHIPPING',
          statusLabel: 'SHIPPING',
          paymentStatus: 'PAID',
          paymentMethod: 'VNPAY',
          totalAmount: '720000',
          createdAt: '2026-03-25T10:00:00.000Z',
          itemCount: 2,
          user: null,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 15,
        total: 1,
        totalPages: 1,
      },
    });

    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByLabelText('Chọn đơn ORD-202')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Chọn đơn ORD-202'));

    expect(screen.getByText('Đơn giao hàng cần xác minh thủ công.')).toBeInTheDocument();
    expect(screen.queryByText('Mở chi tiết')).not.toBeInTheDocument();
    expect(screen.queryByText('Chuyển sang đã giao')).not.toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('keeps selection checkboxes visible and enters bulk mode when a checkbox is clicked', async () => {
    const user = userEvent.setup();

    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText('Mã đơn')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Chọn tất cả đơn trên trang hiện tại')).toBeInTheDocument();
    expect(screen.getByLabelText('Chọn đơn ORD-101')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Chọn đơn ORD-101'));

    expect(screen.getByText('Đã chọn 1 đơn')).toBeInTheDocument();
    expect(screen.getByText('Thoát')).toBeInTheDocument();

    await user.click(screen.getByText('Thoát'));

    expect(screen.getByLabelText('Chọn tất cả đơn trên trang hiện tại')).toBeInTheDocument();
    expect(screen.getByLabelText('Chọn đơn ORD-101')).toBeInTheDocument();
    expect(screen.queryByText('Đã chọn 1 đơn')).not.toBeInTheDocument();
    expect(screen.getByText('Chọn nhiều')).toBeInTheDocument();
  });
});
