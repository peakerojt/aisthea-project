import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Returns } from '@/admin/pages/Returns';
import { createMockReviewActions } from '@/admin/test-utils/createMockReviewActions';

const useAdminReturns = vi.fn();
const adminReturnReviewModalMock = vi.fn();
const searchParamsState = vi.hoisted(() => ({ value: '' }));
const setSearchParamsMock = vi.hoisted(() => vi.fn());

const createUseAdminReturnsState = (overrides: Record<string, unknown> = {}) => ({
  canManageRefundWorkflow: true,
  canManageReturnWorkflow: true,
  changePageSize: vi.fn(),
  changeSearch: vi.fn(),
  changeSort: vi.fn(),
  changeStatusFilter: vi.fn(),
  isRefreshing: false,
  loading: false,
  page: 1,
  pageSize: 15,
  pendingCount: 0,
  reviewActions: createMockReviewActions(),
  returns: [],
  search: '',
  selectedReturn: null,
  setPage: vi.fn(),
  setSelectedReturn: vi.fn(),
  sort: 'createdAt_desc',
  statusFilter: 'ALL',
  statusTabs: [],
  totalPages: 1,
  t: (key: string) => key,
  ...overrides,
});

vi.mock('@/admin/hooks/useReturns', () => ({
  DEFAULT_RETURN_PAGE_SIZE: 15,
  DEFAULT_RETURN_SORT: 'createdAt_desc',
  RETURN_PAGE_SIZE_OPTIONS: [15, 30, 50],
  useAdminReturns: (options?: Record<string, unknown>) => useAdminReturns(options),
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(searchParamsState.value), setSearchParamsMock],
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
  AdminToolbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AdminStatCards: ({ items }: { items: Array<{ label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode }> }) => (
    <div>
      {items.map((item, index) => (
        <div key={index}>
          <span>{item.label}</span>
          <span>{item.value}</span>
          {item.hint}
        </div>
      ))}
    </div>
  ),
  AdminStatusFilterBar: ({
    items,
    isRefreshing,
  }: {
    items: Array<{ label: React.ReactNode }>;
    isRefreshing?: boolean;
  }) => (
    <div data-testid="status-filter-bar" data-refreshing={isRefreshing ? 'true' : 'false'}>
      {items.map((item, index) => <span key={index}>{item.label}</span>)}
    </div>
  ),
  adminUiTokens: {
    fieldControl: 'field-control',
    fieldLabel: 'field-label',
    searchFieldControl: 'search-field-control',
  },
}));

vi.mock('@/admin/components/AdminReturnReviewModal', () => ({
  AdminReturnReviewModal: (props: Record<string, unknown>) => {
    adminReturnReviewModalMock(props);
    return <div>modal</div>;
  },
}));

vi.mock('@/admin/utils/returns.utils', () => ({
  formatAdminReturnDateTime: () => '25/03/2026 10:00',
  getAdminRefundStatusBadgeTone: () => 'info',
  getAdminRefundStatusLabel: (_status: string) => `refund:${_status}`,
  getAdminReturnStatusBadgeTone: () => 'warning',
  getAdminReturnStatusLabel: () => 'Chờ duyệt',
}));

vi.mock('@/common/components/ReasonLabel', () => ({
  ReasonLabel: ({ reason }: { reason: string }) => <span>{reason}</span>,
}));

