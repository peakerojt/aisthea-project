import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { returnService } from '../services/return.service';
import { StatusBadge } from '../components/return/StatusBadge';
import { ReasonLabel } from '../components/return/ReasonLabel';
import { useAuth } from '../contexts/AuthContext';
import { ViewState } from '../types';

interface Props {
  setView: (v: ViewState) => void;
  setReturnId: (id: number) => void;
}

function ReturnSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 h-24" />
      ))}
    </div>
  );
}

export const StoreMyReturns: React.FC<Props> = ({ setView, setReturnId }) => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const limit = 8;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-returns', page, limit],
    queryFn: async () => {
      const res = await returnService.myReturns(page, limit);
      return res.data?.data ?? res.data;
    },
    enabled: Boolean(user),
  });

  const list: any[] = data?.data ?? data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.totalPages ?? Math.ceil(total / limit);

  if (!user) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur p-6 text-center text-white/80">
          Vui lòng đăng nhập để xem đơn trả hàng.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Đơn trả hàng</h1>
          <p className="mt-0.5 text-sm text-white/60">Lịch sử yêu cầu trả hàng của bạn</p>
        </div>
        <button
          onClick={() => setView('STORE_MY_ORDERS')}
          className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
        >
          ← Đơn hàng
        </button>
      </div>

      {/* States */}
      {isLoading && <ReturnSkeleton />}

      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          <p className="font-medium">Không tải được danh sách</p>
          <p className="text-sm mt-1 opacity-80">{(error as any)?.message ?? 'Lỗi không xác định'}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 rounded-lg bg-red-600/40 px-3 py-1.5 text-sm hover:bg-red-600/60 transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !isError && list.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="text-lg font-semibold text-white">Chưa có yêu cầu trả hàng</h3>
          <p className="mt-1 text-sm text-white/60">
            Bạn chưa có yêu cầu trả hàng nào. Khi muốn trả, hãy vào đơn hàng đã giao.
          </p>
          <button
            onClick={() => setView('STORE_MY_ORDERS')}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            Xem đơn hàng
          </button>
        </div>
      )}

      {!isLoading && !isError && list.length > 0 && (
        <>
          <div className="space-y-3">
            {list.map((r: any) => (
              <button
                key={r.returnRequestId}
                id={`return-card-${r.returnRequestId}`}
                onClick={() => {
                  setReturnId(r.returnRequestId);
                  setView('STORE_RETURN_DETAIL');
                }}
                className="group w-full text-left rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-150"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">
                        Return #{r.returnRequestId}
                      </span>
                      <span className="text-white/40">·</span>
                      <span className="text-sm text-white/60">
                        Đơn #{r.orderId}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-white/70">
                      <ReasonLabel reason={r.reason} />
                    </div>
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium text-green-400">
                        {Number(r.totalRefundAmount).toLocaleString('vi-VN')}đ
                      </span>
                      <span className="text-xs text-white/40">
                        {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-white/30 group-hover:text-white/50 transition-colors">
                      Xem chi tiết →
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-white/50">
                Trang {page}/{totalPages} · {total} kết quả
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-white/80 disabled:opacity-40 hover:bg-white/10 transition-colors"
                >
                  ← Trước
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-white/80 disabled:opacity-40 hover:bg-white/10 transition-colors"
                >
                  Tiếp →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
