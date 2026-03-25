import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrderDetail, OrderItem, OrderTimelineItem, orderService } from '@/common/services/order.service';;
import { Header } from '@/store/components/Header';
import { useAuth } from '@/common/contexts/AuthContext';
import { OrderHeader } from '@/common/components/OrderHeader';
import { ShippingAddressCard } from '@/common/components/ShippingAddressCard';
import { OrderItemsTable } from '@/common/components/OrderItemsTable';
import { OrderPricingSummary } from '@/common/components/OrderPricingSummary';
import { OrderTimeline } from '@/admin/components/OrderTimeline';
import { ReviewModal } from '@/common/components/ReviewModal';
import { RotateCcw, XCircle, ArrowLeft, PackageCheck, Loader2, MapPin, ShoppingCart } from 'lucide-react';
import { useCart } from '@/common/contexts/CartContext';
import { useToast } from '@/common/contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { normalizeStatus, ORDER_STATUS } from '@/config/orderStatus.config';
import { getOrderUiCanonicalStatus } from '@/common/utils/orderUiStatus';

// ─── Status helpers ───────────────────────────────────────────────────────────

const canCancelStatus = (status: string | null | undefined) => {
  return normalizeStatus(status) === ORDER_STATUS.PENDING;
};

const canReturnStatus = (
  status: string | null | undefined,
  timeline: OrderTimelineItem[] | undefined
) => {
  if (normalizeStatus(status) !== ORDER_STATUS.DELIVERED) return false;

  const deliveredEvent = timeline?.find((t) => normalizeStatus(t.status) === ORDER_STATUS.DELIVERED);
  if (!deliveredEvent) return false;

  const deliveredDate = new Date(deliveredEvent.at);
  const now = new Date();
  const diffDays = (now.getTime() - deliveredDate.getTime()) / (1000 * 3600 * 24);
  return diffDays <= 30;
};

const canConfirmReceiptStatus = (status: string | null | undefined) => {
  return normalizeStatus(status) === ORDER_STATUS.SHIPPING;
};

const canTrackOrderStatus = (status: string | null | undefined) => {
  const canonicalStatus = getOrderUiCanonicalStatus(status);
  if (canonicalStatus === 'RETURN_REQUESTED') {
    return true;
  }

  return (
    canonicalStatus === ORDER_STATUS.PROCESSING ||
    canonicalStatus === ORDER_STATUS.SHIPPING ||
    canonicalStatus === ORDER_STATUS.DELIVERED ||
    canonicalStatus === ORDER_STATUS.RETURNED
  );
};

