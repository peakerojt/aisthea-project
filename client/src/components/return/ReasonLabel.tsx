import React from 'react';

const REASON_MAP: Record<string, string> = {
  DEFECTIVE: '🔧 Hàng lỗi / hỏng',
  WRONG_ITEM: '📦 Giao sai sản phẩm',
  SIZE_ISSUE: '📏 Sai kích thước',
  CHANGED_MIND: '💭 Đổi ý',
  OTHER: '❓ Lý do khác',
};

export function ReasonLabel({ reason }: { reason: string }) {
  return (
    <span className="font-medium text-gray-800">
      {REASON_MAP[reason] ?? reason}
    </span>
  );
}
