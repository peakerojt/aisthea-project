import React from 'react';
import { ImageIcon, Package, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReturnRequestItem } from '@/common/services/return.types';
import { summarizeReturnItemEconomics } from '@/common/utils/returnEconomics';
import { toNumericAmount } from '@/common/utils/returnAmounts';
import { translateLegacyReturnCopy } from '@/common/utils/returnCopy';

const surfaceClassName =
  'rounded-3xl border border-white/10 bg-[#101214] shadow-[0_24px_64px_rgba(0,0,0,0.24)]';
const panelClassName = 'rounded-2xl border border-white/10 bg-white/[0.03]';
const mutedPanelClassName = 'rounded-2xl border border-white/8 bg-white/[0.02]';
const eyebrowClassName = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-white/42';

const joinClasses = (...classes: Array<string | undefined>) =>
  classes.filter(Boolean).join(' ');

type ReturnItemListItem = ReturnRequestItem & {
  image?: string | null;
  imageUrl?: string | null;
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
  orderItem?: ReturnRequestItem['orderItem'] & {
    thumbnailUrl?: string | null;
    thumbnail?: string | null;
    image?: string | null;
    imageUrl?: string | null;
    product?: {
      image?: string | null;
      imageUrl?: string | null;
      thumbnailUrl?: string | null;
      images?: Array<{
        imageUrl?: string | null;
        thumbnailUrl?: string | null;
      }>;
    } | null;
  };
};

const resolveProductThumbnailUrl = (item: ReturnItemListItem) => {
  const firstProductImage = item.orderItem?.product?.images?.[0];

  return (
    item.orderItem?.thumbnailUrl ??
    item.orderItem?.imageUrl ??
    item.orderItem?.thumbnail ??
    item.orderItem?.image ??
    item.thumbnailUrl ??
    item.imageUrl ??
    item.thumbnailUrl ??
    item.thumbnail ??
    item.image ??
    item.orderItem?.product?.thumbnailUrl ??
    item.orderItem?.product?.imageUrl ??
    item.orderItem?.product?.image ??
    firstProductImage?.thumbnailUrl ??
    firstProductImage?.imageUrl ??
    null
  );
};

const resolveProductPreviewImageUrl = (item: ReturnItemListItem) => {
  const firstProductImage = item.orderItem?.product?.images?.[0];

  return (
    item.orderItem?.imageUrl ??
    item.orderItem?.thumbnailUrl ??
    item.orderItem?.image ??
    item.orderItem?.thumbnail ??
    item.imageUrl ??
    item.thumbnailUrl ??
    item.image ??
    item.thumbnail ??
    item.orderItem?.product?.imageUrl ??
    item.orderItem?.product?.thumbnailUrl ??
    item.orderItem?.product?.image ??
    firstProductImage?.imageUrl ??
    firstProductImage?.thumbnailUrl ??
    null
  );
};

