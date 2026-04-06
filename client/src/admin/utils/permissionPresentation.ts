import type { PermissionItem } from '@/admin/services/role.service';

const STANDARD_MATRIX_ACTIONS = new Set(['VIEW', 'CREATE', 'EDIT', 'DELETE', 'MANAGE']);
const REFUND_SENSITIVE_CODES = new Set([
  'RETURN_REFUND_FINANCE_VIEW',
  'RETURN_REFUND_FINANCE_COMPLETE',
]);

export type OperationPermissionKind = 'refund-sensitive' | 'specialized';

export type OperationPermissionPresentation = {
  kind: OperationPermissionKind;
  titleKey: string;
  titleFallback: string;
  descriptionKey: string;
  descriptionFallback: string;
};

export const MODULE_ACCESS_PERMISSION_ORDER = [
  'PRODUCT',
  'ORDER',
  'INVENTORY',
  'CUSTOMER',
  'REVENUE',
  'COUPON',
  'RETURNS',
] as const;

const getActionFromCode = (code: string) => code.split('_')[0]?.toUpperCase() ?? '';

export const isRefundSensitivePermission = (permission: PermissionItem) =>
  REFUND_SENSITIVE_CODES.has(permission.code) || permission.module === 'RETURN';

export const isMatrixPermission = (permission: PermissionItem) =>
  STANDARD_MATRIX_ACTIONS.has(getActionFromCode(permission.code)) && !isRefundSensitivePermission(permission);

export const getModuleAccessPermissions = (permissions: PermissionItem[]) =>
  permissions.filter(isMatrixPermission);

export const getRefundSensitivePermissions = (permissions: PermissionItem[]) =>
  permissions.filter(isRefundSensitivePermission);

export const getSpecializedOperationPermissions = (permissions: PermissionItem[]) =>
  permissions.filter((permission) => !isMatrixPermission(permission) && !isRefundSensitivePermission(permission));

export const getOperationPermissionPresentation = (
  permission: PermissionItem,
): OperationPermissionPresentation => {
  switch (permission.code) {
    case 'RETURN_REFUND_FINANCE_VIEW':
      return {
        kind: 'refund-sensitive',
        titleKey: 'permissionTitles.RETURN_REFUND_FINANCE_VIEW',
        titleFallback: 'Xem tài chính hoàn tiền',
        descriptionKey: 'permissionDescriptions.RETURN_REFUND_FINANCE_VIEW',
        descriptionFallback: 'Cho phép xem thông tin tài chính, số tiền và ghi chú đối soát hoàn tiền. Không tự mở menu điều hướng.',
      };
    case 'RETURN_REFUND_FINANCE_COMPLETE':
      return {
        kind: 'refund-sensitive',
        titleKey: 'permissionTitles.RETURN_REFUND_FINANCE_COMPLETE',
        titleFallback: 'Xác nhận hoàn tiền & chứng từ',
        descriptionKey: 'permissionDescriptions.RETURN_REFUND_FINANCE_COMPLETE',
        descriptionFallback: 'Cho phép xác nhận hoàn tiền chuyển khoản và quản lý chứng từ/payout proof. Không tự mở menu điều hướng.',
      };
    case 'CUSTOMER_BANK_ACCOUNT_MANAGE':
      return {
        kind: 'specialized',
        titleKey: 'permissionTitles.CUSTOMER_BANK_ACCOUNT_MANAGE',
        titleFallback: 'Quản lý tài khoản nhận hoàn tiền',
        descriptionKey: 'permissionDescriptions.CUSTOMER_BANK_ACCOUNT_MANAGE',
        descriptionFallback: 'Cho phép xem và cập nhật thông tin tài khoản ngân hàng khách hàng dùng để nhận hoàn tiền.',
      };
    case 'REFUND_BENEFIT_VIEW':
      return {
        kind: 'specialized',
        titleKey: 'permissionTitles.REFUND_BENEFIT_VIEW',
        titleFallback: 'Xem ưu đãi hoàn tiền',
        descriptionKey: 'permissionDescriptions.REFUND_BENEFIT_VIEW',
        descriptionFallback: 'Cho phép xem các ưu đãi hoàn tiền đã phát hành. Đây là quyền chuyên biệt, không quyết định điều hướng.',
      };
    default:
      return {
        kind: 'specialized',
        titleKey: `permissionTitles.${permission.code}`,
        titleFallback: permission.code,
        descriptionKey: `permissionDescriptions.${permission.code}`,
        descriptionFallback: permission.description,
      };
  }
};