describe('Returns', () => {
  afterEach(() => {
    cleanup();
    adminReturnReviewModalMock.mockReset();
    searchParamsState.value = '';
  });

  it('renders fallback-safe page chrome and row details', async () => {
    useAdminReturns.mockReturnValue(createUseAdminReturnsState({
      loading: false,
      page: 2,
      pendingCount: 3,
      returns: [
        {
          returnId: 18,
          reason: 'DEFECTIVE',
          createdAt: '2026-03-25T10:00:00.000Z',
          status: 'REQUESTED',
          totalRefundAmount: '100000',
          refundableCapAmount: '80000',
          refundStatus: 'LOCKED_UNTIL_PAYMENT_CONFIRMED',
          financeNote: 'Cần đối soát với cổng thanh toán',
          financeNoteUpdatedAt: '2026-03-26T10:15:00.000Z',
          financeNoteUpdatedBy: { fullName: 'Finance Ops' },
          items: [
            {
              orderItemId: 1,
              quantity: 1,
              requestedRefundAmount: '80000',
              orderItemGrossAmount: '100000',
              orderItemAllocatedDiscountAmount: '20000',
              orderItemNetPaidAmount: '80000',
            },
          ],
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
    }));

    render(<Returns />);

    expect(screen.getByText('Quản lý trả hàng')).toBeInTheDocument();
    expect(screen.getByTestId('status-filter-bar')).toHaveAttribute('data-refreshing', 'false');
    expect(screen.getByText('Xem xét và xử lý các yêu cầu trả hàng, hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('3 chờ duyệt')).toBeInTheDocument();
    expect(screen.queryByText(/^#$/)).not.toBeInTheDocument();
    expect(screen.getByText('Mã đơn / Khách hàng')).toBeInTheDocument();
    expect(screen.getAllByText('Hoàn tiền dự kiến').length).toBeGreaterThan(0);
    expect(screen.queryByText('Trạng thái hoàn tiền')).not.toBeInTheDocument();
    expect(screen.getAllByText('Khách vãng lai').length).toBeGreaterThan(0);
    expect(screen.queryByText('2 ảnh')).not.toBeInTheDocument();
    expect(screen.queryByText('1 sản phẩm trong yêu cầu này')).not.toBeInTheDocument();
    expect(screen.getByText('80.000đ')).toBeInTheDocument();
    expect(screen.queryByText('refund:LOCKED_UNTIL_PAYMENT_CONFIRMED')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Xem chi tiết' })[0]).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xem thêm thông tin hoàn trả' }));
    expect(screen.getByText('Trạng thái hoàn tiền')).toBeInTheDocument();
    expect(screen.getAllByText('refund:LOCKED_UNTIL_PAYMENT_CONFIRMED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ghi chú tài chính').length).toBeGreaterThan(0);
    expect(screen.getByText('Cần đối soát với cổng thanh toán')).toBeInTheDocument();
    expect(screen.getByText('Cập nhật 25/03/2026 10:00 · Finance Ops')).toBeInTheDocument();
    expect(screen.getByText('Trang 2 / 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trước' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sau' })).toBeInTheDocument();
  });

  it('renders fallback-safe empty state', () => {
    useAdminReturns.mockReturnValue(createUseAdminReturnsState());

    render(<Returns />);

    expect(screen.getByText('Không có yêu cầu trả hàng nào.')).toBeInTheDocument();
    expect(screen.getAllByText('Xem xét và xử lý các yêu cầu trả hàng, hoàn tiền')).toHaveLength(2);
  });

  it('falls back to totalRefundAmount when refundableCapAmount is unavailable on the admin list', () => {
    useAdminReturns.mockReturnValue(createUseAdminReturnsState({
      returns: [
        {
          returnId: 55,
          reason: 'DEFECTIVE',
          createdAt: '2026-03-25T10:00:00.000Z',
          status: 'REQUESTED',
          totalRefundAmount: '50000',
          refundableCapAmount: null,
          proofImages: [],
          order: { orderNumber: 'ORD-55' },
          user: { fullName: 'Nguyen Van B', email: 'customer2@example.com' },
        },
      ],
    }));

    render(<Returns />);

    expect(screen.getAllByText('Hoàn tiền dự kiến').length).toBeGreaterThan(0);
    expect(screen.getByText('50.000đ')).toBeInTheDocument();
    expect(screen.queryByText('customer2@example.com')).not.toBeInTheDocument();
    expect(screen.queryByText(/Theo tổng cũ:/)).not.toBeInTheDocument();
  });

  it('passes semantic review actions to the review modal', async () => {
    const reviewActions = createMockReviewActions();
    const selectedReturn = {
      returnId: 44,
      reason: 'DEFECTIVE',
      createdAt: '2026-03-25T10:00:00.000Z',
      status: 'REQUESTED',
      proofImages: [],
      order: { orderNumber: 'ORD-44' },
      user: { fullName: 'Nguyen Van A', email: 'customer@example.com' },
    };

    useAdminReturns.mockReturnValue(createUseAdminReturnsState({
      reviewActions,
      returns: [selectedReturn],
      selectedReturn,
    }));

    render(<Returns />);

    await waitFor(() => {
      expect(adminReturnReviewModalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          actions: reviewActions,
          canManageRefundWorkflow: true,
          canManageReturnWorkflow: true,
          item: selectedReturn,
          onClose: expect.any(Function),
        }),
      );
    });
  });

  it('hydrates initial status filter and page from the URL query', () => {
    searchParamsState.value = 'status=APPROVED&q=ORD-18&sort=updatedAt_desc&page=3&pageSize=30';
    useAdminReturns.mockReturnValue(createUseAdminReturnsState());

    render(<Returns />);

    expect(useAdminReturns).toHaveBeenCalledWith(
      expect.objectContaining({
        initialStatusFilter: 'APPROVED',
        initialSearch: 'ORD-18',
        initialSort: 'updatedAt_desc',
        initialPage: 3,
        initialPageSize: 30,
      }),
    );
  });
});
