import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getRolesMock = vi.fn();
const getPermissionsMock = vi.fn();
const updateRolePermissionsMock = vi.fn();
const showToastMock = vi.fn();

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => {
        const table: Record<string, string> = {
          'page.title': 'Phân quyền hệ thống',
          'page.subtitle': 'Quản lý quyền theo từng vai trò người dùng',
          'modules.PRODUCT': 'Quản lý sản phẩm',
          'modules.RETURNS': 'Quản lý hoàn trả',
          'moduleHints.RETURNS': 'Nhóm quyền này mở trang Hoàn trả và các bước vận hành trả hàng. Không bao gồm thao tác hoàn tiền nhạy cảm.',
          'actions.VIEW': 'Xem',
          'actions.CREATE': 'Thêm',
          'actions.EDIT': 'Sửa',
          'actions.DELETE': 'Xóa',
          'actions.MANAGE': 'Quản lý',
          'sections.moduleAccess.title': 'Quyền truy cập phân hệ',
          'sections.moduleAccess.description': 'Quyết định vai trò có nhìn thấy hoặc đi vào phân hệ nào trong admin. Đây là lớp quyền dùng cho điều hướng và thao tác vận hành thông thường.',
          'sections.moduleAccess.heading': 'Quyền truy cập & vận hành theo phân hệ',
          'sections.moduleAccess.note': 'Các ô trong bảng dưới đây dùng để mở phân hệ và cho phép thao tác vận hành thông thường. Riêng Hoàn trả tại đây chỉ bao gồm truy cập module và quy trình trả hàng, không bao gồm thao tác hoàn tiền nhạy cảm.',
          'sections.sensitiveOperations.title': 'Thao tác hoàn tiền nhạy cảm',
          'sections.sensitiveOperations.description': 'Tách riêng khỏi quyền truy cập phân hệ để dễ nhận biết các quyền liên quan đến tài chính, hoàn tiền và chứng từ.',
          'sections.sensitiveOperations.heading': 'Quyền hoàn tiền nhạy cảm',
          'sections.sensitiveOperations.note': 'Nhóm quyền này không tự mở menu hoặc cấp quyền điều hướng. Chúng chỉ cho phép xem hoặc thực hiện các bước hoàn tiền/tài chính nhạy cảm bên trong quy trình.',
          'sections.specializedOperations.heading': 'Quyền chuyên biệt khác',
          'sections.specializedOperations.note': 'Các quyền dưới đây là quyền dữ liệu/chức năng chuyên biệt. Chúng không phải là quyền mở menu điều hướng của admin shell.',
          'badges.refundSensitive': 'Nhạy cảm',
          'badges.noNavigation': 'Không mở menu',
          'badges.specialized': 'Chuyên biệt',
          'permissionTitles.RETURN_REFUND_FINANCE_VIEW': 'Xem tài chính hoàn tiền',
          'permissionDescriptions.RETURN_REFUND_FINANCE_VIEW': 'Cho phép xem thông tin tài chính, số tiền và ghi chú đối soát hoàn tiền. Không tự mở menu điều hướng.',
          'permissionTitles.RETURN_REFUND_FINANCE_COMPLETE': 'Xác nhận hoàn tiền & chứng từ',
          'permissionDescriptions.RETURN_REFUND_FINANCE_COMPLETE': 'Cho phép xác nhận hoàn tiền chuyển khoản và quản lý chứng từ/payout proof. Không tự mở menu điều hướng.',
          'permissionTitles.CUSTOMER_BANK_ACCOUNT_MANAGE': 'Quản lý tài khoản nhận hoàn tiền',
          'permissionDescriptions.CUSTOMER_BANK_ACCOUNT_MANAGE': 'Cho phép xem và cập nhật tài khoản ngân hàng khách hàng dùng để nhận hoàn tiền.',
          'permissionTitles.REFUND_BENEFIT_VIEW': 'Xem ưu đãi hoàn tiền',
          'permissionDescriptions.REFUND_BENEFIT_VIEW': 'Cho phép xem các ưu đãi hoàn tiền đã phát hành. Đây là quyền chuyên biệt, không quyết định điều hướng.',
          'table.module': 'Phân hệ',
          'protected.title': 'Vai trò được bảo vệ',
          'protected.description': 'Super Admin mặc định có toàn bộ quyền và không thể chỉnh sửa.',
          'empty.noPermissions': 'Chưa có quyền hạn nào được định nghĩa.',
          'empty.seedHint': 'Hãy chạy seed script để khởi tạo dữ liệu.',
          'actions_btn.save': 'Lưu thay đổi',
          'actions_btn.saving': 'Đang lưu...',
          'feedback.loading': 'Đang tải dữ liệu phân quyền...',
          'feedback.saveSuccess': 'Đã cập nhật quyền hạn',
          'feedback.accessDenied': 'Truy cập bị từ chối. Vui lòng liên hệ Quản trị viên.',
        };

        return table[key] ?? key;
      },
    }),
    Trans: ({ values }: { values?: Record<string, unknown> }) => (
      <>
        {`Vai trò ${String(values?.roleName ?? '-')} hiện có ${String(values?.active ?? 0)} / ${String(values?.total ?? 0)} quyền hạn được kích hoạt.`}
      </>
    ),
  };
});

