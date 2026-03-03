import React, { useMemo, useState, useEffect } from 'react';
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
import { returnService, OrderReturn } from '../services/return.service';

const canCancelStatus = (status: string | null | undefined) => {
  const s = (status || '').toLowerCase();
  return s === 'pending';
};

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  // Return state
  const [orderReturn, setOrderReturn] = useState<OrderReturn | null>(null);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnToast, setReturnToast] = useState<string | null>(null);

  useEffect(() => { if (returnToast) { const t = setTimeout(() => setReturnToast(null), 4000); return () => clearTimeout(t); } }, [returnToast]);

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

  // Fetch return info when order loads
  useEffect(() => {
    if (!id) return;
    returnService.getForOrder(Number(id))
      .then(r => setOrderReturn(r))
      .catch(() => setOrderReturn(null));
  }, [id, order?.status]);

  const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const canRequestReturn = useMemo(() => {
    if (!order || orderReturn) return false;
    const s = (order.status || '').toLowerCase();
    if (s !== 'delivered') return false;
    // Use last timeline entry as delivery date
    const lastEntry = order.timeline?.[order.timeline.length - 1];
    const deliveryDate = new Date(lastEntry?.at ?? order.createdAt ?? Date.now());
    return Date.now() - deliveryDate.getTime() <= RETURN_WINDOW_MS;
  }, [order, orderReturn]);

  const returnStatusLabel = (s: string) => {
    if (s === 'PENDING_APPROVAL') return 'Chờ duyệt';
    if (s === 'APPROVED') return 'Đã chấp nhận';
    if (s === 'REJECTED') return 'Đã từ chối — ' + (orderReturn?.adminNote || '');
    if (s === 'COMPLETED') return 'Hoàn tiền xong';
    return s;
  };

  const handleSubmitReturn = async () => {
    if (!returnReason.trim()) return;
    setReturnSubmitting(true);
    try {
      await returnService.request(Number(id), returnReason.trim(), []);
      setReturnToast('Đã gửi yêu cầu trả hàng. Vui lòng chờ phản hồi từ shop.');
      setShowReturnDialog(false);
      setReturnReason('');
      // Re-fetch return info
      returnService.getForOrder(Number(id)).then(r => setOrderReturn(r)).catch(() => { });
    } catch (e: any) {
      setReturnToast('Lỗi: ' + (e?.message || 'Không thể gửi yêu cầu.'));
    } finally {
      setReturnSubmitting(false);
    }
  };

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
              <OrderTimeline history={(order.timeline || []).map(t => ({ status: t.status, changedAt: t.at }))} />
              {order.note && (
                <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                  <div className="text-[10px] uppercase tracking-widest text-white/40">Ghi chú</div>
                  <p className="mt-2 text-sm text-white/70 whitespace-pre-line">{order.note}</p>
                </div>
              )}
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="text-[10px] uppercase tracking-widest text-white/40">Hành động</div>

                {/* Active return banner */}
                {orderReturn && (
                  <div className={`mt-4 p-3 rounded border text-xs ${orderReturn.status === 'REJECTED' ? 'border-red-500/30 bg-red-500/10 text-red-200' :
                      orderReturn.status === 'COMPLETED' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' :
                        'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    }`}>
                    <span className="font-bold uppercase tracking-widest">Hoàn trả: </span>
                    {returnStatusLabel(orderReturn.status)}
                  </div>
                )}

                <button
                  disabled={!canCancelStatus(order.status) || cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate()}
                  className={`mt-4 w-full px-4 py-3 border text-xs font-bold uppercase tracking-widest transition-colors ${!canCancelStatus(order.status) || cancelMutation.isPending
                      ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                      : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/50 text-red-300'
                    }`}
                >
                  {cancelMutation.isPending ? 'Đang hủy đơn...' : 'Hủy đơn hàng'}
                </button>
                {!canCancelStatus(order.status) && (
                  <p className="mt-2 text-xs text-white/40">
                    Chỉ có thể hủy đơn khi trạng thái là <strong>Chờ xác nhận</strong>.
                  </p>
                )}

                {/* Return CTA */}
                {canRequestReturn && (
                  <button
                    onClick={() => setShowReturnDialog(true)}
                    className="mt-3 w-full px-4 py-3 border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Yêu cầu trả hàng / Hoàn tiền
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Return Request Dialog */}
      {showReturnDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowReturnDialog(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-sm shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-black uppercase tracking-tighter text-white mb-1">Yêu cầu trả hàng</h2>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-6">Điền lý do để hoàn tất yêu cầu</p>
            <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2">Lý do trả hàng <span className="text-orange-400">*</span></label>
            <textarea
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Mô tả lý do bạn muốn trả hàng..."
              className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded focus:outline-none focus:border-orange-500/50 transition-colors placeholder-white/20 resize-none"
            />
            <div className="text-xs text-white/30 text-right mt-1">{returnReason.length}/500</div>
            {returnToast && <div className="mt-3 p-3 border border-red-500/20 bg-red-500/10 text-red-200 text-sm rounded">{returnToast}</div>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowReturnDialog(false)} className="flex-1 px-4 py-3 border border-white/10 text-white/60 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer">
                Hủy
              </button>
              <button
                onClick={handleSubmitReturn}
                disabled={returnSubmitting || !returnReason.trim()}
                className="flex-1 px-4 py-3 border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {returnSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {returnToast && !showReturnDialog && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[500] w-full max-w-md px-4">
          <div className="p-4 rounded-lg shadow-2xl border bg-emerald-500/90 border-emerald-400 text-white flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <p className="text-sm font-medium flex-1">{returnToast}</p>
          </div>
        </div>
      )}
    </div>
  );
};

