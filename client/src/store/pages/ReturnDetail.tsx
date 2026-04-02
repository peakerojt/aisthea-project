import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { returnDetailReadService } from '@/common/services/return.detail-read.service';
import {
  RETURN_SUMMARY_CHANGED_EVENT,
  type ReturnSummaryChangedDetail,
} from '@/common/events/returnSummary.events';
import { shouldAutoRefreshRefundState } from '@/common/utils/returnRefresh';
import { useReturnAutoRefresh } from '@/common/hooks/useReturnAutoRefresh';
import {
  ReturnAttachmentGallery,
  ReturnDetailNotices,
  ReturnDetailOverview,
  ReturnItemsSection,
  ReturnRefundTransactions,
  ReturnTimelineSection,
} from '@/store/components/return-detail/ReturnDetailSections';
import { ReturnItemList } from '@/store/components/return-detail/ReturnItemList';

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
    queryFn: () => returnDetailReadService.detail(returnId),
    enabled: Number.isFinite(returnId) && returnId > 0,
  });

  React.useEffect(() => {
    const handleReturnSummaryChanged = (event: Event) => {
      const detail = (event as CustomEvent<ReturnSummaryChangedDetail>).detail;
      if (detail?.returnRequestId !== returnId) {
        return;
      }

      void refetch();
    };

    window.addEventListener(
      RETURN_SUMMARY_CHANGED_EVENT,
      handleReturnSummaryChanged as EventListener,
    );

    return () => {
      window.removeEventListener(
        RETURN_SUMMARY_CHANGED_EVENT,
        handleReturnSummaryChanged as EventListener,
      );
    };
  }, [refetch, returnId]);

  useReturnAutoRefresh({
    enabled: shouldAutoRefreshRefundState(data?.refundStatus),
    onRefresh: () => {
      void refetch();
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="animate-pulse rounded-3xl border border-white/10 bg-[#101214] p-6">
          <div className="h-10 w-44 rounded-full bg-white/10" />
          <div className="mt-6 h-12 w-64 rounded-2xl bg-white/[0.08]" />
          <div className="mt-3 h-6 w-80 max-w-full rounded-xl bg-white/[0.06]" />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="h-40 rounded-2xl border border-white/8 bg-white/[0.03]" />
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-40 animate-pulse rounded-3xl border border-white/10 bg-[#101214]" />
          <div className="h-40 animate-pulse rounded-3xl border border-white/10 bg-[#101214]" />
        </div>
        <div className="h-72 animate-pulse rounded-3xl border border-white/10 bg-[#101214]" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div
          role="alert"
          className="rounded-3xl border border-red-300/18 bg-red-300/[0.08] p-5 text-red-50 shadow-[0_16px_40px_rgba(248,113,113,0.08)]"
        >
          <p className="text-sm leading-7">
            {(error as { message?: string })?.message ??
              resolveText('detail.notFound', 'Không tìm thấy yêu cầu trả hàng #{{id}}.', {
                id: returnId,
              })}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center rounded-full border border-red-100/20 bg-black/10 px-4 py-2 text-sm font-medium text-red-50 transition-colors hover:border-red-100/30 hover:bg-black/20"
          >
            {resolveText('detail.retry', 'Thử lại')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <ReturnDetailOverview detail={data} onBack={onBack} />
      <ReturnDetailNotices detail={data} />

      <ReturnItemsSection
        title={resolveText('detail.itemsTitle', 'Sản phẩm trả')}
        description={resolveText(
          'detail.itemsDescription',
          'Chi tiết sản phẩm, lý do và số tiền hoàn theo từng dòng trong yêu cầu này.',
        )}
      >
        <ReturnItemList items={data.items ?? []} />
      </ReturnItemsSection>

      <ReturnAttachmentGallery attachments={data.attachments} />
      <ReturnTimelineSection detail={data} />
      <ReturnRefundTransactions transactions={data.refundTransactions} />
    </div>
  );
};
