import React from 'react';

interface ReturnItem {
  returnRequestItemId?: number;
  orderItemId: number;
  quantity: number;
  unitPrice?: string | number | null;
  reason?: string | null;
  orderItem?: {
    productName?: string | null;
    variantName?: string | null;
    unitPrice?: string | number | null;
  };
}

const REASON_MAP: Record<string, string> = {
  DEFECTIVE: '🔧 Hàng lỗi',
  WRONG_ITEM: '📦 Sai sản phẩm',
  SIZE_ISSUE: '📏 Sai kích thước',
  CHANGED_MIND: '💭 Đổi ý',
  OTHER: '❓ Khác',
};

export function ReturnItemsTable({ items }: { items: ReturnItem[] }) {
  if (!items.length)
    return <div className="text-sm italic text-gray-400 py-2">Không có sản phẩm.</div>;

  const total = items.reduce(
    (sum, it) => sum + Number(it.unitPrice ?? it.orderItem?.unitPrice ?? 0) * it.quantity,
    0,
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Sản phẩm
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
              SL trả
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Đơn giá
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Thành tiền
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Lý do
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((it, idx) => {
            const price = Number(it.unitPrice ?? it.orderItem?.unitPrice ?? 0);
            const subtotal = price * it.quantity;
            return (
              <tr key={it.returnRequestItemId ?? idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {it.orderItem?.productName ?? `Item #${it.orderItemId}`}
                  </div>
                  {it.orderItem?.variantName && (
                    <div className="text-xs text-gray-500 mt-0.5">{it.orderItem.variantName}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-center font-medium">{it.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {price ? price.toLocaleString('vi-VN') + 'đ' : '—'}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {subtotal ? subtotal.toLocaleString('vi-VN') + 'đ' : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {it.reason ? REASON_MAP[it.reason] ?? it.reason : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr>
            <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-gray-600">
              Tổng hoàn dự kiến:
            </td>
            <td className="px-4 py-3 text-right text-base font-bold text-green-600">
              {total.toLocaleString('vi-VN')}đ
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
