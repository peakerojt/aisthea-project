import React from 'react';
import { useTranslation } from 'react-i18next';
import { refundUi } from '@/common/styles/refundUi';
import { toNumericAmount } from '@/common/utils/returnAmounts';
import { summarizeReturnItemEconomics } from '@/common/utils/returnEconomics';

interface ReturnItem {
  returnRequestItemId?: number;
  orderItemId: number;
  quantity: number;
  unitPrice?: string | number | null;
  requestedRefundAmount?: string | number | null;
  orderItemGrossAmount?: string | number | null;
  orderItemAllocatedDiscountAmount?: string | number | null;
  orderItemNetPaidAmount?: string | number | null;
  reason?: string | null;
  reasonText?: string | null;
  attachments?: Array<{
    attachmentId?: number;
    returnRequestItemId?: number | null;
    fileUrl: string;
  }>;
  orderItem?: {
    productName?: string | null;
    variantName?: string | null;
    unitPrice?: string | number | null;
  };
}

export function ReturnItemsTable({ items }: { items: ReturnItem[] }) {
  const { t } = useTranslation('returns');
  const formatMoney = (value: string | number | null | undefined) => {
    const amount = toNumericAmount(value);
    return amount ? `${amount.toLocaleString('vi-VN')}đ` : '—';
  };
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
  const grossLabel = resolveText('itemsTable.grossLabel', 'Gốc');
  const discountLabel = resolveText('itemsTable.discountLabel', 'Giảm giá');
  const netPaidLabel = resolveText('itemsTable.netPaidLabel', 'Thực trả');
  const requestedRefundLabel = resolveText('itemsTable.requestedRefundLabel', 'Hoàn yêu cầu');
  const grossTotalLabel = resolveText('itemsTable.grossTotalLabel', 'Tổng giá gốc');
  const discountTotalLabel = resolveText('itemsTable.discountTotalLabel', 'Tổng giảm giá phân bổ');
  const netPaidTotalLabel = resolveText('itemsTable.netPaidTotalLabel', 'Tổng thực trả');
  const attachmentsLabel = resolveText('itemsTable.attachmentsLabel', 'Ảnh đính kèm');
  const reasonNoteLabel = resolveText('itemsTable.reasonNoteLabel', 'Ghi chú');
  const attachmentAlt = (index: number) =>
    resolveText('itemsTable.attachmentAlt', 'Ảnh sản phẩm trả {{index}}', { index });
  const resolveItemFallback = (orderItemId: number) =>
    resolveText('itemsTable.itemFallback', 'Sản phẩm #{{id}}', { id: orderItemId });
  const resolveReasonLabel = (reason: string) => resolveText(`reasons.${reason}`, reason);

  if (!items.length) {
    return (
      <div className={`${refundUi.sectionMuted} px-5 py-4 text-sm italic text-white/55`}>
        {emptyLabel}
      </div>
    );
  }

  const total = items.reduce(
    (sum, it) =>
      sum +
      toNumericAmount(
        it.requestedRefundAmount ??
          (toNumericAmount(it.unitPrice ?? it.orderItem?.unitPrice ?? 0) * it.quantity),
      ),
    0,
  );
  const economicsSummary = summarizeReturnItemEconomics(items);

  return (
    <div className={`overflow-hidden ${refundUi.surface}`}>
      <div className="hidden border-b border-white/8 bg-white/[0.03] px-5 py-4 md:grid md:grid-cols-[minmax(0,2.4fr)_0.7fr_1fr_1fr_1.1fr] md:gap-4">
        {[productLabel, quantityLabel, unitPriceLabel, subtotalLabel, reasonLabel].map((label) => (
          <div key={label} className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
            {label}
          </div>
        ))}
      </div>

      <div className="divide-y divide-white/6">
        {items.map((it, idx) => {
          const price = toNumericAmount(it.unitPrice ?? it.orderItem?.unitPrice ?? 0);
          const subtotal = toNumericAmount(it.requestedRefundAmount ?? price * it.quantity);
          const grossAmount = toNumericAmount(it.orderItemGrossAmount);
          const discountAmount = toNumericAmount(it.orderItemAllocatedDiscountAmount);
          const netPaidAmount = toNumericAmount(it.orderItemNetPaidAmount);
          const hasEconomicsBreakdown = grossAmount > 0 || discountAmount > 0 || netPaidAmount > 0;
          const itemAttachments = Array.isArray(it.attachments) ? it.attachments : [];

          return (
            <div
              key={it.returnRequestItemId ?? idx}
              className="grid gap-4 px-5 py-5 transition-colors hover:bg-white/[0.025] md:grid-cols-[minmax(0,2.4fr)_0.7fr_1fr_1fr_1.1fr]"
            >
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/38 md:hidden">
                  {productLabel}
                </div>
                <div className="mt-2 md:mt-0">
                  <div className="text-[1.15rem] font-semibold leading-tight tracking-[-0.03em] text-white">
                    {it.orderItem?.productName ?? resolveItemFallback(it.orderItemId)}
                  </div>
                  {it.orderItem?.variantName && (
                    <div className="mt-1 text-sm text-white/62">{it.orderItem.variantName}</div>
                  )}
                </div>
                {hasEconomicsBreakdown && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className={`${refundUi.sectionMuted} px-3 py-2`}>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/38">{grossLabel}</div>
                      <div className="mt-1 text-sm font-medium text-white/84">{formatMoney(grossAmount)}</div>
                    </div>
                    <div className={`${refundUi.sectionMuted} px-3 py-2`}>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/38">{discountLabel}</div>
                      <div className="mt-1 text-sm font-medium text-white/84">{formatMoney(discountAmount)}</div>
                    </div>
                    <div className={`${refundUi.sectionMuted} px-3 py-2`}>
                      <div className="text-[10px] uppercase tracking-[0.16em] text-white/38">{netPaidLabel}</div>
                      <div className="mt-1 text-sm font-medium text-white/84">{formatMoney(netPaidAmount)}</div>
                    </div>
                  </div>
                )}
                {itemAttachments.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/38">
                      {attachmentsLabel}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {itemAttachments.map((attachment, attachmentIndex) => (
                        <a
                          key={attachment.attachmentId ?? `${it.returnRequestItemId ?? idx}-${attachmentIndex}`}
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/25"
                        >
                          <img
                            src={attachment.fileUrl}
                            alt={attachmentAlt(attachmentIndex + 1)}
                            className="h-16 w-16 object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={`${refundUi.sectionMuted} px-4 py-3 md:border-0 md:bg-transparent md:px-0 md:py-0`}>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/38 md:hidden">
                  {quantityLabel}
                </div>
                <div className="mt-2 text-lg font-semibold text-white md:mt-0 md:text-center">
                  {it.quantity}
                </div>
              </div>

              <div className={`${refundUi.sectionMuted} px-4 py-3 md:border-0 md:bg-transparent md:px-0 md:py-0`}>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/38 md:hidden">
                  {unitPriceLabel}
                </div>
                <div className="mt-2 text-sm text-white/80 md:mt-0 md:text-right">
                  <div>{formatMoney(price)}</div>
                  {subtotal > 0 && (
                    <div className="mt-1 text-[11px] text-white/52">
                      {requestedRefundLabel}:{' '}
                      <span className="font-medium text-white/76">{formatMoney(subtotal)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={`${refundUi.sectionMuted} px-4 py-3 md:border-0 md:bg-transparent md:px-0 md:py-0`}>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/38 md:hidden">
                  {subtotalLabel}
                </div>
                <div className="mt-2 text-[1.2rem] font-semibold tracking-[-0.03em] text-white md:mt-0 md:text-right">
                  {formatMoney(subtotal)}
                </div>
              </div>

              <div className={`${refundUi.sectionMuted} px-4 py-3 md:border-0 md:bg-transparent md:px-0 md:py-0`}>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/38 md:hidden">
                  {reasonLabel}
                </div>
                <div className="mt-2 text-sm leading-relaxed text-white/72 md:mt-0">
                  <div>{it.reason ? resolveReasonLabel(it.reason) : '—'}</div>
                  {it.reasonText && (
                    <div className="mt-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-white/58">
                      {reasonNoteLabel}: <span className="text-white/76">{it.reasonText}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/8 bg-white/[0.02] px-5 py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">{totalLabel}</div>
          <div className="text-[1.65rem] font-semibold tracking-[-0.04em] text-emerald-300">
            {total.toLocaleString('vi-VN')}đ
          </div>
        </div>

        {economicsSummary.hasSnapshotBreakdown && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className={`${refundUi.sectionMuted} px-4 py-3`}>
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/38">{grossTotalLabel}</div>
              <div className="mt-2 text-base font-semibold text-white">{formatMoney(economicsSummary.totalGrossAmount)}</div>
            </div>
            <div className={`${refundUi.sectionMuted} px-4 py-3`}>
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/38">{discountTotalLabel}</div>
              <div className="mt-2 text-base font-semibold text-white">{formatMoney(economicsSummary.totalDiscountAmount)}</div>
            </div>
            <div className={`${refundUi.sectionMuted} px-4 py-3`}>
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/38">{netPaidTotalLabel}</div>
              <div className="mt-2 text-base font-semibold text-white">{formatMoney(economicsSummary.totalNetPaidAmount)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
