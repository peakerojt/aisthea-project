import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { Profile } from '@/store/pages/Profile';

const getProfile = vi.fn();
const getAddresses = vi.fn();
const getMyOrders = vi.fn();
const getMyReturnSummaries = vi.fn();
const getBankAccounts = vi.fn();
const getRefundBenefits = vi.fn();

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        if (key === 'recentOrders.orderNumber') {
          return `recentOrders.orderNumber:${String(options?.orderNumber ?? '')}`;
        }

        return key;
      },
    }),
  };
});

vi.mock('@/store/components/Header', () => ({
  Header: () => <div data-testid="store-header" />,
}));

vi.mock('@/common/contexts/AuthContext', () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
}));

vi.mock('@/common/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('@/store/services/user.service', async () => {
  const actual = await vi.importActual<any>('@/store/services/user.service');
  return {
    ...actual,
    userService: {
      ...actual.userService,
      getProfile: (...args: any[]) => getProfile(...args),
      getAddresses: (...args: any[]) => getAddresses(...args),
      getBankAccounts: (...args: any[]) => getBankAccounts(...args),
      getRefundBenefits: (...args: any[]) => getRefundBenefits(...args),
      updateProfile: vi.fn(),
      uploadAvatar: vi.fn(),
      deleteAvatar: vi.fn(),
      createAddress: vi.fn(),
      updateAddress: vi.fn(),
      deleteAddress: vi.fn(),
      setDefaultAddress: vi.fn(),
    },
  };
});

vi.mock('@/common/services/order.service', async () => {
  const actual = await vi.importActual<any>('@/common/services/order.service');
  return {
    ...actual,
    orderService: {
      ...actual.orderService,
      getMyOrders: (...args: any[]) => getMyOrders(...args),
    },
  };
});

vi.mock('@/common/services/return.summary.service', async () => {
  const actual = await vi.importActual<any>('@/common/services/return.summary.service');
  return {
    ...actual,
    returnSummaryService: {
      ...actual.returnSummaryService,
      myReturnSummaries: (...args: any[]) => getMyReturnSummaries(...args),
    },
  };
});

vi.mock('@/common/utils/vnLocation', () => ({
  fetchVNProvinces: vi.fn().mockResolvedValue([]),
  fetchVNDistricts: vi.fn().mockResolvedValue([]),
  fetchVNWards: vi.fn().mockResolvedValue([]),
  resolveVNLocationSelection: vi.fn().mockResolvedValue({
    cityCode: '',
    districtCode: '',
    wardCode: '',
    districts: [],
    wards: [],
  }),
}));