vi.mock('@/common/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}));

vi.mock('@/admin/components/checkbox', () => ({
  Checkbox: ({
    id,
    checked,
    disabled,
    onCheckedChange,
  }: {
    id: string;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange: () => void;
  }) => (
    <input
      aria-label={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onCheckedChange}
    />
  ),
}));

vi.mock('@/admin/components/AdminUI', () => ({
  AdminBadge: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AdminPageHeader: ({
    title,
    subtitle,
    actions,
  }: {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <div>{subtitle}</div>
      <div>{actions}</div>
    </div>
  ),
  AdminPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AdminPrimaryButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  AdminSectionCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  AdminTabs: ({
    items,
    activeKey,
    onChange,
  }: {
    items: Array<{ key: string; label: React.ReactNode }>;
    activeKey: string;
    onChange: (key: string) => void;
  }) => (
    <div>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-pressed={item.key === activeKey}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/admin/services/role.service', async () => {
  const actual = await vi.importActual<typeof import('@/admin/services/role.service')>(
    '@/admin/services/role.service',
  );

  return {
    ...actual,
    roleService: {
      getRoles: (...args: unknown[]) => getRolesMock(...args),
      getPermissions: (...args: unknown[]) => getPermissionsMock(...args),
      updateRolePermissions: (...args: unknown[]) => updateRolePermissionsMock(...args),
    },
  };
});

let Roles: typeof import('@/admin/pages/Roles').Roles;

describe('Roles permission-management page', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    getRolesMock.mockResolvedValue([
      { roleId: 3, roleName: 'Customer', displayName: 'Customer', isProtected: false, assignable: true, permissionIds: [] },
      { roleId: 4, roleName: 'Admin', displayName: 'Admin', isProtected: false, assignable: true, permissionIds: [101] },
      { roleId: 5, roleName: 'Support', displayName: 'Staff', isProtected: false, assignable: true, permissionIds: [] },
      { roleId: 6, roleName: 'Super Admin', displayName: 'Super Admin', isProtected: true, assignable: false, permissionIds: [101] },
    ]);
    getPermissionsMock.mockResolvedValue([
      {
        permissionId: 101,
        code: 'VIEW_PRODUCT',
        module: 'PRODUCT',
        description: 'Xem sản phẩm',
      },
      {
        permissionId: 102,
        code: 'VIEW_RETURNS',
        module: 'RETURNS',
        description: 'Xem hoàn trả',
      },
      {
        permissionId: 103,
        code: 'MANAGE_RETURNS',
        module: 'RETURNS',
        description: 'Xử lý hoàn trả',
      },
      {
        permissionId: 104,
        code: 'RETURN_REFUND_FINANCE_VIEW',
        module: 'RETURN',
        description: 'Xem thông tin tài chính hoàn tiền',
      },
      {
        permissionId: 105,
        code: 'RETURN_REFUND_FINANCE_COMPLETE',
        module: 'RETURN',
        description: 'Xác nhận hoàn tiền',
      },
      {
        permissionId: 106,
        code: 'CUSTOMER_BANK_ACCOUNT_MANAGE',
        module: 'CUSTOMER',
        description: 'Quản lý tài khoản ngân hàng hoàn tiền',
      },
    ]);
    updateRolePermissionsMock.mockResolvedValue(undefined);

    ({ Roles } = await import('@/admin/pages/Roles'));
  });

  afterEach(() => {
    cleanup();
  });

  it('shows only Admin, Staff, and Super Admin on the permission page', async () => {
    render(<Roles />);

    await waitFor(() => {
      expect(getRolesMock).toHaveBeenCalled();
      expect(getPermissionsMock).toHaveBeenCalled();
    });

    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Staff' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Super Admin/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Customer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Support' })).not.toBeInTheDocument();
    expect(screen.getByText('Vai trò Admin hiện có 1 / 6 quyền hạn được kích hoạt.')).toBeInTheDocument();
    expect(screen.getByText('Quản lý hoàn trả')).toBeInTheDocument();
    expect(screen.getByText('Quyền truy cập phân hệ')).toBeInTheDocument();
    expect(screen.getByText('Thao tác hoàn tiền nhạy cảm')).toBeInTheDocument();
    expect(screen.getByText('Quyền hoàn tiền nhạy cảm')).toBeInTheDocument();
    expect(screen.getByText('Xem tài chính hoàn tiền')).toBeInTheDocument();
    expect(screen.getByText('Xác nhận hoàn tiền & chứng từ')).toBeInTheDocument();
    expect(screen.getByText('Quyền chuyên biệt khác')).toBeInTheDocument();
    expect(screen.getByText('Quản lý tài khoản nhận hoàn tiền')).toBeInTheDocument();
    expect(screen.queryByText('RETURN_REFUND_FINANCE_VIEW')).not.toBeInTheDocument();
    expect(screen.queryByText('RETURN_REFUND_FINANCE_COMPLETE')).not.toBeInTheDocument();
    expect(screen.queryByText('CUSTOMER_BANK_ACCOUNT_MANAGE')).not.toBeInTheDocument();
  });

  it('keeps Super Admin read-only while visible', async () => {
    getRolesMock.mockResolvedValueOnce([
      { roleId: 6, roleName: 'Super Admin', displayName: 'Super Admin', isProtected: true, assignable: false, permissionIds: [101] },
    ]);

    render(<Roles />);

    await waitFor(() => {
      expect(getRolesMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Vai trò được bảo vệ')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
      expect(screen.getByLabelText('perm-101')).toBeDisabled();
    });
  });

  it('disables Save when no permissions have been changed since loading', async () => {
    render(<Roles />);

    await waitFor(() => {
      // Admin role has permissionIds: [101] — pre-loaded with no changes
      expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
    });
  });
});
