import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getAllMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());
const i18nMode = vi.hoisted(() => ({ rawKeys: false }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (i18nMode.rawKeys ? key : key),
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/common/services/order.service', () => ({
  adminOrderService: {
    getAll: (...args: unknown[]) => getAllMock(...args),
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
    expect(screen.getByText('Đã giao')).toBeInTheDocument();
    expect(screen.getByText('Đã thanh toán')).toBeInTheDocument();
    expect(screen.getByText('VNPay')).toBeInTheDocument();
    expect(screen.getByText('Chi tiết')).toBeInTheDocument();
    expect(screen.getByText('Hiển thị 1-1 / 1 đơn')).toBeInTheDocument();
  });
});
