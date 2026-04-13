import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Coupons } from '@/admin/pages/Coupons';

const fetchCouponsMock = vi.fn();
const deleteCouponMock = vi.fn();
const showToastMock = vi.fn();
const searchParamsState = vi.hoisted(() => ({ value: '' }));
const setSearchParamsMock = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => options?.defaultValue ?? key,
  }),
}));

vi.mock('@/common/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}));

vi.mock('@/common/services/coupon.service', () => ({
  fetchCoupons: (...args: unknown[]) => fetchCouponsMock(...args),
  createCoupon: vi.fn(),
  updateCoupon: vi.fn(),
  deleteCoupon: (...args: unknown[]) => deleteCouponMock(...args),
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(searchParamsState.value), setSearchParamsMock],
}));

vi.mock('@/admin/components/coupons/CouponDialog', () => ({
  CouponDialog: ({ coupon }: { coupon: { code?: string } | null }) => (
    <div>{coupon ? `edit:${coupon.code}` : 'create-dialog'}</div>
  ),
}));

vi.mock('@/admin/components/coupons/CouponDeleteDialog', () => ({
  CouponDeleteDialog: ({ coupon }: { coupon: { code: string } }) => (
    <div>{`delete:${coupon.code}`}</div>
  ),
}));

describe('Coupons page', () => {
  beforeEach(() => {
    fetchCouponsMock.mockResolvedValue({
      coupons: [
        {
          couponId: 1,
          code: 'SUMMER50',
          type: 'PERCENTAGE',
          value: 5,
          maxDiscountAmount: 50000,
          minOrderValue: 500000,
          startDate: '2026-03-17T00:00:00.000Z',
          endDate: '2026-03-18T00:00:00.000Z',
          usageLimit: 100,
          usagePerUser: 5,
          usedCount: 2,
          isActive: true,
          status: 'EXPIRED',
        },
        {
          couponId: 2,
          code: 'LOCKEDOFF',
          type: 'FIXED_AMOUNT',
          value: 10000,
          maxDiscountAmount: null,
          minOrderValue: 300000,
          startDate: '2026-04-14T00:00:00.000Z',
          endDate: '2026-04-16T00:00:00.000Z',
          usageLimit: 100,
          usagePerUser: 1,
          usedCount: 0,
          isActive: false,
          status: 'INACTIVE',
        },
        {
          couponId: 3,
          code: 'EDITABLE',
          type: 'FIXED_AMOUNT',
          value: 10000,
          maxDiscountAmount: null,
          minOrderValue: 300000,
          startDate: '2026-04-14T00:00:00.000Z',
          endDate: '2026-04-16T00:00:00.000Z',
          usageLimit: 100,
          usagePerUser: 1,
          usedCount: 0,
          isActive: true,
          status: 'ACTIVE',
        },
      ],
      pagination: {
        page: 1,
        totalPages: 2,
        total: 3,
      },
      summary: {
        total: 3,
        active: 1,
        expired: 1,
        depleted: 0,
        upcoming: 0,
        inactive: 1,
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    searchParamsState.value = '';
  });

  it('renders coupons chrome and requests the filtered list from the page shell', async () => {
    searchParamsState.value = 'q=SUMMER&status=EXPIRED&sort=endDate_asc&page=2&pageSize=50';
    render(<Coupons />);

    await waitFor(() => {
      expect(fetchCouponsMock).toHaveBeenCalledWith(expect.objectContaining({
        includeHidden: true,
        page: 2,
        pageSize: 50,
        search: 'SUMMER',
        sort: 'endDate_asc',
        status: 'EXPIRED',
      }));
    });

    expect(screen.getByText('coupons:page.title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('coupons:filters.searchPlaceholder')).toBeInTheDocument();
    expect(screen.getByText('SUMMER50')).toBeInTheDocument();
    expect(screen.getByText('coupons:table.code')).toBeInTheDocument();
    expect(screen.getByText('coupons:stats.total')).toBeInTheDocument();
    expect(screen.getByText(/Tối đa/i)).toBeInTheDocument();
    expect(screen.queryByText('Giới hạn khách:')).not.toBeInTheDocument();
    expect(screen.queryByText(/Còn \d+ lượt/)).not.toBeInTheDocument();
  });

  it('opens create and delete dialogs, but blocks edit for inactive or expired coupons', async () => {
    render(<Coupons />);

    expect(await screen.findByText('SUMMER50')).toBeInTheDocument();
    expect(await screen.findByText('LOCKEDOFF')).toBeInTheDocument();
    expect(await screen.findByText('EDITABLE')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'coupons:page.create' }));
    expect(await screen.findByText('create-dialog')).toBeInTheDocument();

    const editButtons = screen.getAllByTitle('coupons:form.titleEdit');
    expect(editButtons).toHaveLength(1);
    await userEvent.click(editButtons[0]);
    expect(await screen.findByText('edit:EDITABLE')).toBeInTheDocument();

    expect(screen.getByTitle('Mã giảm giá đã hết hạn không thể chỉnh sửa')).toBeDisabled();
    expect(screen.getByTitle('Mã giảm giá vô hiệu không thể chỉnh sửa')).toBeDisabled();

    const deleteButtons = screen.getAllByTitle('coupons:delete.action');
    expect(deleteButtons.length).toBeGreaterThan(0);
    await userEvent.click(deleteButtons[0]);
    expect(await screen.findByText('delete:SUMMER50')).toBeInTheDocument();
  });
});
