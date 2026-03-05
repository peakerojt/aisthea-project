import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelOrder,
  confirmReceipt,
  fetchOrderDetail,
  OrderDetail,
  OrderItem,
  OrderTimelineItem,
} from '../services/orderApi';
import { ApiError } from '../services/httpClient';
import { StoreHeader } from '../components/StoreHeader';
import { useAuth } from '../contexts/AuthContext';
import { OrderHeader } from '../components/order/OrderHeader';
import { ShippingAddressCard } from '../components/order/ShippingAddressCard';
import { OrderItemsTable } from '../components/order/OrderItemsTable';
import { OrderPricingSummary } from '../components/order/OrderPricingSummary';
import { OrderTimeline } from '../components/order/OrderTimeline';
import { ReviewModal } from '../components/review/ReviewModal';
import { RotateCcw, XCircle, ArrowLeft, PackageCheck, Loader2, MapPin, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

// ─── Status helpers ───────────────────────────────────────────────────────────

const canCancelStatus = (status: string | null | undefined) => {
  const s = (status || '').toLowerCase();
  return s === 'pending';
};

const canReturnStatus = (
  status: string | null | undefined,
  timeline: OrderTimelineItem[] | undefined
) => {
  const s = (status || '').toLowerCase();

  if (s !== 'delivered') return false;

  const deliveredEvent = timeline?.find((t) => t.status.toLowerCase() === 'delivered' || t.status.toLowerCase() === 'giaothanhcong');
  if (!deliveredEvent) return false;

  const deliveredDate = new Date(deliveredEvent.at);
  const now = new Date();
  const diffDays = (now.getTime() - deliveredDate.getTime()) / (1000 * 3600 * 24);
  return diffDays <= 7;
};

const canConfirmReceiptStatus = (status: string | null | undefined) => {
  return (status || '').toLowerCase() === 'shipping';
};

const canTrackOrderStatus = (status: string | null | undefined) => {
  const s = (status || '').toLowerCase();
  return ['confirmed', 'shipping', 'delivered'].includes(s);
};

// ─── Component ────────────────────────────────────────────────────────────────

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { addItem: addItemToCart, fetchCart: refetchCart } = useCart();

  // Review modal state
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);

  // Confirm receipt dialog state
  const [confirmReceiptDialog, setConfirmReceiptDialog] = useState(false);
  const [receiptToastMsg, setReceiptToastMsg] = useState('');
  const [buyAgainToastMsg, setBuyAgainToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // ── Cancel mutation ──
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
          { status: 'cancelled', at: new Date().toISOString() },
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

  // ── Confirm receipt mutation ──
  const confirmReceiptMutation = useMutation({
    mutationFn: () => confirmReceipt(id || ''),
    onSuccess: () => {
      setConfirmReceiptDialog(false);
      setReceiptToastMsg('Cảm ơn bạn đã mua sắm! Vui lòng đánh giá sản phẩm nhé. 🎉');
      refetch();
      setTimeout(() => setReceiptToastMsg(''), 4000);
    },
    onError: () => {
      setConfirmReceiptDialog(false);
    },
  });
  // ── Buy Again mutation ──
  // Adds all items from a past order back into cart via CartContext
  // so that CartContext.dbItems stays in sync before navigating to Checkout.
  const buyAgainMutation = useMutation({
    mutationFn: async () => {
      if (!order?.items?.length) throw new Error('No items');
      // Filter only items that have a known variantId.
      const itemsWithVariant = order.items.filter((it) => it.variantId);
      if (itemsWithVariant.length === 0)
        throw new Error('Không thể xác định sản phẩm để thêm vào giỏ.');
      // Add items sequentially via CartContext to avoid race conditions on dbItems state.
      for (const it of itemsWithVariant) {
        await addItemToCart(it.variantId!, it.quantity);
      }
      // Ensure cart is fully synced from server before navigating.
      await refetchCart();
    },
    onSuccess: () => {
      const count = order?.items?.filter((it) => it.variantId).length ?? 0;
      setBuyAgainToastMsg({
        type: 'success',
        text: `Đã thêm ${count} sản phẩm vào giỏ hàng! 🛒 Đang chuyển tới thanh toán...`,
      });
      // Short delay so user sees the toast, then navigate to Checkout.
      setTimeout(() => {
        setBuyAgainToastMsg(null);
        navigate('/', { state: { initialView: 'STORE_CHECKOUT' } });
      }, 900);
    },
    onError: (err: any) => {
      setBuyAgainToastMsg({
        type: 'error',
        text: err?.response?.data?.message ?? err?.message ?? 'Không thể thêm vào giỏ hàng.',
      });
      setTimeout(() => setBuyAgainToastMsg(null), 5000);
    },
  });



  const canCancel = useMemo(() => {
    if (!order) return false;
    return canCancelStatus(order.status);
  }, [order]);

  const canReturn = useMemo(() => {
    if (!order) return false;
    return canReturnStatus(order.status, order.timeline);
  }, [order]);

  const canConfirmReceipt = useMemo(() => {
    if (!order) return false;
    return canConfirmReceiptStatus(order.status);
  }, [order]);

  const canTrack = useMemo(() => {
    if (!order) return false;
    return canTrackOrderStatus(order.status);
  }, [order]);

  // ── Guest guard ──
  const structuredError = error as ApiError | null;

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

  const isNotFound = structuredError?.status === 404 || structuredError?.code === 'NOT_FOUND';
  const isForbidden = structuredError?.status === 403 || structuredError?.code === 'FORBIDDEN';

  return (
    <div className="bg-bg-dark min-h-screen text-white font-sans">
      <StoreHeader setView={() => navigate('/')} setCategory={() => undefined} />

      {/* Toast notification — confirm receipt */}
      {receiptToastMsg && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-medium shadow-[0_0_30px_rgba(16,185,129,0.2)] backdrop-blur-sm"
          style={{ transition: 'opacity 0.3s ease' }}
        >
          {receiptToastMsg}
        </div>
      )}

      {/* Toast notification — buy again */}
      {buyAgainToastMsg && (
        <div
          className={`fixed bottom-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium backdrop-blur-sm ${buyAgainToastMsg.type === 'success'
            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
            : 'bg-red-500/20 border border-red-500/40 text-red-300'
            }`}
          style={{ transition: 'opacity 0.3s ease' }}
        >
          {buyAgainToastMsg.text}
        </div>
      )}

      {/* Confirm Receipt AlertDialog */}
      {confirmReceiptDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 p-6 space-y-5"
            style={{
              background: 'linear-gradient(135deg, rgba(15,15,25,0.98) 0%, rgba(20,20,35,0.98) 100%)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 shrink-0">
                <PackageCheck size={20} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Xác nhận đã nhận hàng?</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Bạn xác nhận đã nhận được sản phẩm nguyên vẹn và không có vấn đề gì?
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReceiptDialog(false)}
                disabled={confirmReceiptMutation.isPending}
                className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-xs font-semibold uppercase tracking-wider transition-all"
              >
                Chưa nhận
              </button>
              <button
                onClick={() => confirmReceiptMutation.mutate()}
                disabled={confirmReceiptMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 hover:border-emerald-500/60 text-emerald-300 hover:text-emerald-200 text-xs font-semibold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.1)]"
              >
                {confirmReceiptMutation.isPending ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    Đang xử lý...
                  </span>
                ) : (
                  'Đã nhận hàng'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        open={!!reviewItem}
        onClose={() => setReviewItem(null)}
        item={reviewItem}
        orderId={id || ''}
      />

      <div className="pt-32 px-6 md:px-12 max-w-6xl mx-auto pb-24">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Chi tiết đơn hàng</h1>
            <p className="text-white/40 text-xs uppercase tracking-widest mt-2">
              Tất cả thông tin đơn hàng của bạn ở một nơi
            </p>
          </div>
          <button
            onClick={() => navigate('/', { replace: true, state: { initialView: 'STORE_MY_ORDERS' } })}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium text-white/80 hover:text-white backdrop-blur-md"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
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
                  Bạn không thể xem chi tiết đơn hàng này.
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
              <OrderItemsTable
                order={order}
                onReview={(item) => setReviewItem(item)}
                onProductClick={(productId) => {
                  navigate(`/?productId=${productId}`);
                  window.scrollTo(0, 0);
                }}
              />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <OrderPricingSummary order={order} />
              <OrderTimeline history={(order.timeline ?? []).map((t) => ({ status: t.status, changedAt: t.at }))} />
              {order.note && (
                <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                  <div className="text-[10px] uppercase tracking-widest text-white/40">Ghi chú</div>
                  <p className="mt-2 text-sm text-white/70 whitespace-pre-line">{order.note}</p>
                </div>
              )}
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="text-[10px] uppercase tracking-widest text-white/40">Hành động</div>
                <div className="flex flex-col gap-3 mt-4">

                  {/* ── Track Order Button (from feature/order-tracking-PhamAnhHao) ── */}
                  {canTrack && (
                    <button
                      onClick={() => navigate(`/tracking/${id}`)}
                      className="group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                    >
                      <MapPin size={15} className="group-hover:scale-110 transition-transform" />
                      Theo dõi đơn hàng
                    </button>
                  )}

                  {/* ── Confirm Receipt Button ── */}
                  {canConfirmReceipt && (
                    <button
                      onClick={() => setConfirmReceiptDialog(true)}
                      className="group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                    >
                      <PackageCheck size={15} className="group-hover:scale-110 transition-transform" />
                      Đã nhận được hàng
                    </button>
                  )}

                  {/* ── Cancel Button ── */}
                  {canCancel && (
                    <button
                      disabled={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate()}
                      className={`group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${cancelMutation.isPending
                        ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                        : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                        }`}
                    >
                      <XCircle
                        size={15}
                        className={cancelMutation.isPending ? 'opacity-50' : 'group-hover:scale-110 transition-transform'}
                      />
                      {cancelMutation.isPending ? 'Đang xử lý...' : 'Hủy đơn hàng'}
                    </button>
                  )}

                  {/* ── Return Button ── */}
                  {canReturn && (
                    <button
                      onClick={() => navigate(`/orders/${id}/return`)}
                      className="group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 hover:text-violet-300 border-violet-500/30 hover:border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.1)] hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                    >
                      <RotateCcw size={15} className="group-hover:-rotate-45 transition-transform" />
                      Yêu cầu trả hàng
                    </button>
                  )}

                  {/* ── Mua Lại (Buy Again) Button ── */}
                  {/* Shown for delivered/cancelled/returned orders so customer can re-purchase */}
                  {['delivered', 'cancelled', 'canceled', 'returned'].includes(
                    (order.status || '').toLowerCase(),
                  ) && (
                      <button
                        onClick={() => buyAgainMutation.mutate()}
                        disabled={buyAgainMutation.isPending}
                        className={`group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${buyAgainMutation.isPending
                          ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                          : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 hover:border-amber-500/60 text-amber-400 hover:text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                          }`}
                      >
                        {buyAgainMutation.isPending ? (
                          <span className="flex items-center gap-1.5">
                            <Loader2 size={13} className="animate-spin" />
                            Đang thêm vào giỏ...
                          </span>
                        ) : (
                          <>
                            <ShoppingCart size={15} className="group-hover:scale-110 transition-transform" />
                            Mua Lại
                          </>
                        )}
                      </button>
                    )}

                </div>

                {/* Empty state hint */}
                {!canTrack && !canConfirmReceipt && !canCancel && !canReturn && (
                  <div className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      Chỉ có thể hủy đơn khi <strong className="text-white/60">Chờ xác nhận</strong>, theo dõi/xác nhận nhận hàng khi{' '}
                      <strong className="text-white/60">Đang giao</strong>, hoặc hoàn đơn trong 7 ngày sau khi{' '}
                      <strong className="text-white/60">Giao thành công</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
