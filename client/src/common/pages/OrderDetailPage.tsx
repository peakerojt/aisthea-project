import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CancelOrderPayload,
  OrderDetail,
  OrderItem,
  OrderTimelineItem,
  orderService,
} from '@/common/services/order.service';
import { Header } from '@/store/components/Header';
import { useAuth } from '@/common/contexts/AuthContext';
import { OrderHeader } from '@/common/components/OrderHeader';
import { ShippingAddressCard } from '@/common/components/ShippingAddressCard';
import { OrderItemsTable } from '@/common/components/OrderItemsTable';
import { OrderPricingSummary } from '@/common/components/OrderPricingSummary';
import { OrderTimeline } from '@/admin/components/OrderTimeline';
import { ReviewModal } from '@/common/components/ReviewModal';
import { StatusBadge } from '@/common/components/StatusBadge';
import { RotateCcw, XCircle, ArrowLeft, PackageCheck, Loader2, MapPin, ShoppingCart } from 'lucide-react';
import { useCart } from '@/common/contexts/CartContext';
import { useToast } from '@/common/contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { normalizeStatus, ORDER_STATUS } from '@/config/orderStatus.config';
import { getOrderUiCanonicalStatus } from '@/common/utils/orderUiStatus';
import {
  shouldAutoRefreshRefundState,
} from '@/common/utils/returnRefresh';
import {
  resolveExpectedRefundEconomics,
  summarizeReturnItemEconomics,
} from '@/common/utils/returnEconomics';
import { useReturnAutoRefresh } from '@/common/hooks/useReturnAutoRefresh';
import { returnDetailReadService } from '@/common/services/return.detail-read.service';
import { returnOrderReadService } from '@/common/services/return.order-read.service';
import {
  RETURN_SUMMARY_CHANGED_EVENT,
  dispatchReturnSummaryChanged,
  type ReturnSummaryChangedDetail,
} from '@/common/events/returnSummary.events';
import { refundUi } from '@/common/styles/refundUi';
import { translateLegacyReturnCopy } from '@/common/utils/returnCopy';
import { getPaymentStatusMeta } from '@/common/utils/paymentStatus';
import { canRetryVnpayPayment, redirectToVnpayPayment } from '@/common/services/vnpay.service';

// ─── Status helpers ───────────────────────────────────────────────────────────

