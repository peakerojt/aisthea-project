import { describe, expect, it } from 'vitest';
import { getOperationPermissionPresentation } from '@/admin/utils/permissionPresentation';

describe('getOperationPermissionPresentation', () => {
  it.each([
    {
      code: 'RETURN_REFUND_FINANCE_VIEW',
      module: 'RETURN',
      description: 'raw refund finance view',
      expectedKind: 'refund-sensitive',
      expectedTitle: 'Xem tài chính hoàn tiền',
      expectedDescription: 'Cho phép xem thông tin tài chính, số tiền và ghi chú đối soát hoàn tiền. Không tự mở menu điều hướng.',
    },
    {
      code: 'RETURN_REFUND_FINANCE_COMPLETE',
      module: 'RETURN',
      description: 'raw refund finance complete',
      expectedKind: 'refund-sensitive',
      expectedTitle: 'Xác nhận hoàn tiền & chứng từ',
      expectedDescription: 'Cho phép xác nhận hoàn tiền chuyển khoản và quản lý chứng từ/payout proof. Không tự mở menu điều hướng.',
    },
    {
      code: 'CUSTOMER_BANK_ACCOUNT_MANAGE',
      module: 'CUSTOMER',
      description: 'raw customer bank account manage',
      expectedKind: 'specialized',
      expectedTitle: 'Quản lý tài khoản nhận hoàn tiền',
      expectedDescription: 'Cho phép xem và cập nhật tài khoản ngân hàng khách hàng dùng để nhận hoàn tiền.',
    },
    {
      code: 'REFUND_BENEFIT_VIEW',
      module: 'COUPON',
      description: 'raw refund benefit view',
      expectedKind: 'specialized',
      expectedTitle: 'Xem ưu đãi hoàn tiền',
      expectedDescription: 'Cho phép xem các ưu đãi hoàn tiền đã phát hành. Đây là quyền chuyên biệt, không quyết định điều hướng.',
    },
  ])('maps $code to a friendly fallback payload', ({
    code,
    module,
    description,
    expectedKind,
    expectedTitle,
    expectedDescription,
  }) => {
    const presentation = getOperationPermissionPresentation({
      permissionId: 1,
      code,
      module,
      description,
    });

    expect(presentation.kind).toBe(expectedKind);
    expect(presentation.titleKey).toBe(`permissionTitles.${code}`);
    expect(presentation.titleFallback).toBe(expectedTitle);
    expect(presentation.descriptionKey).toBe(`permissionDescriptions.${code}`);
    expect(presentation.descriptionFallback).toBe(expectedDescription);
  });
});