const normalizeOrderActionStatus = (status: string | null | undefined) => {
  const canonicalStatus = getOrderUiCanonicalStatus(status);
  return canonicalStatus === 'RETURN_REQUESTED' ? null : canonicalStatus;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const OrderDetailPage: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'orderDetail' });
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const translated = t(key as any, options as any);
    return translated !== key ? translated : interpolateFallback(fallback, options);
  };
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { addItemsBatch } = useCart();
  const { showToast } = useToast();
  const heroTitle = resolveText('hero.title', 'Chi tiết đơn hàng');
  const heroSubtitle = resolveText('hero.subtitle', 'Tất cả thông tin đơn hàng của bạn ở một nơi');
  const guestMessage = resolveText('guest.message', 'Vui lòng đăng nhập để xem chi tiết đơn hàng.');
  const guestLoginLabel = resolveText('guest.login', 'Đăng nhập');
  const processingLabel = resolveText('common.processing', 'Đang xử lý...');
  const addingToCartLabel = resolveText('common.addingToCart', 'Đang thêm vào giỏ...');
  const noteLabel = resolveText('labels.note', 'Ghi chú');
  const actionsLabel = resolveText('labels.actions', 'Hành động');
  const backLabel = resolveText('actions.back', 'Quay lại');
  const goHomeLabel = resolveText('actions.goHome', 'Về trang chủ');
  const retryLabel = resolveText('actions.retry', 'Thử lại');
  const trackOrderLabel = resolveText('actions.trackOrder', 'Theo dõi đơn hàng');
  const confirmReceivedLabel = resolveText('actions.confirmReceived', 'Đã nhận được hàng');
  const cancelOrderLabel = resolveText('actions.cancelOrder', 'Hủy đơn hàng');
  const requestReturnLabel = resolveText('actions.requestReturn', 'Yêu cầu trả hàng');
  const buyAgainLabel = resolveText('actions.buyAgain', 'Mua lại');
  const confirmReceiptTitle = resolveText('confirmReceipt.title', 'Xác nhận đã nhận hàng?');
  const confirmReceiptDescription = resolveText(
    'confirmReceipt.description',
    'Bạn xác nhận đã nhận được sản phẩm nguyên vẹn và không có vấn đề gì?',
  );
  const confirmReceiptNotYetLabel = resolveText('confirmReceipt.actions.notYet', 'Chưa nhận');
  const confirmReceiptConfirmLabel = resolveText('confirmReceipt.actions.confirm', 'Đã nhận hàng');
  const receiptSuccessLabel = resolveText(
    'toast.receiptSuccess',
    'Cảm ơn bạn đã mua sắm! Vui lòng đánh giá sản phẩm nhé.',
  );
  const notFoundTitle = resolveText('errors.notFoundTitle', 'Đơn hàng không tồn tại');
  const notFoundDescription = resolveText(
    'errors.notFoundDescription',
    'Có thể mã đơn hàng bị sai hoặc đơn hàng đã bị xóa.',
  );
  const forbiddenTitle = resolveText('errors.forbiddenTitle', 'Không có quyền truy cập');
  const forbiddenDescription = resolveText(
    'errors.forbiddenDescription',
    'Bạn không thể xem chi tiết đơn hàng này.',
  );
  const loadFailedLabel = resolveText('errors.loadFailed', 'Không thể tải chi tiết đơn hàng.');
  const noItemsLabel = resolveText('errors.noItems', 'Không có sản phẩm trong đơn để mua lại.');
  const cannotIdentifyItemsLabel = resolveText(
    'errors.cannotIdentifyItems',
    'Không thể xác định sản phẩm để thêm vào giỏ.',
  );
  const buyAgainFailedLabel = resolveText('errors.buyAgainFailed', 'Không thể thêm vào giỏ hàng.');
  const hintPrefix = resolveText('hint.prefix', 'Chỉ có thể hủy đơn khi');
  const hintPending = resolveText('hint.pending', 'chờ xác nhận');
  const hintMiddle = resolveText('hint.middle', 'theo dõi/xác nhận nhận hàng khi');
  const hintShipping = resolveText('hint.shipping', 'đang giao hàng');
  const hintSuffix = resolveText('hint.suffix', 'hoặc hoàn đơn trong 7 ngày sau khi');
  const hintDelivered = resolveText('hint.delivered', 'đã giao hàng');

  // Review modal state
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);

  // Confirm receipt dialog state
  const [confirmReceiptDialog, setConfirmReceiptDialog] = useState(false);
  const [isConfirmReceiptVisible, setIsConfirmReceiptVisible] = useState(false);

  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: () => orderService.fetchOrderDetail(id || ''),
    enabled: !!id && role !== 'guest',
    retry: false,
  });

  // ── Cancel mutation ──
  const cancelMutation = useMutation({
    mutationFn: () => orderService.cancelOrderUser(id || ''),
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
    mutationFn: () => orderService.confirmReceipt(id || ''),
    onSuccess: () => {
      setConfirmReceiptDialog(false);
      showToast({ type: 'success', title: receiptSuccessLabel });
      refetch();
    },
    onError: () => {
      setConfirmReceiptDialog(false);
    },
  });

  useEffect(() => {
    if (!confirmReceiptDialog) {
      setIsConfirmReceiptVisible(false);
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => setIsConfirmReceiptVisible(true));
    return () => window.cancelAnimationFrame(frameId);
  }, [confirmReceiptDialog]);
  // ── Buy Again mutation ──
  // Adds all items from a past order back into cart via CartContext
  // so that CartContext.dbItems stays in sync before navigating to Checkout.
  const buyAgainMutation = useMutation({
    mutationFn: async () => {
      if (!order?.items?.length) throw new Error(noItemsLabel);
      // Filter only items that have a known variantId.
      const itemsWithVariant = order.items.filter((it) => it.variantId);
      if (itemsWithVariant.length === 0)
        throw new Error(cannotIdentifyItemsLabel);

      await addItemsBatch(
        itemsWithVariant.map((item) => ({
          variantId: item.variantId!,
          quantity: item.quantity,
        })),
      );
    },
    onSuccess: () => {
      const count = order?.items?.filter((it) => it.variantId).length ?? 0;
      showToast({
        type: 'success',
        title: resolveText(
          'toast.buyAgainSuccess',
          `Đã thêm ${count} sản phẩm vào giỏ hàng! Đang chuyển tới trang thanh toán...`,
          { count },
        ),
      });
      setTimeout(() => {
        navigate('/checkout');
      }, 900);
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: err?.response?.data?.message ?? err?.message ?? buyAgainFailedLabel,
      });
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

  const canBuyAgain = useMemo(() => {
    if (!order) return false;
    const normalizedStatus = normalizeOrderActionStatus(order.status);
    return (
      normalizedStatus === ORDER_STATUS.DELIVERED ||
      normalizedStatus === ORDER_STATUS.CANCELLED ||
      normalizedStatus === ORDER_STATUS.RETURNED
    );
  }, [order]);

  // ── Guest guard ──
  const statusCode = (error as any)?.status ?? (error as any)?.response?.status;
  const errorCode = (error as any)?.code ?? (error as any)?.response?.data?.code;
  const rawMessage =
    (error as any)?.message ??
    (error as any)?.response?.data?.message ??
    (error instanceof Error ? error.message : typeof error === 'string' ? error : '');
  const errorMessage = typeof rawMessage === 'string' ? rawMessage : '';

  if (role === 'guest') {
    return (
      <div className="bg-bg-dark min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-white/60 mb-4">{guestMessage}</p>
          <button
            onClick={() => navigate('/auth/login')}
            className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
          >
            {guestLoginLabel}
          </button>
        </div>
      </div>
    );
  }

  const lowerMsg = errorMessage.toLowerCase();
  const isNotFound =
    statusCode === 404 ||
    errorCode === 'NOT_FOUND' ||
    lowerMsg.includes('404') ||
    lowerMsg.includes('not_found') ||
    lowerMsg.includes('không tồn tại') ||
    lowerMsg.includes('not found');
  const isForbidden =
    statusCode === 403 ||
    errorCode === 'FORBIDDEN' ||
    lowerMsg.includes('403') ||
    lowerMsg.includes('forbidden') ||
    lowerMsg.includes('banned');

  return (
    <div className="bg-bg-dark min-h-screen text-white font-sans">
      <Header />

      {/* Confirm Receipt AlertDialog */}
      {confirmReceiptDialog && (
        <div
          role="presentation"
          className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 transition-all duration-200 ease-out ${
            isConfirmReceiptVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmReceiptDialog(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-receipt-title"
            className={`w-full max-w-sm space-y-5 rounded-2xl border border-gray-200/10 bg-[#0B0B0C] p-6 shadow-2xl shadow-black/40 transform-gpu transition-all duration-200 ease-out will-change-transform ${
              isConfirmReceiptVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 shrink-0">
                <PackageCheck size={20} className="text-emerald-400" />
              </div>
              <div>
                <h3 id="confirm-receipt-title" className="text-sm font-bold text-white mb-1">{confirmReceiptTitle}</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  {confirmReceiptDescription}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReceiptDialog(false)}
                disabled={confirmReceiptMutation.isPending}
                className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-xs font-semibold uppercase tracking-wider transition-all"
              >
                {confirmReceiptNotYetLabel}
              </button>
              <button
                onClick={() => confirmReceiptMutation.mutate()}
                disabled={confirmReceiptMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 hover:border-emerald-500/60 text-emerald-300 hover:text-emerald-200 text-xs font-semibold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.1)]"
              >
                {confirmReceiptMutation.isPending ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    {processingLabel}
                  </span>
                ) : (
                  confirmReceiptConfirmLabel
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
            <h1 className="text-4xl font-black uppercase tracking-tighter">{heroTitle}</h1>
            <p className="text-white/40 text-xs uppercase tracking-widest mt-2">
              {heroSubtitle}
            </p>
          </div>
          <button
            onClick={() => navigate('/my-orders')}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium text-white/80 hover:text-white backdrop-blur-md"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {backLabel}
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
                <h2 className="text-lg font-semibold text-white mb-2">{notFoundTitle}</h2>
                <p className="text-sm text-white/60 mb-4">
                  {notFoundDescription}
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  {goHomeLabel}
                </button>
              </div>
            ) : isForbidden ? (
              <div className="bg-surface-dark border border-red-500/30 rounded-sm p-6 text-center">
                <h2 className="text-lg font-semibold text-red-300 mb-2">{forbiddenTitle}</h2>
                <p className="text-sm text-red-200/80 mb-4">
                  {forbiddenDescription}
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  {goHomeLabel}
                </button>
              </div>
            ) : (
              <div className="bg-surface-dark border border-red-500/20 rounded-sm p-6">
                <p className="text-sm text-red-200 mb-4">
                  {loadFailedLabel} {errorMessage}
                </p>
                <button
                  onClick={() => refetch()}
                  className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  {retryLabel}
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
                  navigate(`/product/${productId}`);
                  window.scrollTo(0, 0);
                }}
              />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <OrderPricingSummary order={order} />
              <OrderTimeline history={(order.timeline ?? []).map((t) => ({ status: t.status, changedAt: t.at }))} />
              {order.note && (
                <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                  <div className="text-[10px] uppercase tracking-widest text-white/40">{noteLabel}</div>
                  <p className="mt-2 text-sm text-white/70 whitespace-pre-line">{order.note}</p>
                </div>
              )}
              <div className="bg-surface-dark border border-white/5 rounded-sm p-6">
                <div className="text-[10px] uppercase tracking-widest text-white/40">{actionsLabel}</div>
                <div className="flex flex-col gap-3 mt-4">

                  {/* ── Track Order Button (from feature/order-tracking-PhamAnhHao) ── */}
                  {canTrack && (
                    <button
                      onClick={() => navigate(`/tracking/${id}`)}
                      className="group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                    >
                      <MapPin size={15} className="group-hover:scale-110 transition-transform" />
                      {trackOrderLabel}
                    </button>
                  )}

                  {/* ── Confirm Receipt Button ── */}
                  {canConfirmReceipt && (
                    <button
                      onClick={() => setConfirmReceiptDialog(true)}
                      className="group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                    >
                      <PackageCheck size={15} className="group-hover:scale-110 transition-transform" />
                      {confirmReceivedLabel}
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
                      {cancelMutation.isPending ? processingLabel : cancelOrderLabel}
                    </button>
                  )}

                  {/* ── Return Button ── */}
                  {canReturn && (
                    <button
                      onClick={() => {
                        const returnPath = `/orders/${id}/return`;
                        if (typeof window !== 'undefined' && window.history?.pushState) {
                          window.history.pushState({}, '', returnPath);
                        }
                        navigate(returnPath);
                      }}
                      className="group w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 hover:text-cyan-300 border-cyan-500/30 hover:border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                    >
                      <RotateCcw size={15} className="group-hover:-rotate-45 transition-transform" />
                      {requestReturnLabel}
                    </button>
                  )}

                  {/* ── Mua Lại (Buy Again) Button ── */}
                  {/* Shown for delivered/cancelled/returned orders so customer can re-purchase */}
                  {canBuyAgain && (
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
                            {addingToCartLabel}
                          </span>
                        ) : (
                          <>
                            <ShoppingCart size={15} className="group-hover:scale-110 transition-transform" />
                            {buyAgainLabel}
                          </>
                        )}
                      </button>
                    )}

                </div>

                {/* Empty state hint */}
                {!canTrack && !canConfirmReceipt && !canCancel && !canReturn && (
                  <div className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      {hintPrefix} <strong className="text-white/60">{hintPending}</strong>, {hintMiddle}{' '}
                      <strong className="text-white/60">{hintShipping}</strong>, {hintSuffix}{' '}
                      <strong className="text-white/60">{hintDelivered}</strong>.
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