export function ReturnItemList({ items }: { items: ReturnItemListItem[] }) {
  const { t } = useTranslation('returns');
  const [previewImage, setPreviewImage] = React.useState<{
    src: string;
    alt: string;
    title: string;
  } | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = React.useState(false);
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { ...options, defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };
  const formatMoney = (value: string | number | null | undefined) => {
    const amount = toNumericAmount(value);
    return amount > 0 ? `${amount.toLocaleString('vi-VN')}đ` : '—';
  };
  const resolveItemFallback = (orderItemId: number) =>
    resolveText('itemsTable.itemFallback', 'Sản phẩm #{{id}}', { id: orderItemId });
  const resolveReasonLabel = (reason: string) => resolveText(`reasons.${reason}`, reason);
  const attachmentAlt = (index: number) =>
    resolveText('itemsTable.attachmentAlt', 'Ảnh sản phẩm trả {{index}}', { index });
  const emptyLabel = resolveText('itemsTable.empty', 'Không có sản phẩm.');
  const quantityLabel = resolveText('itemsTable.columns.quantity', 'SL trả');
  const unitPriceLabel = resolveText('itemsTable.columns.unitPrice', 'Đơn giá');
  const reasonLabel = resolveText('itemsTable.columns.reason', 'Lý do');
  const totalLabel = resolveText('itemsTable.totalLabel', 'Tổng hoàn dự kiến:');
  const grossLabel = resolveText('itemsTable.grossLabel', 'Gốc');
  const discountLabel = resolveText('itemsTable.discountLabel', 'Giảm giá');
  const netPaidLabel = resolveText('itemsTable.netPaidLabel', 'Thực trả');
  const grossTotalLabel = resolveText('itemsTable.grossTotalLabel', 'Tổng giá gốc');
  const discountTotalLabel = resolveText('itemsTable.discountTotalLabel', 'Tổng giảm giá phân bổ');
  const netPaidTotalLabel = resolveText('itemsTable.netPaidTotalLabel', 'Tổng thực trả');
  const attachmentsLabel = resolveText('itemsTable.attachmentsLabel', 'Ảnh đính kèm');
  const reasonNoteLabel = resolveText('itemsTable.reasonNoteLabel', 'Ghi chú');
  const productImageAlt = (name: string) =>
    resolveText('itemsTable.productImageAlt', 'Ảnh sản phẩm {{name}}', { name });
  const productImageButtonLabel = (name: string) =>
    resolveText('itemsTable.openImagePreviewForItem', 'Xem ảnh sản phẩm {{name}}', { name });
  const previewDialogLabel = resolveText('itemsTable.imagePreviewTitle', 'Xem ảnh sản phẩm');
  const closePreviewLabel = resolveText('itemsTable.closeImagePreview', 'Đóng xem ảnh sản phẩm');

  React.useEffect(() => {
    if (!previewImage) {
      setIsPreviewVisible(false);
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => setIsPreviewVisible(true));
    return () => window.cancelAnimationFrame(frameId);
  }, [previewImage]);

  if (!items.length) {
    return (
      <div className={joinClasses(surfaceClassName, 'p-6 text-sm italic text-white/58')}>
        {emptyLabel}
      </div>
    );
  }

  const economicsSummary = summarizeReturnItemEconomics(items);
  const shouldShowFooterSummary = items.length > 1;

  return (
    <div className={joinClasses(surfaceClassName, 'overflow-hidden')}>
      <div className="divide-y divide-white/8">
        {items.map((item, index) => {
          const price = toNumericAmount(item.unitPrice ?? item.orderItem?.unitPrice ?? 0);
          const grossAmount = toNumericAmount(item.orderItemGrossAmount);
          const discountAmount = toNumericAmount(item.orderItemAllocatedDiscountAmount);
          const netPaidAmount = toNumericAmount(item.orderItemNetPaidAmount);
          const itemAttachments = Array.isArray(item.attachments) ? item.attachments : [];
          const hasBreakdown = grossAmount > 0 || discountAmount > 0 || netPaidAmount > 0;
          const productTitle = item.orderItem?.productName ?? resolveItemFallback(item.orderItemId);
          const translatedReasonText = translateLegacyReturnCopy(item.reasonText, resolveText);
          const productVariantLabel =
            item.orderItem?.variantName ??
            resolveText('itemsTable.rowFallbackMetaLabel', 'Dòng sản phẩm #{{id}}', {
              id: item.orderItemId,
            });
          const productThumbnailUrl = resolveProductThumbnailUrl(item);
          const productPreviewImageUrl = resolveProductPreviewImageUrl(item);
          const productImageAltText = productImageAlt(productTitle);

          return (
            <article
              key={item.returnRequestItemId ?? `${item.orderItemId}-${index}`}
              className="p-5 sm:p-6"
            >
              <div className="min-w-0 space-y-4">
                <div className="flex items-start gap-4">
                  {productThumbnailUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewImage({
                          src: productPreviewImageUrl ?? productThumbnailUrl,
                          alt: productImageAltText,
                          title: productTitle,
                        })}
                      aria-label={productImageButtonLabel(productTitle)}
                      className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-colors hover:border-white/25"
                    >
                      <img
                        src={productThumbnailUrl}
                        alt={productImageAltText}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
                        <Search
                          size={16}
                          className="text-white opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </div>
                    </button>
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/68">
                      <Package size={18} />
                    </div>
                  )}
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-base font-semibold leading-6 text-white sm:text-lg">
                      {productTitle}
                    </h3>
                    <p className="text-sm text-white/56">{productVariantLabel}</p>
                  </div>
                </div>

                <div className={joinClasses(panelClassName, 'p-4')}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className={eyebrowClassName}>{quantityLabel}</div>
                      <div className="mt-2 text-sm font-semibold text-white">{item.quantity}</div>
                    </div>
                    <div>
                      <div className={eyebrowClassName}>{unitPriceLabel}</div>
                      <div className="mt-2 text-sm font-semibold text-white">{formatMoney(price)}</div>
                    </div>
                    <div>
                      <div className={eyebrowClassName}>{reasonLabel}</div>
                      <div className="mt-2 text-sm leading-6 text-white/78">
                        {item.reason ? resolveReasonLabel(item.reason) : '—'}
                      </div>
                    </div>
                  </div>
                  {item.reasonText && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-white/64">
                      {reasonNoteLabel}:{' '}
                      <span className="text-white/82">{translatedReasonText ?? item.reasonText}</span>
                    </div>
                  )}
                </div>

                {hasBreakdown && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className={joinClasses(mutedPanelClassName, 'p-3')}>
                      <div className={eyebrowClassName}>{grossLabel}</div>
                      <div className="mt-2 text-sm font-medium text-white/84">
                        {formatMoney(grossAmount)}
                      </div>
                    </div>
                    <div className={joinClasses(mutedPanelClassName, 'p-3')}>
                      <div className={eyebrowClassName}>{discountLabel}</div>
                      <div className="mt-2 text-sm font-medium text-white/84">
                        {formatMoney(discountAmount)}
                      </div>
                    </div>
                    <div className={joinClasses(mutedPanelClassName, 'p-3')}>
                      <div className={eyebrowClassName}>{netPaidLabel}</div>
                      <div className="mt-2 text-sm font-medium text-white/84">
                        {formatMoney(netPaidAmount)}
                      </div>
                    </div>
                  </div>
                )}

                {itemAttachments.length > 0 && (
                  <div className="space-y-3">
                    <div className={joinClasses('flex items-center gap-2', eyebrowClassName)}>
                      <ImageIcon size={13} />
                      {attachmentsLabel}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {itemAttachments.map((attachment, attachmentIndex) => (
                        <a
                          key={attachment.attachmentId ?? `${item.orderItemId}-${attachmentIndex}`}
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/20"
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
            </article>
          );
        })}
      </div>

      {shouldShowFooterSummary && (
        <footer className="border-t border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-emerald-300/16 bg-emerald-300/[0.08] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-100/74">
                {totalLabel}
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-emerald-100">
                {formatMoney(economicsSummary.totalRequestedRefundAmount)}
              </div>
            </div>
            <div className={joinClasses(panelClassName, 'p-4')}>
              <div className={eyebrowClassName}>{grossTotalLabel}</div>
              <div className="mt-3 text-lg font-semibold text-white">
                {formatMoney(economicsSummary.totalGrossAmount)}
              </div>
            </div>
            <div className={joinClasses(panelClassName, 'p-4')}>
              <div className={eyebrowClassName}>{discountTotalLabel}</div>
              <div className="mt-3 text-lg font-semibold text-white">
                {formatMoney(economicsSummary.totalDiscountAmount)}
              </div>
            </div>
            <div className={joinClasses(panelClassName, 'p-4')}>
              <div className={eyebrowClassName}>{netPaidTotalLabel}</div>
              <div className="mt-3 text-lg font-semibold text-white">
                {formatMoney(economicsSummary.totalNetPaidAmount)}
              </div>
            </div>
          </div>
        </footer>
      )}

      {previewImage && (
        <div
          role="presentation"
          className={`fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/70 p-4 transition-all duration-200 ease-out ${
            isPreviewVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewImage(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={previewDialogLabel}
            className={`relative w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200/10 bg-[#0B0B0C] shadow-2xl shadow-black/40 transform-gpu transition-all duration-200 ease-out will-change-transform ${
              isPreviewVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200/10 px-6 pb-4 pt-5">
              <div className="min-w-0">
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/80">
                  {previewDialogLabel}
                </h2>
                <p className="mt-1 truncate text-sm text-white/52">{previewImage.title}</p>
              </div>
              <button
                type="button"
                aria-label={closePreviewLabel}
                onClick={() => setPreviewImage(null)}
                className="rounded-lg p-1.5 text-white/40 transition-all hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                <img
                  src={previewImage.src}
                  alt={previewImage.alt}
                  className="max-h-[75vh] w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