const canCancelStatus = (status: string | null | undefined) => {
  const normalized = normalizeStatus(status);
  return normalized === ORDER_STATUS.PENDING || normalized === ORDER_STATUS.PROCESSING;
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

type CancelReasonOption = {
  value: string;
  label: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const OrderDetailPage: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'orderDetail' });
  const { t: returnsT } = useTranslation('returns');
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const translated = t(key as any, options as any);
    return translated !== key ? translated : interpolateFallback(fallback, options);
  };
  const resolveReturnText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const translated = returnsT(key as any, { ...(options ?? {}), defaultValue: fallback } as any);
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
  const cancelAndSubmitRefundReviewLabel = resolveText(
    'actions.cancelAndRefund',
    'Hủy đơn và yêu cầu hoàn tiền',
  );
  const requestReturnLabel = resolveText('actions.requestReturn', 'Yêu cầu trả hàng');
  const retryPaymentLabel = resolveText('actions.retryPayment', 'Thanh toán lại');
  const buyAgainLabel = resolveText('actions.buyAgain', 'Mua lại');
  const confirmReceiptTitle = resolveText('confirmReceipt.title', 'Xác nhận đã nhận hàng?');
  const confirmReceiptDescription = resolveText(
    'confirmReceipt.description',
    'Bạn xác nhận đã nhận được sản phẩm nguyên vẹn và không có vấn đề gì?',
  );
  const confirmReceiptNotYetLabel = resolveText('confirmReceipt.actions.notYet', 'Chưa nhận');
  const confirmReceiptConfirmLabel = resolveText('confirmReceipt.actions.confirm', 'Đã nhận hàng');
  const cancelDialogTitle = resolveText('cancelDialog.title', 'Xác nhận hủy đơn?');
  const cancelDialogDescription = resolveText(
    'cancelDialog.description',
    'Bạn có thể chọn nhanh lý do hủy để hệ thống ghi nhận. Nếu bỏ qua, hệ thống sẽ tự tạo ghi chú mặc định.',
  );
  const cancelDialogReasonLabel = resolveText('cancelDialog.reasonLabel', 'Lý do hủy');
  const cancelDialogReasonHint = resolveText(
    'cancelDialog.reasonHint',
    'Có thể bỏ qua bước này nếu bạn chỉ muốn hủy nhanh.',
  );
  const cancelDialogOtherReasonLabel = resolveText(
    'cancelDialog.otherReasonLabel',
    'Khác',
  );
  const cancelDialogOtherReasonHint = resolveText(
    'cancelDialog.otherReasonHint',
    'Nếu cần, bạn có thể nhập lý do riêng của mình tại đây.',
  );
  const cancelDialogOtherReasonPlaceholder = resolveText(
    'cancelDialog.otherReasonPlaceholder',
    'Nhập lý do hủy của bạn',
  );
  const cancelDialogKeepOrderLabel = resolveText('cancelDialog.actions.keepOrder', 'Giữ đơn');
  const cancelDialogConfirmLabel = resolveText('cancelDialog.actions.confirm', 'Xác nhận hủy');
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
  const returnSummaryTitle = resolveText('labels.returnSummary', 'Tiến trình hoàn trả');
  const returnStatusLabel = resolveText('labels.returnStatus', 'Trạng thái trả hàng');
  const refundStatusSummaryLabel = resolveText('labels.refundStatus', 'Trạng thái hoàn tiền');
  const viewReturnDetailLabel = resolveText('actions.viewReturnDetail', 'Xem chi tiết hoàn trả');
  const refundLockedLabel = resolveReturnText(
    'detail.refundLocked',
    'Hoàn tiền đang bị khóa cho tới khi đơn hàng được xác nhận thanh toán.',
  );
  const refundLockedHintLabel = resolveReturnText(
    'detail.refundLockedHint',
    'Xác nhận đã nhận hàng ở phần hành động để mở khóa bước hoàn tiền.',
  );
  const refundUpdateLabel = resolveReturnText('detail.infoFinanceUpdate', 'Cập nhật hoàn tiền');
  const expectedRefundLabel = resolveReturnText('detail.infoExpectedRefund', 'Hoàn tiền dự kiến');
  const expectedRefundLegacyFallback = 'Theo tổng cũ: {{amount}}';
  const expectedRefundHintLabel = resolveReturnText(
    'detail.infoExpectedRefundHint',
    'Đã giới hạn theo số tiền thực trả của các sản phẩm trong yêu cầu này.',
  );
  const refundStatusFallbacks: Record<string, string> = {
    LOCKED_UNTIL_PAYMENT_CONFIRMED: 'Khóa tới khi xác nhận thanh toán',
    PENDING: 'Chờ hoàn tiền',
    PROCESSING: 'Đang hoàn tiền',
    PARTIALLY_REFUNDED: 'Hoàn tiền một phần',
    REFUNDED: 'Đã hoàn tiền',
    FAILED: 'Hoàn tiền thất bại',
    MANUAL_REVIEW: 'Cần kiểm tra thủ công',
  };
  const actionButtonBaseClassName =
    'group flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-widest transition-colors';
  const actionButtonNeutralClassName = `${actionButtonBaseClassName} border-white/10 bg-white/[0.03] text-white/76 hover:border-white/18 hover:bg-white/[0.06] hover:text-white`;
  const actionButtonSuccessClassName = `${actionButtonBaseClassName} border-emerald-400/18 bg-emerald-400/[0.08] text-emerald-100 hover:border-emerald-400/28 hover:bg-emerald-400/[0.12]`;
  const actionButtonDangerClassName = `${actionButtonBaseClassName} border-red-400/18 bg-red-400/[0.08] text-red-100 hover:border-red-400/28 hover:bg-red-400/[0.12]`;
  const actionButtonPrimaryClassName = `${actionButtonBaseClassName} border-cyan-400/18 bg-cyan-400/[0.1] text-cyan-100 hover:border-cyan-400/32 hover:bg-cyan-400/[0.14]`;
  const actionButtonWarmClassName = `${actionButtonBaseClassName} border-amber-400/18 bg-amber-400/[0.08] text-amber-100 hover:border-amber-400/30 hover:bg-amber-400/[0.12]`;

  // Review modal state
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);

  // Confirm receipt dialog state
  const [confirmReceiptDialog, setConfirmReceiptDialog] = useState(false);
  const [isConfirmReceiptVisible, setIsConfirmReceiptVisible] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelDialogVisible, setIsCancelDialogVisible] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string | null>(null);
  const [customCancelReason, setCustomCancelReason] = useState('');

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
  const numericOrderId = Number(id);
  const { data: linkedReturn, refetch: refetchLinkedReturn } = useQuery({
    queryKey: ['order-return-summary', numericOrderId],
    queryFn: () => returnOrderReadService.getForOrder(numericOrderId),
    enabled: !!order && Number.isFinite(numericOrderId) && numericOrderId > 0,
    retry: false,
  });
  const { data: linkedReturnDetail, refetch: refetchLinkedReturnDetail } = useQuery({
    queryKey: ['order-return-detail-summary', linkedReturn?.returnId],
    queryFn: () => returnDetailReadService.detail(linkedReturn!.returnId),
    enabled: !!linkedReturn?.returnId,
    retry: false,
  });
  const activeReturn = linkedReturnDetail ?? linkedReturn;
  const activeRefundStatusLabel = activeReturn?.refundStatus && activeReturn.refundStatus !== 'NOT_APPLICABLE'
    ? resolveReturnText(
        `refundStatus.${activeReturn.refundStatus}`,
        refundStatusFallbacks[activeReturn.refundStatus] ?? activeReturn.refundStatus,
      )
    : null;
  const {
    expectedRefundAmount: activeExpectedRefundAmount,
    legacyTotalRefundAmount: activeLegacyExpectedRefundAmount,
    showsRefundCapAdjustment,
  } = resolveExpectedRefundEconomics(activeReturn);
  const activeItemEconomicsSummary = summarizeReturnItemEconomics(activeReturn?.items);
  const showsReturnSnapshotBreakdown = activeItemEconomicsSummary.hasSnapshotBreakdown;
  const activeRefundUpdateMetaLabel = activeReturn?.financeNote && (activeReturn.financeNoteUpdatedAt || activeReturn.financeNoteUpdatedBy?.fullName)
    ? resolveReturnText(
        'detail.infoFinanceUpdateMeta',
        'Cập nhật {{date}} bởi {{actor}}',
        {
          date: activeReturn.financeNoteUpdatedAt
            ? new Date(activeReturn.financeNoteUpdatedAt).toLocaleString('vi-VN')
            : '—',
          actor: activeReturn.financeNoteUpdatedBy?.fullName ?? 'bộ phận hỗ trợ',
        },
      )
    : null;
  const translatedActiveFinanceNote = translateLegacyReturnCopy(activeReturn?.financeNote, resolveReturnText);

  const cancelReasonOptions = useMemo<CancelReasonOption[]>(
    () => [
      {
        value: 'CHANGED_MIND',
        label: resolveText('cancelDialog.reasons.changedMind', 'Đổi ý, không còn nhu cầu'),
      },
      {
        value: 'ORDERED_BY_MISTAKE',
        label: resolveText('cancelDialog.reasons.orderedByMistake', 'Đặt nhầm sản phẩm'),
      },
      {
        value: 'CHANGE_DELIVERY_INFO',
        label: resolveText('cancelDialog.reasons.changeDeliveryInfo', 'Muốn đổi địa chỉ / thông tin nhận hàng'),
      },
      {
        value: 'CHOOSE_OTHER_ITEM',
        label: resolveText('cancelDialog.reasons.chooseOtherItem', 'Muốn chọn sản phẩm khác'),
      },
    ],
    [resolveText],
  );
  const cancelPaymentMeta = useMemo(
    () => getPaymentStatusMeta(order?.paymentMethod, order?.paymentStatus),
    [order?.paymentMethod, order?.paymentStatus],
  );
  const selectedCancelReasonLabel =
    cancelReasonOptions.find((option) => option.value === selectedCancelReason)?.label ?? null;
  const normalizedCustomCancelReason = customCancelReason.trim();
  const effectiveCancelReasonLabel = normalizedCustomCancelReason || selectedCancelReasonLabel;
  const cancelNotePreview = useMemo(() => {
    if (effectiveCancelReasonLabel) {
      return cancelPaymentMeta.isPaidLike
        ? resolveText(
            'cancelDialog.autoNote.withReasonPaid',
            'Khách hàng hủy đơn và yêu cầu hoàn tiền trước khi xử lý. Lý do: {{reason}}.',
            { reason: effectiveCancelReasonLabel },
          )
        : resolveText(
            'cancelDialog.autoNote.withReason',
            'Khách hàng hủy đơn trước khi xử lý. Lý do: {{reason}}.',
            { reason: effectiveCancelReasonLabel },
          );
    }

    return cancelPaymentMeta.isPaidLike
      ? resolveText(
          'cancelDialog.autoNote.defaultPaid',
          'Khách hàng hủy đơn và yêu cầu hoàn tiền trước khi xử lý. Chưa chọn lý do hủy.',
        )
      : resolveText(
          'cancelDialog.autoNote.default',
        'Khách hàng hủy đơn trước khi xử lý. Chưa chọn lý do hủy.',
      );
  }, [cancelPaymentMeta.isPaidLike, effectiveCancelReasonLabel, resolveText]);

  // ── Cancel mutation ──
  const cancelMutation = useMutation({
    mutationFn: (payload: CancelOrderPayload) => orderService.cancelOrderUser(id || '', payload),
    onMutate: async (payload) => {
      if (!order) return;
      await queryClient.cancelQueries({ queryKey: ['order-detail', id] });
      const previous = queryClient.getQueryData<OrderDetail>(['order-detail', id]);
      const optimistic: OrderDetail = {
        ...order,
        status: 'cancelled',
        timeline: [
          ...order.timeline,
          { status: 'cancelled', at: new Date().toISOString(), note: payload.note ?? null },
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
      setCancelDialogOpen(false);
      setSelectedCancelReason(null);
      setCustomCancelReason('');
      queryClient.setQueryData(['order-detail', id], data);
      dispatchReturnSummaryChanged({
        orderId: Number.isFinite(numericOrderId) ? numericOrderId : undefined,
      });
      void refetchLinkedReturn();
    },
  });

  // ── Confirm receipt mutation ──
  const confirmReceiptMutation = useMutation({
    mutationFn: () => orderService.confirmReceipt(id || ''),
    onSuccess: () => {
      setConfirmReceiptDialog(false);
      showToast({ type: 'success', title: receiptSuccessLabel });
      refetch();
      void refetchLinkedReturn();
      if (linkedReturn?.returnId) {
        void refetchLinkedReturnDetail();
      }
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

  useEffect(() => {
    if (!cancelDialogOpen) {
      setIsCancelDialogVisible(false);
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => setIsCancelDialogVisible(true));
    return () => window.cancelAnimationFrame(frameId);
  }, [cancelDialogOpen]);

  useEffect(() => {
    const handleReturnSummaryChanged = (event: Event) => {
      const detail = (event as CustomEvent<ReturnSummaryChangedDetail>).detail;
      const matchesOrder =
        typeof detail?.orderId === 'number' && detail.orderId === numericOrderId;
      const matchesReturn =
        typeof detail?.returnRequestId === 'number' &&
        detail.returnRequestId > 0 &&
        detail.returnRequestId === linkedReturn?.returnId;

      if (!matchesOrder && !matchesReturn) {
        return;
      }

      void refetchLinkedReturn();
      if (linkedReturn?.returnId) {
        void refetchLinkedReturnDetail();
      }
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
  }, [linkedReturn?.returnId, numericOrderId, refetchLinkedReturn, refetchLinkedReturnDetail]);

  useReturnAutoRefresh({
    enabled: shouldAutoRefreshRefundState(activeReturn?.refundStatus),
    onRefresh: () => {
      void refetchLinkedReturn();
      if (linkedReturn?.returnId) {
        void refetchLinkedReturnDetail();
      }
    },
  });
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

  const retryPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!order?.orderId) {
        throw new Error(resolveText('errors.retryPaymentMissingOrder', 'Không tìm thấy đơn hàng để thanh toán lại.'));
      }

      await redirectToVnpayPayment(order.orderId);
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title:
          err?.response?.data?.message
          ?? err?.message
          ?? resolveText(
            'errors.retryPaymentFailed',
            'Không thể tạo lại liên kết thanh toán. Vui lòng thử lại sau.',
          ),
      });
    },
  });



  const canCancel = useMemo(() => {
    if (!order) return false;
    return canCancelStatus(order.status);
  }, [order]);
  const canRetryPayment = useMemo(
    () =>
      canRetryVnpayPayment({
        orderStatus: order?.status,
        paymentMethod: order?.paymentMethod,
        paymentStatus: order?.paymentStatus,
      }),
    [order?.paymentMethod, order?.paymentStatus, order?.status],
  );

  const cancelActionLabel = useMemo(() => {
    if (!order) return cancelOrderLabel;

    return cancelPaymentMeta.isPaidLike ? cancelAndSubmitRefundReviewLabel : cancelOrderLabel;
  }, [cancelAndSubmitRefundReviewLabel, cancelOrderLabel, cancelPaymentMeta.isPaidLike, order]);

  const handleCancelOrderRequest = () => {
    setCancelDialogOpen(true);
  };

  const handleCloseCancelDialog = () => {
    if (cancelMutation.isPending) return;
    setCancelDialogOpen(false);
    setSelectedCancelReason(null);
    setCustomCancelReason('');
  };

  const handleConfirmCancelOrder = () => {
    cancelMutation.mutate({
      reason: normalizedCustomCancelReason ? undefined : selectedCancelReason ?? undefined,
      note: cancelNotePreview,
    });
  };

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

      {cancelDialogOpen && (
        <div
          role="presentation"
          className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 transition-all duration-200 ease-out ${
            isCancelDialogVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseCancelDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
            className={`w-full max-w-lg space-y-5 rounded-2xl border border-gray-200/10 bg-[#0B0B0C] p-6 shadow-2xl shadow-black/40 transform-gpu transition-all duration-200 ease-out will-change-transform ${
              isCancelDialogVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg border border-red-500/30 bg-red-500/15 p-2 shrink-0">
                <XCircle size={20} className="text-red-300" />
              </div>
              <div>
                <h3 id="cancel-order-title" className="text-sm font-bold text-white mb-1">
                  {cancelDialogTitle}
                </h3>
                <p className="text-xs leading-relaxed text-white/60">
                  {cancelDialogDescription}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  {cancelDialogReasonLabel}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/48">
                  {cancelDialogReasonHint}
                </p>
              </div>
              <div className="grid gap-2">
                {cancelReasonOptions.map((option) => {
                  const isSelected = selectedCancelReason === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setCustomCancelReason('');
                        setSelectedCancelReason((current) =>
                          current === option.value ? null : option.value,
                        );
                      }}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                        isSelected
                          ? 'border-red-300/45 bg-red-500/12 text-white'
                          : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span>{option.label}</span>
                      <span
                        className={`h-4 w-4 rounded-full border ${
                          isSelected
                            ? 'border-red-200 bg-red-300/90'
                            : 'border-white/25 bg-transparent'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                {cancelDialogOtherReasonLabel}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-white/48">
                {cancelDialogOtherReasonHint}
              </p>
              <label htmlFor="cancel-order-other-reason" className="sr-only">
                {cancelDialogOtherReasonLabel}
              </label>
              <textarea
                id="cancel-order-other-reason"
                value={customCancelReason}
                maxLength={240}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setCustomCancelReason(nextValue);
                  if (nextValue.trim().length > 0) {
                    setSelectedCancelReason(null);
                  }
                }}
                placeholder={cancelDialogOtherReasonPlaceholder}
                className="mt-3 min-h-[104px] w-full resize-none rounded-xl border border-white/10 bg-[#121214] px-4 py-3 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-white/28 focus:border-red-300/40"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCloseCancelDialog}
                disabled={cancelMutation.isPending}
                className="flex-1 rounded-xl border border-white/15 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/60 transition-all hover:border-white/30 hover:text-white"
              >
                {cancelDialogKeepOrderLabel}
              </button>
              <button
                onClick={handleConfirmCancelOrder}
                disabled={cancelMutation.isPending}
                className="flex-1 rounded-xl border border-red-400/45 bg-red-500/20 py-2.5 text-xs font-semibold uppercase tracking-wider text-red-100 transition-all hover:border-red-300/60 hover:bg-red-500/28"
              >
                {cancelMutation.isPending ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    {processingLabel}
                  </span>
                ) : (
                  cancelDialogConfirmLabel
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
              {activeReturn && (
                <div className={`overflow-hidden ${refundUi.surface}`}>
                  <div className="border-b border-white/8 px-6 py-5">
                    <div className={refundUi.eyeBrow}>{returnSummaryTitle}</div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <StatusBadge status={activeReturn.workflowStatus ?? activeReturn.status} />
                      {activeRefundStatusLabel && (
                        <div className={refundUi.subtleBadge}>
                          {activeRefundStatusLabel}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 px-6 py-5">
                    <div className="grid gap-3">
                      <div className={`${refundUi.sectionMuted} px-4 py-4`}>
                        <div className={refundUi.eyeBrow}>{returnStatusLabel}</div>
                        <div className="mt-2 text-sm text-white/82">
                          {resolveReturnText(
                            `status.${activeReturn.workflowStatus ?? activeReturn.status}`,
                            String(activeReturn.workflowStatus ?? activeReturn.status),
                          )}
                        </div>
                      </div>

                      {activeExpectedRefundAmount > 0 && (
                        <div className={`${refundUi.success} px-4 py-4`}>
                          <div className={`${refundUi.eyeBrow} text-emerald-100/70`}>{expectedRefundLabel}</div>
                          <div className="mt-2 text-[1.35rem] font-semibold tracking-[-0.04em] text-emerald-200">
                            {activeExpectedRefundAmount.toLocaleString('vi-VN')}đ
                          </div>
                          {showsReturnSnapshotBreakdown && (
                            <>
                              <div className="mt-2 text-[11px] leading-relaxed text-emerald-100/78">
                                {resolveReturnText(
                                  'table.snapshotNetPaid',
                                  'Thực trả theo đơn gốc: {{amount}}',
                                  {
                                    amount: `${activeItemEconomicsSummary.totalNetPaidAmount.toLocaleString('vi-VN')}đ`,
                                  },
                                )}
                              </div>
                              <div className="mt-1 text-[11px] leading-relaxed text-emerald-100/68">
                                {resolveReturnText(
                                  'table.snapshotGrossDiscount',
                                  'Giá gốc {{gross}} · Giảm giá {{discount}}',
                                  {
                                    gross: `${activeItemEconomicsSummary.totalGrossAmount.toLocaleString('vi-VN')}đ`,
                                    discount: `${activeItemEconomicsSummary.totalDiscountAmount.toLocaleString('vi-VN')}đ`,
                                  },
                                )}
                              </div>
                            </>
                          )}
                          {showsRefundCapAdjustment && (
                            <>
                              <div className="mt-1 text-[11px] leading-relaxed text-emerald-100/68">
                                {resolveReturnText(
                                  'detail.infoExpectedRefundLegacy',
                                  expectedRefundLegacyFallback,
                                  {
                                    amount: `${activeLegacyExpectedRefundAmount.toLocaleString('vi-VN')}đ`,
                                  },
                                )}
                              </div>
                              <div className="mt-1 text-[11px] leading-relaxed text-amber-200/85">
                                {expectedRefundHintLabel}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {activeReturn.refundStatus === 'LOCKED_UNTIL_PAYMENT_CONFIRMED' && (
                      <div className={`${refundUi.warning} px-4 py-4 text-xs text-amber-100`}>
                        <div>{refundLockedLabel}</div>
                        <div className="mt-2 text-[11px] leading-relaxed text-amber-100/80">{refundLockedHintLabel}</div>
                      </div>
                    )}
                    {activeReturn.financeNote && (
                      <div className={`${refundUi.info} px-4 py-4 text-xs text-sky-50`}>
                        <div className={`${refundUi.eyeBrow} text-sky-100/80`}>
                          {refundUpdateLabel}
                        </div>
                        <div className="mt-2 leading-relaxed">{translatedActiveFinanceNote ?? activeReturn.financeNote}</div>
                        {activeRefundUpdateMetaLabel && (
                          <div className="mt-2 text-[10px] text-sky-100/70">
                            {activeRefundUpdateMetaLabel}
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => navigate(`/orders/${id}/return`)}
                      className="w-full rounded-lg border border-cyan-400/18 bg-cyan-400/[0.08] px-4 py-3 text-sm font-semibold text-cyan-100 transition-colors hover:border-cyan-400/28 hover:bg-cyan-400/[0.12]"
                    >
                      {viewReturnDetailLabel}
                    </button>
                  </div>
                </div>
              )}
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
                      className={actionButtonNeutralClassName}
                    >
                      <MapPin size={15} className="group-hover:scale-110 transition-transform" />
                      {trackOrderLabel}
                    </button>
                  )}

                  {/* ── Confirm Receipt Button ── */}
                  {canConfirmReceipt && (
                    <button
                      onClick={() => setConfirmReceiptDialog(true)}
                      className={actionButtonSuccessClassName}
                    >
                      <PackageCheck size={15} className="group-hover:scale-110 transition-transform" />
                      {confirmReceivedLabel}
                    </button>
                  )}

                  {/* ── Cancel Button ── */}
                  {canCancel && (
                    <button
                      disabled={cancelMutation.isPending}
                      onClick={handleCancelOrderRequest}
                      className={`${actionButtonBaseClassName} ${cancelMutation.isPending
                        ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
                        : actionButtonDangerClassName
                        }`}
                    >
                      <XCircle
                        size={15}
                        className={cancelMutation.isPending ? 'opacity-50' : 'group-hover:scale-110 transition-transform'}
                      />
                      {cancelMutation.isPending ? processingLabel : cancelActionLabel}
                    </button>
                  )}

                  {canRetryPayment && (
                    <button
                      disabled={retryPaymentMutation.isPending}
                      onClick={() => retryPaymentMutation.mutate()}
                      className={`${actionButtonBaseClassName} ${
                        retryPaymentMutation.isPending
                          ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
                          : actionButtonPrimaryClassName
                      }`}
                    >
                      {retryPaymentMutation.isPending ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 size={13} className="animate-spin" />
                          {processingLabel}
                        </span>
                      ) : (
                        <>
                          <MapPin size={15} className="group-hover:scale-110 transition-transform" />
                          {retryPaymentLabel}
                        </>
                      )}
                    </button>
                  )}

                  {/* ── Return Button ── */}
                  {!activeReturn && canReturn && (
                    <button
                      onClick={() => {
                        const returnPath = `/orders/${id}/return`;
                        if (typeof window !== 'undefined' && window.history?.pushState) {
                          window.history.pushState({}, '', returnPath);
                        }
                        navigate(returnPath);
                      }}
                      className={actionButtonPrimaryClassName}
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
                        className={`${actionButtonBaseClassName} ${buyAgainMutation.isPending
                          ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
                          : actionButtonWarmClassName
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


