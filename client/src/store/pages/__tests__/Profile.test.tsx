import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { Profile } from '@/store/pages/Profile';

const getProfile = vi.fn();
const getAddresses = vi.fn();
const getRecentOrders = vi.fn();

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
      getRecentOrders: (...args: any[]) => getRecentOrders(...args),
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
  });

  it('renders canonical cancelled labels for drifted canceled recent-order statuses', async () => {
    getRecentOrders.mockResolvedValue([
      {
        orderId: 10,
        orderNumber: 'ORD-10',
        totalAmount: 199000,
        status: ' canceled ',
        createdAt: '2026-02-24T08:00:00.000Z',
      },
    ]);

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    const orderButtons = await screen.findAllByRole('button', { name: 'sidebar.orders' });
    await userEvent.click(orderButtons[0]);

    expect(await screen.findByText('Đã hủy')).toBeInTheDocument();
    expect(screen.queryByText(' canceled ')).not.toBeInTheDocument();
  });

  it('renders canonical return requested labels for drifted recent-order statuses', async () => {
    getRecentOrders.mockResolvedValue([
      {
        orderId: 11,
        orderNumber: 'ORD-11',
        totalAmount: 299000,
        status: ' return-requested ',
        createdAt: '2026-02-24T08:00:00.000Z',
      },
    ]);

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
    getRecentOrders.mockResolvedValue([
      {
        orderId: 12,
        orderNumber: 'ORD-12',
        totalAmount: 399000,
        status: ' completed ',
        createdAt: '2026-02-24T08:00:00.000Z',
      },
    ]);

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    const orderButtons = await screen.findAllByRole('button', { name: 'sidebar.orders' });
    await userEvent.click(orderButtons[0]);

    expect(await screen.findByText('Đã giao hàng')).toBeInTheDocument();
    expect(screen.queryByText(' completed ')).not.toBeInTheDocument();
  });

  it('includes legacy completed statuses in the delivered recent-order filter', async () => {
    getRecentOrders.mockResolvedValue([
      {
        orderId: 13,
        orderNumber: 'ORD-13',
        totalAmount: 499000,
        status: ' completed ',
        createdAt: '2026-02-24T08:00:00.000Z',
      },
      {
        orderId: 14,
        orderNumber: 'ORD-14',
        totalAmount: 599000,
        status: ' pending ',
        createdAt: '2026-02-24T08:00:00.000Z',
      },
    ]);

    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );

    const orderButtons = await screen.findAllByRole('button', { name: 'sidebar.orders' });
    await userEvent.click(orderButtons[0]);
    await userEvent.click(screen.getByRole('button', { name: 'filters.delivered' }));

    expect(await screen.findByText('Đã giao hàng')).toBeInTheDocument();
    expect(screen.getByText('recentOrders.orderNumber:ORD-13')).toBeInTheDocument();
    expect(screen.queryByText('recentOrders.orderNumber:ORD-14')).not.toBeInTheDocument();
  });
});
