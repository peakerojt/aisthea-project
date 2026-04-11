import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchAdminUsersMock = vi.fn();
const patchUserRoleMock = vi.fn();
const patchUserStatusMock = vi.fn();
const getRolesMock = vi.fn();
const showToastMock = vi.fn();
const searchParamsState = vi.hoisted(() => ({ value: '' }));
const setSearchParamsMock = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        const table: Record<string, string> = {
          'page.title': 'Quản lý người dùng',
          'page.loading': 'Đang tải...',
          'page.userCount': `${String(options?.count ?? 0)} tài khoản`,
          'filters.searchPlaceholder': 'Tìm theo tên, email, số điện thoại...',
          'filters.allRoles': 'Tất cả vai trò',
          'filters.allStatuses': 'Tất cả trạng thái',
          'filters.statusActive': 'Hoạt động',
          'filters.statusBanned': 'Đã khóa',
          'filters.statusPending': 'Chờ xác nhận',
          'table.customer': 'Người dùng',
          'table.contact': 'Liên hệ',
          'table.role': 'Vai trò',
          'table.status': 'Trạng thái',
          'table.orders': 'Đơn hàng',
          'table.joined': 'Ngày tham gia',
          'table.actions': 'Thao tác',
          'role.title': 'Phân quyền',
          'role.cancel': 'Hủy',
          'role.saveRole': 'Lưu thay đổi',
          'role.saving': 'Đang lưu...',
          'role.labels.admin': 'Quản trị viên',
          'role.labels.customer': 'Khách hàng',
          'role.labels.staff': 'Nhân viên',
          'role.labels.support': 'Nhân viên',
          'status.active': 'Hoạt động',
          'actions.refresh': 'Làm mới',
          'actions.reset': 'Đặt lại',
          'pagination.rangeSummary': `Hiển thị ${String(options?.start ?? 0)}-${String(options?.end ?? 0)} / ${String(options?.total ?? 0)} tài khoản`,
          'pagination.summary': `Trang ${String(options?.page ?? 1)} / ${String(options?.totalPages ?? 1)} · ${String(options?.total ?? 0)} tài khoản`,
          'pagination.perPageOption': `${String(options?.count ?? 0)} / trang`,
          'feedback.roleUpdated': 'Đã cập nhật vai trò',
        };

        if (table[key]) {
          return table[key];
        }

        const fallback = options?.defaultValue;
        if (typeof fallback === 'string') {
          return fallback;
        }

        return key;
      },
    }),
  };
});

vi.mock('@/common/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(searchParamsState.value), setSearchParamsMock],
}));

vi.mock('@/common/services/user-admin.service', async () => {
  const actual = await vi.importActual<typeof import('@/common/services/user-admin.service')>(
    '@/common/services/user-admin.service',
  );

  return {
    ...actual,
    fetchAdminUsers: (...args: unknown[]) => fetchAdminUsersMock(...args),
    patchUserRole: (...args: unknown[]) => patchUserRoleMock(...args),
    patchUserStatus: (...args: unknown[]) => patchUserStatusMock(...args),
  };
});

vi.mock('@/admin/services/role.service', () => ({
  roleService: {
    getRoles: (...args: unknown[]) => getRolesMock(...args),
  },
}));

vi.mock('@/common/utils/cloudinary', () => ({
  getImageUrl: (value: string) => value,
}));

vi.mock('@/admin/components/UserActionMenu', () => ({
  UserActionMenu: ({
    user,
    onChangeRole,
  }: {
    user: { userId: number };
    onChangeRole: (user: { userId: number }) => void;
  }) => (
    <button type="button" onClick={() => onChangeRole(user)}>
      change-role-{user.userId}
    </button>
  ),
}));