describe('Profile recent orders', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();

    getProfile.mockResolvedValue({
      userId: 1,
      email: 'a@example.com',
      fullName: 'Nguyen Van A',
      phone: '090',
      avatarUrl: null,
      googleId: null,
      status: 'Active',
      createdAt: '2026-02-24T08:00:00.000Z',
      updatedAt: '2026-02-24T08:00:00.000Z',
      completeness: 100,
    });
    getAddresses.mockResolvedValue([]);
    getBankAccounts.mockResolvedValue([]);
    getRefundBenefits.mockResolvedValue([]);
    getMyOrders.mockResolvedValue({
      orders: [],
      pagination: { page: 1, pageSize: 5, total: 0, totalPages: 0 },
    });
    getMyReturnSummaries.mockResolvedValue([]);
  });

  it('renders canonical cancelled labels for drifted canceled recent-order statuses', async () => {
    getMyOrders.mockResolvedValue({
      orders: [
        {
          orderId: 10,
          orderNumber: 'ORD-10',
          orderCode: 'OD20260010',
          totalAmount: '199000',
          itemCount: 1,
          status: ' canceled ',
          paymentMethod: 'cod',
          paymentStatus: 'PENDING_COD',
          createdAt: '2026-02-24T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 5, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    const orderButtons = await screen.findAllByRole('button', { name: 'sidebar.orders' });
    await userEvent.click(orderButtons[0]);

    expect((await screen.findAllByText('Đã hủy')).length).toBeGreaterThan(0);
    expect(screen.queryByText(' canceled ')).not.toBeInTheDocument();
  });

  it('renders canonical return requested labels for drifted recent-order statuses', async () => {
    getMyOrders.mockResolvedValue({
      orders: [
        {
          orderId: 11,
          orderNumber: 'ORD-11',
          orderCode: 'OD20260011',
          totalAmount: '299000',
          itemCount: 1,
          status: ' return-requested ',
          paymentMethod: 'cod',
          paymentStatus: 'PENDING_COD',
          createdAt: '2026-02-24T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 5, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    const orderButtons = await screen.findAllByRole('button', { name: 'sidebar.orders' });
    await userEvent.click(orderButtons[0]);

    expect(await screen.findByText('Yêu cầu trả hàng')).toBeInTheDocument();
    expect(screen.queryByText(' return-requested ')).not.toBeInTheDocument();
  });

  it('renders canonical delivered labels for legacy completed recent-order statuses', async () => {
    getMyOrders.mockResolvedValue({
      orders: [
        {
          orderId: 12,
          orderNumber: 'ORD-12',
          orderCode: 'OD20260012',
          totalAmount: '399000',
          itemCount: 1,
          status: ' completed ',
          paymentMethod: 'cod',
          paymentStatus: 'PENDING_COD',
          createdAt: '2026-02-24T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 5, total: 1, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    const orderButtons = await screen.findAllByRole('button', { name: 'sidebar.orders' });
    await userEvent.click(orderButtons[0]);

    expect((await screen.findAllByText('Đã giao hàng')).length).toBeGreaterThan(0);
    expect(screen.queryByText(' completed ')).not.toBeInTheDocument();
  });

  it('uses the same shared delivered filter labels as my orders', async () => {
    getMyOrders.mockResolvedValue({
      orders: [
        {
          orderId: 13,
          orderNumber: 'ORD-13',
          orderCode: 'OD20260013',
          totalAmount: '499000',
          itemCount: 1,
          status: ' completed ',
          paymentMethod: 'cod',
          paymentStatus: 'PENDING_COD',
          createdAt: '2026-02-24T08:00:00.000Z',
        },
        {
          orderId: 14,
          orderNumber: 'ORD-14',
          orderCode: 'OD20260014',
          totalAmount: '599000',
          itemCount: 1,
          status: ' pending ',
          paymentMethod: 'cod',
          paymentStatus: 'PENDING_COD',
          createdAt: '2026-02-24T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 5, total: 2, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    const orderButtons = await screen.findAllByRole('button', { name: 'sidebar.orders' });
    await userEvent.click(orderButtons[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Đã giao hàng' }));

    expect(screen.getByText(/OD20260013/)).toBeInTheDocument();
    expect(screen.queryByText(/OD20260014/)).not.toBeInTheDocument();
  });

  it('renders linked return summary in the profile orders section through the shared disclosure card', async () => {
    getMyOrders.mockResolvedValue({
      orders: [
        {
          orderId: 22,
          orderNumber: 'ORD-22',
          orderCode: 'OD20260022',
          totalAmount: '499000',
          itemCount: 2,
          status: ' delivered ',
          paymentMethod: 'vnpay',
          paymentStatus: 'paid',
          createdAt: '2026-02-24T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 5, total: 1, totalPages: 1 },
    });
    getMyReturnSummaries.mockResolvedValue([
      {
        returnRequestId: 301,
        orderId: 22,
        workflowStatus: 'ACCEPTED_FOR_REFUND',
        refundStatus: 'FAILED',
        refundableCapAmount: '80000',
        totalRefundAmount: '100000',
        financeNote: 'Đang đối soát lại giao dịch hoàn tiền.',
      },
    ]);

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    const orderButtons = await screen.findAllByRole('button', { name: 'sidebar.orders' });
    await userEvent.click(orderButtons[0]);

    expect(await screen.findByText('Đã chấp nhận hoàn tiền')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xem thông tin hoàn hàng' }));
    expect(await screen.findByText('Trạng thái hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('Hoàn tiền thất bại')).toBeInTheDocument();
    expect(screen.getByText('80.000đ')).toBeInTheDocument();
    expect(screen.getByText('Đang đối soát lại giao dịch hoàn tiền.')).toBeInTheDocument();
  });

  it('renders the bank accounts section when opening the refund bank tab', async () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    const bankButtons = await screen.findAllByRole('button', { name: 'Tài khoản' });
    await userEvent.click(bankButtons[0]);

    expect(await screen.findByRole('heading', { name: 'Tài khoản' })).toBeInTheDocument();
    expect(getBankAccounts.mock.calls.length).toBeGreaterThan(0);
  });

  it('keeps the addresses tab active when navigating from the bank tab back to profile sections', async () => {
    render(
      <MemoryRouter initialEntries={['/profile/bank']}>
        <Profile />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Tài khoản' })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'sidebar.addresses' })[0]);

    expect(await screen.findByText('sections.addresses')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tài khoản' })).not.toBeInTheDocument();
  });

  it('keeps the security tab active when navigating from the vouchers tab back to profile sections', async () => {
    render(
      <MemoryRouter initialEntries={['/profile/vouchers']}>
        <Profile />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Mã giảm giá' })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'sidebar.security' })[0]);

    expect(await screen.findByText('security.passwordTitle')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mã giảm giá' })).not.toBeInTheDocument();
  });

  it('preloads and switches between the new profile tabs correctly', async () => {
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Profile />
      </MemoryRouter>,
    );

    expect((await screen.findAllByRole('button', { name: 'Tài khoản' })).length).toBeGreaterThan(0);

    await userEvent.click(screen.getAllByRole('button', { name: 'Tài khoản' })[0]);
    expect(await screen.findByRole('heading', { name: 'Tài khoản' })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Mã giảm giá' })[0]);
    expect(await screen.findByRole('heading', { name: 'Mã giảm giá' })).toBeInTheDocument();
    expect(getBankAccounts.mock.calls.length).toBeGreaterThan(0);
    expect(getRefundBenefits.mock.calls.length).toBeGreaterThan(0);
  });
});
