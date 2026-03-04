import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelOrder, fetchOrderDetail, OrderDetail } from '../services/orderApi';
import { ApiError } from '../services/httpClient';
import { StoreHeader } from '../components/StoreHeader';
import { useAuth } from '../contexts/AuthContext';
import { OrderHeader } from '../components/order/OrderHeader';
import { ShippingAddressCard } from '../components/order/ShippingAddressCard';
import { OrderItemsTable } from '../components/order/OrderItemsTable';
import { OrderPricingSummary } from '../components/order/OrderPricingSummary';
import { OrderTimeline } from '../components/order/OrderTimeline';

const canCancelStatus = (status: string | null | undefined) => {
  const s = (status || '').toLowerCase();
  return s === 'pending';
};

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: () => fetchOrderDetail(id || ''),
    enabled: !!id && role !== 'guest',
    retry: false,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(id || ''),
    onMutate: async () => {
      if (!order) return;
      await queryClient.cancelQueries({ queryKey: ['order-detail', id] });
      const previous = queryClient.getQueryData<OrderDetail>(['order-detail', id]);

      const optimistic: OrderDetail = {
        ...order,
        status: 'cancelled',
        timeline: [
          ...order.timeline,
          {
            status: 'cancelled',
            at: new Date().toISOString(),
          },
        ],
      };

      queryClient.setQueryData(['order-detail', id], optimistic);
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['order-detail', id], context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['order-detail', id], data);
    },
  });

  const structuredError = error as ApiError | null;

  const canCancel = useMemo(() => {
    if (!order) return false;
    return canCancelStatus(order.status);
  }, [order]);

  if (role === 'guest') {
    return (
      <div className="bg-bg-dark min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-white/60 mb-4">Vui lòng đăng nhập để xem chi tiết đơn hàng.</p>
          <button
            onClick={() => navigate('/auth/login')}
            className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  const isNotFound =
    structuredError?.status === 404 || structuredError?.code === 'NOT_FOUND';
  const isForbidden =
    structuredError?.status === 403 || structuredError?.code === 'FORBIDDEN';

  return (
    <div className="bg-bg-dark min-h-screen text-white font-sans">
      <StoreHeader setView={() => navigate('/')} setCategory={() => undefined} />

      <div className="pt-32 px-6 md:px-12 max-w-6xl mx-auto pb-24">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Chi tiết đơn hàng</h1>
            <p className="text-white/40 text-xs uppercase tracking-widest mt-2">
              Tất cả thông tin đơn hàng của bạn ở một nơi
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
          >
            Quay lại
          </button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="h-6 w-48 bg-white/10 rounded mb-4" />
                <div className="h-4 w-32 bg-white/5 rounded" />
              </div>
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="h-24 bg-white/5 rounded" />
              </div>
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="h-40 bg-white/5 rounded" />
              </div>
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6 h-48" />
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6 h-32" />
            </div>
          </div>
        )}

        {isError && !isLoading && (
          <div className="mt-4">
            {isNotFound ? (
              <div className="bg-surface-dark border border-white/10 rounded-sm p-6 text-center">
                <h2 className="text-lg font-semibold text-white mb-2">Đơn hàng không tồn tại</h2>
                <p className="text-sm text-white/60 mb-4">
                  Có thể mã đơn hàng đã bị sai hoặc đơn hàng đã bị xóa.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  Về trang chủ
                </button>
              </div>
            ) : isForbidden ? (
              <div className="bg-surface-dark border border-red-500/30 rounded-sm p-6 text-center">
                <h2 className="text-lg font-semibold text-red-300 mb-2">Không có quyền truy cập</h2>
                <p className="text-sm text-red-200/80 mb-4">
                  Bạn không thể xem chi tiết đơn hàng này. Hãy kiểm tra lại tài khoản của bạn.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  Về trang chủ
                </button>
              </div>
            ) : (
              <div className="bg-surface-dark border border-red-500/20 rounded-sm p-6">
                <p className="text-sm text-red-200 mb-4">
                  Không thể tải chi tiết đơn hàng. {structuredError?.message}
                </p>
                <button
                  onClick={() => refetch()}
                  className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  Thử lại
                </button>
              </div>
            )}
          </div>
        )}

        {order && !isLoading && !isError && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <OrderHeader order={order} />
              <ShippingAddressCard order={order} />
              <OrderItemsTable order={order} />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <OrderPricingSummary order={order} />
              <OrderTimeline history={(order.timeline ?? []).map(t => ({ status: t.status, changedAt: t.at }))} />
              {order.note && (
                <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                  <div className="text-[10px] uppercase tracking-widest text-white/40">Ghi chú</div>
                  <p className="mt-2 text-sm text-white/70 whitespace-pre-line">{order.note}</p>
                </div>
              )}
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="text-[10px] uppercase tracking-widest text-white/40">Hành động</div>
                <button
                  onClick={() => navigate(`/tracking/${id}`)}
                  className="mt-4 mb-2 w-full px-4 py-3 border text-xs font-bold uppercase tracking-widest transition-colors bg-white hover:bg-white/90 border-white text-black"
                >
                  Theo dõi đơn hàng
                </button>
                <button
                  disabled={!canCancel || cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate()}
                  className={`mt-4 w-full px-4 py-3 border text-xs font-bold uppercase tracking-widest transition-colors ${!canCancel || cancelMutation.isPending
                    ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/50 text-red-300'
                    }`}
                >
                  {cancelMutation.isPending ? 'Đang hủy đơn...' : 'Hủy đơn hàng'}
                </button>
                {!canCancel && (
                  <p className="mt-2 text-xs text-white/40">
                    Chỉ có thể hủy đơn khi trạng thái là <strong>Chờ xác nhận</strong>.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

