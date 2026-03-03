import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { returnService } from '../services/return.service';
import { StatusBadge } from '../components/return/StatusBadge';
import { ReturnItemsTable } from '../components/return/ReturnItemsTable';
import { ReturnTimeline } from '../components/return/ReturnTimeline';
import { ReasonLabel } from '../components/return/ReasonLabel';
import { ViewState } from '../types';

interface Props {
  returnId: number;
  setView: (v: ViewState) => void;
}

export const StoreReturnDetail: React.FC<Props> = ({ returnId, setView }) => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['return-detail', returnId],
    queryFn: async () => {
      const res = await returnService.detail(returnId);
      return res.data?.data ?? res.data;
    },
    enabled: Number.isFinite(returnId) && returnId > 0,
  });

  const rr = data?.data ?? data;

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
          <p>{(error as any)?.message ?? 'Không tìm thấy return request.'}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm underline hover:text-red-200"
          >
            Thử lại
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
            Return #{rr.returnRequestId}
          </h1>
          <p className="mt-0.5 text-sm text-white/60">Đơn hàng #{rr.orderId}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={rr.status} />
          <button
            onClick={() => setView('STORE_MY_RETURNS')}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
          >
            ← Danh sách
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="font-semibold text-white">Thông tin yêu cầu</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-white/50">Lý do</dt>
          <dd><ReasonLabel reason={rr.reason} /></dd>

          <dt className="text-white/50">Trạng thái</dt>
          <dd><StatusBadge status={rr.status} /></dd>

          <dt className="text-white/50">Hoàn tiền dự kiến</dt>
          <dd className="font-semibold text-green-400">
            {Number(rr.totalRefundAmount).toLocaleString('vi-VN')}đ
          </dd>

          <dt className="text-white/50">Ngày tạo</dt>
          <dd className="text-white/80">
            {new Date(rr.createdAt).toLocaleString('vi-VN')}
          </dd>

          {rr.note && (
            <>
              <dt className="text-white/50">Ghi chú</dt>
              <dd className="text-white/80">{rr.note}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Items */}
      <div>
        <h2 className="mb-3 font-semibold text-white">Sản phẩm trả</h2>
        <ReturnItemsTable items={rr.items ?? []} />
      </div>

      {/* Attachments */}
      {Array.isArray(rr.attachments) && rr.attachments.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-white">Ảnh minh chứng</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {rr.attachments.map((att: any, idx: number) => (
              <a
                key={att.attachmentId ?? idx}
                href={att.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-colors aspect-video bg-white/5"
              >
                <img
                  src={att.fileUrl}
                  alt={`Attachment ${idx + 1}`}
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
        <h2 className="mb-3 font-semibold text-white">Lịch sử trạng thái</h2>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <ReturnTimeline logs={rr.statusLogs ?? []} />
        </div>
      </div>

      {/* Refund info */}
      {Array.isArray(rr.refundTransactions) && rr.refundTransactions.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold text-white">Thông tin hoàn tiền</h2>
          <div className="space-y-3">
            {rr.refundTransactions.map((t: any) => (
              <div
                key={t.transactionId}
                className="rounded-xl border border-green-500/20 bg-green-500/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-green-300">
                      💰 {Number(t.amount).toLocaleString('vi-VN')}đ
                    </div>
                    <div className="text-xs text-green-300/60 mt-0.5">
                      {t.method === 'ORIGINAL_PAYMENT' ? 'Hoàn về phương thức gốc' : 'Ví điện tử'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-green-300/80">{t.status}</div>
                    {t.transactionRef && (
                      <div className="text-xs text-green-300/50 mt-0.5">{t.transactionRef}</div>
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