vi.mock('@/admin/components/AdminUI', () => ({
  AdminEmptyState: ({ title, description }: { title: React.ReactNode; description?: React.ReactNode }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
  AdminModalShell: ({
    title,
    subtitle,
    children,
    footer,
  }: {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      <div>{subtitle}</div>
      <div>{children}</div>
      <div>{footer}</div>
    </div>
  ),
  AdminPageHeader: ({ title, meta }: { title: React.ReactNode; meta?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <div>{meta}</div>
    </div>
  ),
  AdminPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AdminPrimaryButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  AdminRefreshButton: ({
    label,
    isRefreshing: _isRefreshing,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: React.ReactNode; isRefreshing?: boolean }) => <button {...props}>{label}</button>,
  AdminSecondaryButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  AdminRefreshState: ({ isRefreshing }: { isRefreshing?: boolean }) => (
    <div data-testid="admin-refresh-state" data-refreshing={isRefreshing ? 'true' : 'false'} />
  ),
  AdminSectionCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AdminToolbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  adminUiTokens: {
    searchFieldControl: 'search',
    fieldControl: 'field',
    tableHeaderSurface: 'header-surface',
    tableHeader: 'header',
    tableBody: 'body',
    tableRowSoft: 'row',
  },
}));

let Customers: typeof import('@/admin/pages/Customers').Customers;

describe('Customers role mapping', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    searchParamsState.value = '';
    fetchAdminUsersMock.mockResolvedValue({
      users: [
        {
          userId: 8,
          email: 'support@example.com',
          fullName: 'Support Demo',
          phone: null,
          avatarUrl: null,
          status: 'Active',
          createdAt: '2026-04-04T10:00:00.000Z',
          roles: [{ roleId: 77, roleName: 'Support' }],
          totalOrders: 0,
        },
      ],
      pagination: {
        total: 21,
        page: 1,
        pageSize: 20,
        totalPages: 2,
      },
    });
    getRolesMock.mockResolvedValue([
      { roleId: 11, roleName: 'Admin', displayName: 'Admin', isProtected: false, assignable: true, permissionIds: [] },
      { roleId: 12, roleName: 'Customer', displayName: 'Customer', isProtected: false, assignable: true, permissionIds: [] },
      { roleId: 13, roleName: 'Support', displayName: 'Staff', isProtected: false, assignable: true, permissionIds: [] },
      { roleId: 14, roleName: 'Super Admin', displayName: 'Super Admin', isProtected: true, assignable: false, permissionIds: [] },
    ]);
    patchUserRoleMock.mockResolvedValue({ success: true, message: 'Đã cập nhật vai trò' });
    patchUserStatusMock.mockResolvedValue({ success: true, message: 'ok' });

    ({ Customers } = await import('@/admin/pages/Customers'));
  });

  afterEach(() => {
    cleanup();
  });

  it('maps backend Support roles to the staff label in the table and filters', async () => {
    render(<Customers />);

    await waitFor(() => {
      expect(fetchAdminUsersMock).toHaveBeenCalled();
    });

    expect(await screen.findAllByText('Nhân viên')).not.toHaveLength(0);
    expect(screen.getByTestId('admin-refresh-state')).toHaveAttribute('data-refreshing', 'false');
    expect(screen.getByRole('option', { name: 'Nhân viên' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Support' })).not.toBeInTheDocument();
    expect(screen.getByText('21 tài khoản')).toBeInTheDocument();
    expect(screen.getByText('Hiển thị 1-20 / 21 tài khoản')).toBeInTheDocument();
  });

  it('uses fetched backend role ids instead of hardcoded role ids when saving role changes', async () => {
    render(<Customers />);

    await waitFor(() => {
      expect(fetchAdminUsersMock).toHaveBeenCalled();
      expect(getRolesMock).toHaveBeenCalled();
    });

    await userEvent.click(await screen.findByRole('button', { name: 'change-role-8' }));
    expect(await screen.findAllByText('Nhân viên')).not.toHaveLength(0);
    expect(screen.queryByText('Super Admin')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Quản trị viên ADMIN' }));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => {
      expect(patchUserRoleMock).toHaveBeenCalledWith(8, 11);
      expect(showToastMock).toHaveBeenCalledWith({
        type: 'success',
        title: 'Đã cập nhật vai trò',
      });
    });
  });

  it('excludes protected runtime roles from the assignment flow', async () => {
    render(<Customers />);

    await waitFor(() => {
      expect(getRolesMock).toHaveBeenCalled();
    });

    expect(screen.queryByRole('option', { name: 'Super Admin' })).not.toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: 'change-role-8' }));

    expect(screen.queryByText('Super Admin')).not.toBeInTheDocument();
  });

  it('requests server-side pagination and filters from URL-backed state', async () => {
    searchParamsState.value = 'q=demo&role=Support&status=Active&page=2&pageSize=10';

    render(<Customers />);

    await waitFor(() => {
      expect(fetchAdminUsersMock).toHaveBeenCalledWith({
        search: 'demo',
        role: 'Support',
        status: 'Active',
        page: 2,
        limit: 10,
      });
    });
  });
});
