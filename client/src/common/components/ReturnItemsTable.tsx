import React from 'react';
import { useTranslation } from 'react-i18next';

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

export function ReturnItemsTable({ items }: { items: ReturnItem[] }) {
  const { t } = useTranslation('returns');
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { ...options, defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };
  const emptyLabel = resolveText('itemsTable.empty', 'Không có sản phẩm.');
  const productLabel = resolveText('itemsTable.columns.product', 'Sản phẩm');
  const quantityLabel = resolveText('itemsTable.columns.quantity', 'SL trả');
  const unitPriceLabel = resolveText('itemsTable.columns.unitPrice', 'Đơn giá');
  const subtotalLabel = resolveText('itemsTable.columns.subtotal', 'Thành tiền');
  const reasonLabel = resolveText('itemsTable.columns.reason', 'Lý do');
  const totalLabel = resolveText('itemsTable.totalLabel', 'Tổng hoàn dự kiến:');
  const resolveItemFallback = (orderItemId: number) =>
    resolveText('itemsTable.itemFallback', 'Sản phẩm #{{id}}', { id: orderItemId });
  const resolveReasonLabel = (reason: string) => resolveText(`reasons.${reason}`, reason);

  if (!items.length)
    return <div className="py-2 text-sm italic text-gray-400">{emptyLabel}</div>;

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
              {productLabel}
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {quantityLabel}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {unitPriceLabel}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {subtotalLabel}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {reasonLabel}
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
                    {it.orderItem?.productName ?? resolveItemFallback(it.orderItemId)}
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
                  {it.reason ? resolveReasonLabel(it.reason) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr>
            <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-gray-600">
              {totalLabel}
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
