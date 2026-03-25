import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { returnService } from '@/common/services/return.service';
import { StatusBadge } from '@/common/components/StatusBadge';
import { ReturnItemsTable } from '@/common/components/ReturnItemsTable';
import { ReturnTimeline } from '@/common/components/ReturnTimeline';
import { ReasonLabel } from '@/common/components/ReasonLabel';
interface Props {
  returnId: number;
  onBack?: () => void;
}

export const ReturnDetail: React.FC<Props> = ({ returnId, onBack }) => {
  const { t } = useTranslation('returns');
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { ...options, defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['return-detail', returnId],
    queryFn: () => returnService.detail(returnId),
    enabled: Number.isFinite(returnId) && returnId > 0,
  });
  const rr = data;
  const retryLabel = resolveText('detail.retry', 'Thử lại');
  const backToListLabel = resolveText('detail.backToList', 'Quay lại danh sách');
  const infoTitle = resolveText('detail.infoTitle', 'Thông tin yêu cầu');
  const infoReasonLabel = resolveText('detail.infoReason', 'Lý do');
  const infoStatusLabel = resolveText('detail.infoStatus', 'Trạng thái');
  const infoExpectedRefundLabel = resolveText('detail.infoExpectedRefund', 'Hoàn tiền dự kiến');
  const infoCreatedAtLabel = resolveText('detail.infoCreatedAt', 'Ngày tạo');
  const infoNoteLabel = resolveText('detail.infoNote', 'Ghi chú');
  const itemsTitle = resolveText('detail.itemsTitle', 'Sản phẩm trả');
  const attachmentsTitle = resolveText('detail.attachmentsTitle', 'Ảnh minh chứng');
  const timelineTitle = resolveText('detail.timelineTitle', 'Lịch sử trạng thái');
  const transactionsTitle = resolveText('detail.transactionsTitle', 'Giao dịch hoàn tiền');
  const refundOriginalLabel = resolveText('detail.refundOriginal', 'Hoàn về phương thức gốc');
  const refundWalletLabel = resolveText('detail.refundWallet', 'Ví điện tử');
  const notFoundLabel = resolveText('detail.notFound', 'Không tìm thấy yêu cầu trả hàng #{{id}}.', {
    id: returnId,
  });
  const headerTitle = (id: number) => resolveText('detail.headerTitle', 'Yêu cầu #{{id}}', { id });
  const headerSubtitle = (orderId: number, date: string) =>
    resolveText('detail.headerSubtitle', 'Đơn hàng #{{orderId}} · Tạo lúc {{date}}', {
      orderId,
      date,
    });
  const attachmentAlt = (index: number) =>
    resolveText('detail.attachmentAlt', 'Ảnh minh chứng {{index}}', { index });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-white/10" />
        <div className="h-24 rounded-xl bg-white/5 border border-white/10" />
        <div className="h-32 rounded-xl bg-white/5 border border-white/10" />
      </div>
    );
  }

  if (isError || !rr) {
    return (
      <div className="p-6 space-y-4">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          <p>{(error as { message?: string })?.message ?? notFoundLabel}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm underline hover:text-red-200"
          >
            {retryLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {headerTitle(rr.returnRequestId)}
          </h1>
          <p className="mt-0.5 text-sm text-white/60">
            {headerSubtitle(rr.orderId, new Date(rr.createdAt).toLocaleString('vi-VN'))}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={rr.status} />
          <button
            onClick={() => onBack?.()}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
          >
            ← {backToListLabel}
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="font-semibold text-white">{infoTitle}</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-white/50">{infoReasonLabel}</dt>
          <dd><ReasonLabel reason={rr.reason} /></dd>

          <dt className="text-white/50">{infoStatusLabel}</dt>
          <dd><StatusBadge status={rr.status} /></dd>

          <dt className="text-white/50">{infoExpectedRefundLabel}</dt>
          <dd className="font-semibold text-green-400">
            {Number(rr.totalRefundAmount).toLocaleString('vi-VN')}đ
          </dd>

          <dt className="text-white/50">{infoCreatedAtLabel}</dt>
          <dd className="text-white/80">
            {new Date(rr.createdAt).toLocaleString('vi-VN')}
          </dd>

          {rr.note && (
            <>
              <dt className="text-white/50">{infoNoteLabel}</dt>
              <dd className="text-white/80">{rr.note}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Items */}
      <div>
        <h2 className="mb-3 font-semibold text-white">{itemsTitle}</h2>
        <ReturnItemsTable items={rr.items ?? []} />
      </div>

      {/* Attachments */}
      {Array.isArray(rr.attachments) && rr.attachments.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-white">{attachmentsTitle}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {rr.attachments.map((att: { attachmentId?: number; fileUrl: string }, idx: number) => (
              <a
                key={att.attachmentId ?? idx}
                href={att.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-colors aspect-video bg-white/5"
              >
                <img
                  src={att.fileUrl}
                  alt={attachmentAlt(idx + 1)}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h2 className="mb-3 font-semibold text-white">{timelineTitle}</h2>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <ReturnTimeline logs={rr.statusLogs ?? []} />
        </div>
      </div>

      {/* Refund info */}
      {Array.isArray(rr.refundTransactions) && rr.refundTransactions.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-white">{transactionsTitle}</h2>
          <div className="space-y-3">
            {rr.refundTransactions.map((transaction: { transactionId: number; amount: number; method: string; status: string; transactionRef?: string }) => (
              <div
                key={transaction.transactionId}
                className="rounded-xl border border-green-500/20 bg-green-500/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-green-300">
                      💰 {Number(transaction.amount).toLocaleString('vi-VN')}đ
                    </div>
                    <div className="text-xs text-green-300/60 mt-0.5">
                      {transaction.method === 'ORIGINAL_PAYMENT'
                        ? refundOriginalLabel
                        : refundWalletLabel}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-green-300/80">{transaction.status}</div>
                    {transaction.transactionRef && (
                      <div className="text-xs text-green-300/50 mt-0.5">{transaction.transactionRef}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
