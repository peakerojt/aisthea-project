import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getAllMock = vi.hoisted(() => vi.fn());
const getTabCountsMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const searchParamsState = vi.hoisted(() => ({ value: '' }));
const setSearchParamsMock = vi.hoisted(() => vi.fn());
const i18nMode = vi.hoisted(() => ({ rawKeys: false }));
const interpolateMock = (template: string, options?: Record<string, unknown>) =>
  template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token: string) => String(options?.[token] ?? ''));

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
  useSearchParams: () => [new URLSearchParams(searchParamsState.value), setSearchParamsMock],
}));

vi.mock('@/common/services/order.service', () => ({
  adminOrderService: {
    getAll: (...args: unknown[]) => getAllMock(...args),
    getTabCounts: (...args: unknown[]) => getTabCountsMock(...args),
  },
}));

vi.mock('@/admin/components/AdminUI', () => ({
  AdminPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AdminSectionCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AdminPageHeader: ({ title, meta }: { title: React.ReactNode; meta?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {meta ? <div>{meta}</div> : null}
    </header>
  ),
  AdminToolbar: ({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) => (
    <div>
      <div>{children}</div>
      <div>{actions}</div>
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
    searchParamsState.value = '';
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

    expect(screen.getByText('1 đơn hàng')).toBeInTheDocument();
    expect(screen.getByText('Làm mới')).toBeInTheDocument();
    expect(screen.getByText('Tìm kiếm')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tìm theo mã đơn, tên khách hàng, số điện thoại...')).toBeInTheDocument();
    expect(screen.getByText('Tất cả 1')).toBeInTheDocument();
    expect(screen.getByText('Mã đơn')).toBeInTheDocument();
    expect(screen.getByText('Thanh toán')).toBeInTheDocument();
    expect(screen.getByText('1 sản phẩm')).toBeInTheDocument();
    expect(screen.getByText('Đã giao hàng')).toBeInTheDocument();
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
      expect(getAllMock).toHaveBeenCalledTimes(1);
    });

    expect(getTabCountsMock).toHaveBeenCalledTimes(1);
  });

  it('hydrates tab, filter, and paging state from the URL query before loading data', async () => {
    searchParamsState.value = 'status=Processing&q=Nguyen&startDate=2026-03-01&endDate=2026-03-31&sort=createdAt_asc&page=2&pageSize=20';

    render(<Orders />);

    await waitFor(() => {
      expect(getAllMock).toHaveBeenCalledWith({
        status: 'Processing',
        page: 2,
        pageSize: 20,
        search: 'Nguyen',
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        sort: 'createdAt_asc',
      });
    });

    expect(getTabCountsMock).toHaveBeenCalledWith({
      search: 'Nguyen',
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    });
  });

  it('keeps the shared status filter bar mounted while refresh state is idle', async () => {
    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByTestId('status-filter-bar')).toBeInTheDocument();
    });

    expect(screen.getByTestId('status-filter-bar')).toHaveAttribute('data-refreshing', 'false');
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
});
