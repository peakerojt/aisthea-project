import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Returns } from '@/admin/pages/Returns';

const useAdminReturns = vi.fn();

vi.mock('@/admin/hooks/useAdminReturns', () => ({
  useAdminReturns: () => useAdminReturns(),
}));

vi.mock('@/admin/components/AdminUI', () => ({
  AdminActionButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  AdminBadge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AdminEmptyState: ({ title, description }: { title: React.ReactNode; description?: React.ReactNode }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
  AdminPageHeader: ({ title, subtitle, actions }: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actions}
    </div>
  ),
  AdminPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AdminSectionCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AdminTabs: ({ items }: { items: Array<{ label: React.ReactNode }> }) => (
    <div>{items.map((item, index) => <span key={index}>{item.label}</span>)}</div>
  ),
}));

vi.mock('@/admin/components/AdminReturnReviewModal', () => ({
  AdminReturnReviewModal: () => <div>modal</div>,
}));

vi.mock('@/admin/utils/adminReturn.utils', () => ({
  formatAdminReturnDateTime: () => '25/03/2026 10:00',
  getAdminReturnStatusBadgeTone: () => 'warning',
  getAdminReturnStatusLabel: () => 'Chờ duyệt',
}));

vi.mock('@/common/components/ReasonLabel', () => ({
  ReasonLabel: ({ reason }: { reason: string }) => <span>{reason}</span>,
}));

describe('Returns', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders fallback-safe page chrome and row details', () => {
    useAdminReturns.mockReturnValue({
      changeStatusFilter: vi.fn(),
      handleAction: vi.fn(),
      isRefreshing: false,
      loading: false,
      page: 2,
      pendingCount: 3,
      returns: [
        {
          returnId: 18,
          reason: 'DEFECTIVE',
          createdAt: '2026-03-25T10:00:00.000Z',
          status: 'REQUESTED',
          proofImages: ['a', 'b'],
          order: { orderNumber: 'ORD-18' },
          user: { fullName: null, email: null },
        },
      ],
      selectedReturn: null,
      setPage: vi.fn(),
      setSelectedReturn: vi.fn(),
      statusFilter: 'ALL',
      statusTabs: [
        { key: 'ALL', label: 'filters.all', count: 1 },
        { key: 'REQUESTED', label: 'filters.pending', count: 1 },
      ],
      totalPages: 4,
      t: (key: string) => key,
    });

    render(<Returns />);

    expect(screen.getByText('Quản lý trả hàng')).toBeInTheDocument();
    expect(screen.getByText('Xem xét và xử lý các yêu cầu trả hàng, hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('3 chờ duyệt')).toBeInTheDocument();
    expect(screen.getByText('Mã đơn / Khách hàng')).toBeInTheDocument();
    expect(screen.getAllByText('Khách vãng lai').length).toBeGreaterThan(0);
    expect(screen.getByText('2 ảnh')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Xem chi tiết' })[0]).toBeInTheDocument();
    expect(screen.getByText('Trang 2 / 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trước' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sau' })).toBeInTheDocument();
  });

  it('renders fallback-safe empty state', () => {
    useAdminReturns.mockReturnValue({
      changeStatusFilter: vi.fn(),
      handleAction: vi.fn(),
      isRefreshing: false,
      loading: false,
      page: 1,
      pendingCount: 0,
      returns: [],
      selectedReturn: null,
      setPage: vi.fn(),
      setSelectedReturn: vi.fn(),
      statusFilter: 'ALL',
      statusTabs: [],
      totalPages: 1,
      t: (key: string) => key,
    });

    render(<Returns />);

    expect(screen.getByText('Không có yêu cầu trả hàng nào.')).toBeInTheDocument();
    expect(screen.getAllByText('Xem xét và xử lý các yêu cầu trả hàng, hoàn tiền')).toHaveLength(2);
  });
});
