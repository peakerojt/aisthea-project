import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search, Package, ChevronLeft, ChevronRight, Eye,
  AlertCircle, FilterX, Calendar, Copy, RefreshCw, Download, CheckCircle2, Truck, Box, Ban, X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminOrderService, AdminOrder } from '@/common/services/order.service';
import { useToast } from '@/common/contexts/ToastContext';
import { ORDER_STATUS, getValidNextStatuses, normalizeStatus, type OrderStatusValue } from '@/config/orderStatus.config';
import { getPaymentMethodMeta, getPaymentStatusMeta } from '@/common/utils/paymentStatus';
import { getOrderStatusDisplayMeta } from '@/common/utils/orderUiStatus';
import { formatCurrencyFullVND } from '@/common/utils/currency';
import {
  AdminActionButton,
  AdminBadge,
  AdminEmptyState,
  AdminModalShell,
  AdminPageShell,
  AdminPrimaryButton,
  AdminSectionCard,
  AdminSecondaryButton,
  adminUiTokens,
} from '@/admin/components/AdminUI';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
type StatusTabKey = 'ALL' | 'Pending' | 'Processing' | 'Shipping' | 'Delivered' | 'Cancelled';
type OrderSortValue =
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'totalAmount_desc'
  | 'totalAmount_asc'
  | 'status_asc'
  | 'paymentStatus_desc';
type OrdersTranslator = (key: string, options?: Record<string, unknown>) => string;
const DEFAULT_SORT: OrderSortValue = 'createdAt_desc';
const DEFAULT_PAGE_SIZE = 15;
const ORDER_STATUS_QUERY_VALUES = new Set<StatusTabKey>(['ALL', 'Pending', 'Processing', 'Shipping', 'Delivered', 'Cancelled']);
const ORDER_SORT_QUERY_VALUES = new Set<OrderSortValue>([
  'createdAt_desc',
  'createdAt_asc',
  'totalAmount_desc',
  'totalAmount_asc',
  'status_asc',
  'paymentStatus_desc',
]);

type BulkActionKey = 'mark-processing' | 'mark-shipping' | 'cancel' | 'export';

type BulkActionState = {
  key: BulkActionKey;
  status?: OrderStatusValue;
} | null;

type BulkFeedbackState = {
  kind: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
  skipped?: Array<{ orderId: number; errorCode?: string }>;
} | null;

const parseStatusTab = (value: string | null): StatusTabKey =>
  value && ORDER_STATUS_QUERY_VALUES.has(value as StatusTabKey)
    ? (value as StatusTabKey)
    : 'ALL';

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseSortValue = (value: string | null): OrderSortValue =>
  value && ORDER_SORT_QUERY_VALUES.has(value as OrderSortValue)
    ? (value as OrderSortValue)
    : DEFAULT_SORT;

export const formatVND = (amount: string | number): string => {
  return formatCurrencyFullVND(amount);
};

const getPaymentBadgeTone = (paymentStatus: string | null | undefined, paymentMethod?: string) => {
  return getPaymentStatusMeta(paymentMethod, paymentStatus).badgeClass;
};

const getCompactPaymentLabel = (
  paymentStatus: string | null | undefined,
  paymentMethod: string | undefined,
  t: OrdersTranslator,
) => {
  const meta = getPaymentStatusMeta(paymentMethod, paymentStatus);
  const label = t(meta.labelKey, { defaultValue: meta.defaultLabel });
  return label === meta.labelKey ? meta.defaultLabel : label;
};

const getCompactPaymentMethodLabel = (
  paymentMethod: string | undefined,
  t: OrdersTranslator,
) => {
  const meta = getPaymentMethodMeta(paymentMethod);
  const label = t(meta.labelKey, { defaultValue: meta.defaultLabel });
  return label === meta.labelKey ? meta.defaultLabel : label;
};

const shortenOrderNumber = (value: string) => {
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-4)}`;
};

const formatDateParts = (iso?: string) => {
  if (!iso) {
    return { time: '—', date: '—' };
  }

  const date = new Date(iso);
  return {
    time: new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date),
    date: new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date),
  };
};

const getVisiblePages = (page: number, totalPages: number) => {
  const maxVisible = 5;
  const start = Math.max(1, Math.min(page - 2, totalPages - (maxVisible - 1)));
  return Array.from(
    { length: Math.min(maxVisible, totalPages) },
    (_, index) => start + index,
  );
};

const BULK_ACTION_STATUS_BY_KEY: Record<Exclude<BulkActionKey, 'export'>, OrderStatusValue> = {
  'mark-processing': ORDER_STATUS.PROCESSING,
  'mark-shipping': ORDER_STATUS.SHIPPING,
  cancel: ORDER_STATUS.CANCELLED,
};

const resolveBulkActionErrorText = (
  errorCode: string | undefined,
  t: OrdersTranslator,
) => {
  switch (errorCode) {
    case 'INVALID_STATUS_TRANSITION':
      return t('bulk.errors.invalidTransition', { defaultValue: 'Không đúng luồng chuyển trạng thái.' });
    case 'DELIVERY_PROOF_REQUIRED':
      return t('bulk.errors.deliveryProofRequired', { defaultValue: 'Chưa có bằng chứng giao hàng đã duyệt.' });
    case 'DELIVERY_PROOF_REVIEW_REQUIRED':
      return t('bulk.errors.deliveryProofReviewRequired', { defaultValue: 'Bằng chứng giao hàng chưa được xác nhận.' });
    case 'ORDER_NOT_FOUND':
    case 'NOT_FOUND':
      return t('bulk.errors.notFound', { defaultValue: 'Không còn tìm thấy đơn hàng.' });
    case 'ORDER_STATE_CONFLICT':
      return t('bulk.errors.stateConflict', { defaultValue: 'Đơn đã đổi trạng thái ở nơi khác.' });
    default:
      return t('bulk.errors.generic', { defaultValue: 'Không thể áp dụng thao tác cho đơn này.' });
  }
};

const StatusBadge: React.FC<{ status: string; t: OrdersTranslator }> = ({ status, t }) => {
  const { canonical, meta } = getOrderStatusDisplayMeta(status);
  const translationKey = canonical ? `status.${canonical.toUpperCase()}` : 'status.other';
  const translated = t(translationKey, {
    defaultValue: canonical ? meta.label : status || 'Khác',
  });
  const label = translated === translationKey ? (canonical ? meta.label : status || 'Khác') : translated;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badgeClass} ${meta.textClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {label}
    </span>
  );
};

const PaymentBadge: React.FC<{ paymentStatus: string; paymentMethod?: string; t: OrdersTranslator }> = ({
  paymentStatus,
  paymentMethod,
  t,
}) => (
  <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getPaymentBadgeTone(paymentStatus, paymentMethod)}`}>
    {getCompactPaymentLabel(paymentStatus, paymentMethod, t)}
  </span>
);

interface OrderTableRowProps {
  order: AdminOrder;
  selectionEnabled: boolean;
  isSelected: boolean;
  t: OrdersTranslator;
  copyOrderNumberTitle: string;
  detailLabel: string;
  onOpen: (orderId: number) => void;
  onCopy: (orderNumber: string) => void;
  onToggleSelect: (orderId: number) => void;
}

const OrderTableRow = React.memo(({
  order,
  selectionEnabled,
  isSelected,
  t,
  copyOrderNumberTitle,
  detailLabel,
  onOpen,
  onCopy,
  onToggleSelect,
}: OrderTableRowProps) => {
  const created = formatDateParts(order.createdAt);
  const selectedRowClasses = 'bg-sky-500/[0.07] shadow-[inset_0_0_0_1px_rgba(56,189,248,0.14)]';
  const selectedStickyCellClasses = 'bg-[rgba(11,22,38,0.96)] shadow-[inset_1px_0_0_rgba(56,189,248,0.08)]';

  const handleOpen = () => onOpen(order.orderId);

  return (
    <tr
      className={`group cursor-pointer border-b border-white/[0.04] text-sm transition-colors hover:bg-white/[0.03] ${
        isSelected ? selectedRowClasses : ''
      }`}
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      }}
      tabIndex={0}
    >
      {selectionEnabled && (
        <td className="px-3.5 py-2 align-middle lg:px-4">
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              event.stopPropagation();
              onToggleSelect(order.orderId);
            }}
            aria-label={t('bulk.table.selectOrder', {
              defaultValue: 'Chọn đơn {{orderNumber}}',
              orderNumber: order.orderNumber,
            })}
            className="h-4 w-4 rounded border-white/20 bg-transparent text-primary focus:ring-0"
          />
        </td>
      )}
      <td className="px-3.5 py-2 align-middle lg:px-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-white/92">
              {shortenOrderNumber(order.orderNumber)}
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCopy(order.orderNumber);
              }}
              className="rounded-md border border-white/10 p-1 text-white/35 transition-colors duration-150 hover:border-white/20 hover:text-white/80"
              title={copyOrderNumberTitle}
            >
              <Copy size={12} />
            </button>
          </div>
          <p className="text-[11px] text-white/48">
            {t('table.itemCount', {
              count: order.itemCount,
              defaultValue: '{{count}} sản phẩm',
            })}
          </p>
        </div>
      </td>

      <td className="px-3.5 py-2 align-middle lg:px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-bold uppercase text-white/70">
            {order.customerName?.charAt(0) ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-white/90">{order.customerName}</p>
            <p className="mt-0.5 text-[11px] text-white/52">{order.customerPhone}</p>
          </div>
        </div>
      </td>

      <td className="px-3.5 py-2 align-middle lg:px-4">
        <div className="space-y-1">
          <p className="text-[14px] font-medium text-white/88">{created.time}</p>
          <p className="text-[11px] text-white/52">{created.date}</p>
        </div>
      </td>

      <td className="px-3.5 py-2 align-middle lg:px-4">
        <span className="text-[14px] font-bold text-white">{formatVND(order.totalAmount)}</span>
      </td>

      <td className="px-3.5 py-2 align-middle lg:px-4">
        <div className="space-y-0.5">
          <PaymentBadge paymentStatus={order.paymentStatus} paymentMethod={order.paymentMethod} t={t} />
          <p className="text-[11px] uppercase tracking-[0.1em] text-white/42">
            {getCompactPaymentMethodLabel(order.paymentMethod, t)}
          </p>
        </div>
      </td>

      <td className="px-3.5 py-2 align-middle lg:px-4">
        <StatusBadge status={order.status} t={t} />
      </td>

      <td
        className={`sticky right-0 px-3.5 py-2 align-middle text-right transition-colors duration-150 lg:px-4 ${
          isSelected
            ? `${selectedStickyCellClasses} group-hover:bg-[rgba(16,28,46,0.98)]`
            : 'bg-[#0f1014] group-hover:bg-[#14161b]'
        }`}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleOpen();
          }}
          className="inline-flex min-w-[94px] items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/68 transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
        >
          <Eye size={11} />
          {detailLabel}
        </button>
      </td>
    </tr>
  );
});

const BulkFeedbackBar: React.FC<{
  feedback: BulkFeedbackState;
  t: OrdersTranslator;
  onDismiss: () => void;
}> = ({ feedback, t, onDismiss }) => {
  const toneClassMap = {
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
    error: 'border-red-500/20 bg-red-500/10 text-red-100',
    info: 'border-sky-500/20 bg-sky-500/10 text-sky-100',
  } as const;

  return (
    <div className={`mx-5 mt-5 rounded-2xl border px-4 py-3 lg:mx-6 ${toneClassMap[feedback.kind]}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{feedback.title}</p>
          {feedback.description && <p className="text-xs text-white/75">{feedback.description}</p>}
          {feedback.skipped && feedback.skipped.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {feedback.skipped.slice(0, 4).map((item) => (
                <AdminBadge key={item.orderId} tone="warning" className="text-[10px]">
                  {t('bulk.summary.skippedBadge', {
                    orderId: item.orderId,
                    reason: resolveBulkActionErrorText(item.errorCode, t),
                    defaultValue: 'Đơn #{{orderId}} · {{reason}}',
                  })}
                </AdminBadge>
              ))}
              {feedback.skipped.length > 4 && (
                <AdminBadge tone="default" className="text-[10px]">
                  {t('bulk.summary.moreSkipped', {
                    count: feedback.skipped.length - 4,
                    defaultValue: '+{{count}} đơn khác',
                  })}
                </AdminBadge>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 hover:text-white"
        >
          {t('bulk.summary.dismiss', { defaultValue: 'Đóng' })}
        </button>
      </div>
    </div>
  );
};

const BulkActionModal: React.FC<{
  action: BulkActionState;
  selectedCount: number;
  loading: boolean;
  t: OrdersTranslator;
  onClose: () => void;
  onConfirm: (note?: string) => void;
}> = ({ action, selectedCount, loading, t, onClose, onConfirm }) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    setNote('');
  }, [action]);

  if (!action) return null;

  const actionIcon =
    action.key === 'mark-processing'
      ? Box
      : action.key === 'mark-shipping'
        ? Truck
        : action.key === 'cancel'
          ? Ban
          : Download;

  const title =
    action.key === 'mark-processing'
      ? t('bulk.actions.markProcessing', { defaultValue: 'Chuyển sang xử lý' })
      : action.key === 'mark-shipping'
        ? t('bulk.actions.markShipping', { defaultValue: 'Chuyển sang giao hàng' })
        : action.key === 'cancel'
          ? t('bulk.actions.cancel', { defaultValue: 'Hủy đơn đã chọn' })
          : t('bulk.actions.exportSelected', { defaultValue: 'Xuất đơn đã chọn' });

  const subtitle =
    action.key === 'cancel'
      ? t('bulk.dialog.cancelSubtitle', {
        count: selectedCount,
        defaultValue: 'Các đơn đủ điều kiện trong {{count}} đơn đã chọn sẽ bị hủy. Những đơn không còn hợp lệ sẽ được bỏ qua an toàn.',
      })
      : action.key === 'export'
        ? t('bulk.dialog.exportSubtitle', {
          count: selectedCount,
          defaultValue: 'Xuất {{count}} đơn đang được chọn trên trang hiện tại ra tệp CSV.',
        })
        : t('bulk.dialog.defaultSubtitle', {
          count: selectedCount,
          defaultValue: 'Áp dụng thao tác cho {{count}} đơn đang được chọn. Các đơn không hợp lệ sẽ được bỏ qua.',
        });

  const confirmLabel =
    action.key === 'export'
      ? t('bulk.dialog.confirmExport', { defaultValue: 'Xuất CSV' })
      : t('bulk.dialog.confirm', { defaultValue: 'Xác nhận' });

  return (
    <AdminModalShell
      icon={actionIcon}
      title={title}
      subtitle={subtitle}
      onClose={loading ? undefined : onClose}
      maxWidthClassName="max-w-lg"
      bodyClassName="space-y-5 p-6"
      footer={(
        <div className="flex justify-end gap-3">
          <AdminSecondaryButton type="button" onClick={onClose} disabled={loading}>
            {t('bulk.dialog.keepSelection', { defaultValue: 'Quay lại' })}
          </AdminSecondaryButton>
          <AdminPrimaryButton
            type="button"
            onClick={() => onConfirm(note)}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : action.key === 'export' ? (
              <Download size={14} />
            ) : (
              <CheckCircle2 size={14} />
            )}
            {loading
              ? t('bulk.dialog.processing', { defaultValue: 'Đang xử lý...' })
              : confirmLabel}
          </AdminPrimaryButton>
        </div>
      )}
    >
      {action.key === 'cancel' && (
        <label className="block">
          <span className={`${adminUiTokens.fieldLabel} mb-2 block`}>
            {t('bulk.dialog.noteLabel', { defaultValue: 'Ghi chú nội bộ' })}
          </span>
          <textarea
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('bulk.dialog.notePlaceholder', { defaultValue: 'Ví dụ: khách yêu cầu đổi địa chỉ, đơn cần dừng xử lý...' })}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/28 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </label>
      )}
    </AdminModalShell>
  );
};

export const Orders: React.FC = () => {
  const { t } = useTranslation(['orders']);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const interpolateFallback = useCallback(
    (template: string, options?: Record<string, unknown>) =>
      template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token: string) => String(options?.[token] ?? '')),
    [],
  );
  const resolveText = useCallback<OrdersTranslator>((key, options) => {
    const fallback = typeof options?.defaultValue === 'string' ? options.defaultValue : key;
    const value = t(key, options);
    return value === key ? interpolateFallback(fallback, options) : value;
  }, [interpolateFallback, t]);
  const statusTabs = useMemo(
    () => ([
      { key: 'ALL', label: resolveText('filters.all', { defaultValue: 'Tất cả' }) },
      { key: 'Pending', label: resolveText('status.PENDING', { defaultValue: 'Chờ xác nhận' }) },
      { key: 'Processing', label: resolveText('status.PROCESSING', { defaultValue: 'Đang xử lý' }) },
      { key: 'Shipping', label: resolveText('status.SHIPPING', { defaultValue: 'Đang giao' }) },
      { key: 'Delivered', label: resolveText('status.DELIVERED', { defaultValue: 'Đã giao' }) },
      { key: 'Cancelled', label: resolveText('status.CANCELLED', { defaultValue: 'Đã hủy' }) },
    ] as const),
    [resolveText],
  );
  const sortOptions = useMemo(
    () => ([
      { value: 'createdAt_desc' as const, label: resolveText('sortOptions.createdAtDesc', { defaultValue: 'Mới nhất' }) },
      { value: 'createdAt_asc' as const, label: resolveText('sortOptions.createdAtAsc', { defaultValue: 'Cũ nhất' }) },
      { value: 'totalAmount_desc' as const, label: resolveText('sortOptions.totalAmountDesc', { defaultValue: 'Giá trị cao nhất' }) },
      { value: 'totalAmount_asc' as const, label: resolveText('sortOptions.totalAmountAsc', { defaultValue: 'Giá trị thấp nhất' }) },
      { value: 'status_asc' as const, label: resolveText('sortOptions.statusAsc', { defaultValue: 'Theo trạng thái' }) },
      { value: 'paymentStatus_desc' as const, label: resolveText('sortOptions.paymentStatusDesc', { defaultValue: 'Theo thanh toán' }) },
    ] as const),
    [resolveText],
  );
  const initialActiveTab = parseStatusTab(searchParams.get('status'));
  const initialSearch = searchParams.get('q') ?? '';
  const initialStartDate = searchParams.get('startDate') ?? '';
  const initialEndDate = searchParams.get('endDate') ?? '';
  const initialSort = parseSortValue(searchParams.get('sort'));
  const initialPage = parsePositiveInt(searchParams.get('page'), 1);
  const initialPageSize = parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StatusTabKey>(initialActiveTab);
  const [search, setSearch] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [sort, setSort] = useState<OrderSortValue>(initialSort);
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [tabCounts, setTabCounts] = useState<Record<StatusTabKey, number>>({
    ALL: 0,
    Pending: 0,
    Processing: 0,
    Shipping: 0,
    Delivered: 0,
    Cancelled: 0,
  });
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkActionState>(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [isBulkExporting, setIsBulkExporting] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<BulkFeedbackState>(null);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);
  const tabCountsRequestIdRef = useRef(0);

  const loadOrders = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isFirstLoad = !hasLoadedRef.current;
    if (isFirstLoad) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const res = await adminOrderService.getAll({
        status: activeTab === 'ALL' ? undefined : activeTab,
        page,
        pageSize,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sort,
      });

      if (requestIdRef.current !== requestId) return;
      setOrders(res.orders);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
      hasLoadedRef.current = true;
    } catch (e: unknown) {
      if (requestIdRef.current !== requestId) return;
      const requestError = e as { message?: string };
      setError(requestError.message || resolveText('page.loadError', { defaultValue: 'Không thể tải danh sách đơn hàng.' }));
    } finally {
      if (requestIdRef.current !== requestId) return;
      if (isFirstLoad) setLoading(false);
      else setIsRefreshing(false);
    }
  }, [activeTab, endDate, page, pageSize, search, sort, startDate]);

  const loadTabCounts = useCallback(async () => {
    const requestId = ++tabCountsRequestIdRef.current;

    try {
      const counts = await adminOrderService.getTabCounts({
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (tabCountsRequestIdRef.current !== requestId) return;

      setTabCounts({
        ALL: counts.ALL ?? 0,
        Pending: counts.Pending ?? 0,
        Processing: counts.Processing ?? 0,
        Shipping: counts.Shipping ?? 0,
        Delivered: counts.Delivered ?? 0,
        Cancelled: counts.Cancelled ?? 0,
      });
    } catch {
      // Keep the previous counts if the auxiliary request fails.
    }
  }, [endDate, search, startDate]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadTabCounts();
  }, [loadTabCounts]);

  useEffect(() => () => {
    if (searchDebounce.current) {
      clearTimeout(searchDebounce.current);
    }
  }, []);

  useEffect(() => {
    const nextActiveTab = parseStatusTab(searchParams.get('status'));
    const nextSearch = searchParams.get('q') ?? '';
    const nextStartDate = searchParams.get('startDate') ?? '';
    const nextEndDate = searchParams.get('endDate') ?? '';
    const nextSort = parseSortValue(searchParams.get('sort'));
    const nextPage = parsePositiveInt(searchParams.get('page'), 1);
    const nextPageSize = parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);

    setActiveTab((current) => (current === nextActiveTab ? current : nextActiveTab));
    setSearch((current) => (current === nextSearch ? current : nextSearch));
    setSearchInput((current) => (current === nextSearch ? current : nextSearch));
    setStartDate((current) => (current === nextStartDate ? current : nextStartDate));
    setEndDate((current) => (current === nextEndDate ? current : nextEndDate));
    setSort((current) => (current === nextSort ? current : nextSort));
    setPage((current) => (current === nextPage ? current : nextPage));
    setPageSize((current) => (current === nextPageSize ? current : nextPageSize));
  }, [searchParams]);

  useEffect(() => {
    setSelectedOrderIds([]);
    setIsSelectionMode(false);
  }, [activeTab, search, startDate, endDate, sort, page, pageSize]);

  useEffect(() => {
    const nextSearchParams = new URLSearchParams();

    if (activeTab !== 'ALL') {
      nextSearchParams.set('status', activeTab);
    }
    if (search) {
      nextSearchParams.set('q', search);
    }
    if (startDate) {
      nextSearchParams.set('startDate', startDate);
    }
    if (endDate) {
      nextSearchParams.set('endDate', endDate);
    }
    if (sort !== DEFAULT_SORT) {
      nextSearchParams.set('sort', sort);
    }
    if (page > 1) {
      nextSearchParams.set('page', page.toString());
    }
    if (pageSize !== DEFAULT_PAGE_SIZE) {
      nextSearchParams.set('pageSize', pageSize.toString());
    }

    if (nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams);
    }
  }, [activeTab, endDate, page, pageSize, search, searchParams, setSearchParams, sort, startDate]);

  const handleTabChange = (tab: StatusTabKey) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setSearchInput(nextValue);

    if (searchDebounce.current) {
      clearTimeout(searchDebounce.current);
    }

    searchDebounce.current = setTimeout(() => {
      setSearch(nextValue);
      setPage(1);
    }, 400);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSearchInput('');
    setStartDate('');
    setEndDate('');
    setActiveTab('ALL');
    setSort(DEFAULT_SORT);
    setPage(1);
  };

  const handleRefresh = () => {
    void Promise.all([loadOrders(), loadTabCounts()]);
  };

  const handleEnterSelectionMode = useCallback(() => {
    setBulkFeedback(null);
    setIsSelectionMode(true);
  }, []);

  const handleExitSelectionMode = useCallback(() => {
    setSelectedOrderIds([]);
    setBulkAction(null);
    setBulkFeedback(null);
    setIsSelectionMode(false);
  }, []);

  const handleCopyOrderNumber = useCallback(async (orderNumber: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(orderNumber);
    } catch {
      // Ignore clipboard failures to keep the table interaction lightweight.
    }
  }, []);

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedOrderIds.includes(order.orderId)),
    [orders, selectedOrderIds],
  );

  const selectedShippingOrders = useMemo(
    () => selectedOrders.filter((order) => normalizeStatus(order.status) === ORDER_STATUS.SHIPPING),
    [selectedOrders],
  );

  const canApplyBulkStatus = useCallback((targetStatus: OrderStatusValue) => (
    selectedOrders.some((order) => {
      const normalized = normalizeStatus(order.status);
      return normalized ? getValidNextStatuses(normalized).includes(targetStatus) : false;
    })
  ), [selectedOrders]);

  const toggleOrderSelection = useCallback((orderId: number) => {
    setSelectedOrderIds((current) => (
      current.includes(orderId)
        ? current.filter((currentOrderId) => currentOrderId !== orderId)
        : [...current, orderId]
    ));
  }, []);

  const handleSelectAllCurrentPage = useCallback((checked: boolean) => {
    setSelectedOrderIds(checked ? orders.map((order) => order.orderId) : []);
  }, [orders]);

  const selectedCount = selectedOrderIds.length;
  const isAllCurrentPageSelected = orders.length > 0 && selectedCount === orders.length;
  const hasSelectedShippingOrders = selectedShippingOrders.length > 0;
  const firstSelectedShippingOrder = selectedShippingOrders[0] ?? null;
  const showBulkSelectionPanel = isSelectionMode;
  const stableTableViewportHeightClass = 'h-[440px] lg:h-[560px] xl:h-[620px]';
  const stableFooterHeightClass = 'min-h-[60px]';

  const handleBulkActionRequest = useCallback((key: BulkActionKey) => {
    setBulkFeedback(null);

    if (key === 'export') {
      setBulkAction({ key });
      return;
    }

    setBulkAction({
      key,
      status: BULK_ACTION_STATUS_BY_KEY[key],
    });
  }, []);

  const handleOpenManualVerification = useCallback(() => {
    if (!firstSelectedShippingOrder) return;

    navigate(`/admin/orders/${firstSelectedShippingOrder.orderId}`);
  }, [firstSelectedShippingOrder, navigate]);

  const handleBulkActionConfirm = useCallback(async (note?: string) => {
    if (!bulkAction || selectedOrderIds.length === 0) return;

    if (bulkAction.key === 'export') {
      setIsBulkExporting(true);

      try {
        const { fileName } = await adminOrderService.exportSelectedOrders(selectedOrderIds);
        showToast({
          type: 'success',
          title: resolveText('bulk.export.successTitle', { defaultValue: 'Đã xuất danh sách đơn hàng' }),
          subtitle: fileName,
        });
        setSelectedOrderIds([]);
        setIsSelectionMode(false);
      } catch (error: unknown) {
        const exportError = error as { message?: string };
        showToast({
          type: 'error',
          title: resolveText('bulk.export.errorTitle', { defaultValue: 'Không thể xuất đơn hàng đã chọn' }),
          subtitle: exportError.message,
        });
      } finally {
        setIsBulkExporting(false);
        setBulkAction(null);
      }

      return;
    }

    if (!bulkAction.status) return;

    setIsBulkSubmitting(true);

    try {
      const result = await adminOrderService.bulkUpdateStatus({
        orderIds: selectedOrderIds,
        status: bulkAction.status,
        note: note?.trim() || undefined,
      });

      const skipped = result.results
        .filter((item) => item.outcome !== 'updated')
        .map((item) => ({ orderId: item.orderId, errorCode: item.errorCode }));

      const feedbackKind =
        result.failedCount > 0
          ? 'error'
          : result.skippedCount > 0
            ? 'warning'
            : 'success';

      setBulkFeedback({
        kind: feedbackKind,
        title: resolveText('bulk.summary.title', {
          updated: result.successCount,
          skipped: result.skippedCount,
          failed: result.failedCount,
          defaultValue: 'Đã cập nhật {{updated}} đơn · bỏ qua {{skipped}} · lỗi {{failed}}',
        }),
        description: resolveText('bulk.summary.description', {
          total: result.requestedCount,
          defaultValue: 'Máy chủ đã kiểm tra {{total}} đơn và chỉ áp dụng cho các đơn hợp lệ.',
        }),
        skipped,
      });

      showToast({
        type: feedbackKind === 'error' ? 'error' : feedbackKind === 'warning' ? 'info' : 'success',
        title: resolveText('bulk.summary.toastTitle', {
          updated: result.successCount,
          defaultValue: 'Đã xử lý {{updated}} đơn hàng',
        }),
        subtitle: feedbackKind === 'success'
          ? resolveText('bulk.summary.toastSuccess', { defaultValue: 'Danh sách và số liệu đã được làm mới.' })
          : resolveText('bulk.summary.toastPartial', { defaultValue: 'Một số đơn không hợp lệ đã được bỏ qua an toàn.' }),
      });

      await Promise.all([loadOrders(), loadTabCounts()]);
      setSelectedOrderIds([]);
      setIsSelectionMode(false);
    } catch (error: unknown) {
      const bulkError = error as { message?: string };
      setBulkFeedback({
        kind: 'error',
        title: resolveText('bulk.summary.requestFailed', { defaultValue: 'Không thể xử lý thao tác hàng loạt' }),
        description: bulkError.message,
      });
      showToast({
        type: 'error',
        title: resolveText('bulk.summary.requestFailed', { defaultValue: 'Không thể xử lý thao tác hàng loạt' }),
        subtitle: bulkError.message,
      });
    } finally {
      setIsBulkSubmitting(false);
      setBulkAction(null);
    }
  }, [bulkAction, loadOrders, loadTabCounts, resolveText, selectedOrderIds, showToast]);

  const hasFilters = !!search || !!startDate || !!endDate || sort !== DEFAULT_SORT;
  const rangeStart = total === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const rangeEnd = Math.min(total, page * pageSize);
  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <AdminPageShell>
      <AdminSectionCard bodyClassName="space-y-3 p-3.5 lg:space-y-3 lg:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${adminUiTokens.brandIconSurface}`}>
                  <Package size={17} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-[1.95rem] font-black leading-none tracking-tight text-white lg:text-[2.05rem]">
                      {resolveText('page.title', { defaultValue: 'Đơn hàng' })}
                    </h1>
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">
                      {resolveText('page.orderCountCompact', { count: total, defaultValue: '{{count}} đơn' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <AdminSecondaryButton type="button" onClick={handleRefresh} className="shrink-0 px-3.5 py-1.5 text-sm">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {resolveText('actions.refresh', { defaultValue: 'Làm mới' })}
            </AdminSecondaryButton>
          </div>

          <div className="grid gap-2.5 lg:grid-cols-[minmax(260px,1.55fr)_minmax(250px,1.15fr)_minmax(152px,0.8fr)_minmax(104px,0.52fr)]">
            <label className="relative">
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className={`${adminUiTokens.fieldLabel} text-[12px] tracking-[0.14em] text-white/44`}>
                  {resolveText('filters.searchLabel', { defaultValue: 'Tìm kiếm' })}
                </span>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white/40 transition-colors hover:text-white/75"
                  >
                    <FilterX size={12} />
                    {resolveText('actions.reset', { defaultValue: 'Đặt lại' })}
                  </button>
                )}
              </div>
              <Search size={14} className="pointer-events-none absolute left-3 top-[36px] -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder={resolveText('filters.searchPlaceholderAdmin', { defaultValue: 'Tìm tên, SĐT, mã đơn...' })}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3.5 text-[15px] text-white placeholder:text-white/32 transition-colors duration-150 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </label>

            <div>
              <span className={`${adminUiTokens.fieldLabel} mb-1 flex items-center gap-1.5 text-[12px] tracking-[0.14em] text-white/44`}>
                <Calendar size={12} />
                {resolveText('filters.dateRange', { defaultValue: 'Khoảng ngày' })}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className={`${adminUiTokens.fieldControl} text-[15px]`}
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className={`${adminUiTokens.fieldControl} text-[15px]`}
                />
              </div>
            </div>

            <label>
              <span className={`${adminUiTokens.fieldLabel} text-[12px] tracking-[0.14em] text-white/44`}>
                {resolveText('filters.sortLabel', { defaultValue: 'Sắp xếp' })}
              </span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(parseSortValue(e.target.value));
                  setPage(1);
                }}
                className={`${adminUiTokens.fieldControl} text-[15px]`}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#111318]">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={`${adminUiTokens.fieldLabel} text-[12px] tracking-[0.14em] text-white/44`}>
                {resolveText('pagination.perPage', { defaultValue: '/ trang' })}
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className={`${adminUiTokens.fieldControl} text-[15px]`}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-[#111318]">
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div data-testid="status-filter-bar" data-refreshing={isRefreshing && !loading ? 'true' : 'false'}>
            <div className="flex flex-wrap gap-1.5">
              {statusTabs.map((tab) => {
                const isActive = tab.key === activeTab;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabChange(tab.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[14px] font-semibold transition-colors duration-150 ${
                      isActive
                        ? 'border-primary/55 bg-primary/[0.18] text-white shadow-[inset_0_0_0_1px_rgba(227,24,55,0.14)]'
                        : 'border-white/10 bg-white/[0.03] text-white/62 hover:border-white/18 hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`inline-flex min-w-[1.2rem] justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive ? 'bg-white/12 text-white' : 'bg-white/[0.06] text-white/52'
                    }`}>
                      {tabCounts[tab.key] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        className="flex min-h-0 flex-1 flex-col bg-[#0f1014]"
        bodyClassName="flex min-h-0 flex-1 flex-col"
      >
        {bulkFeedback && (
          <BulkFeedbackBar
            feedback={bulkFeedback}
            t={resolveText}
            onDismiss={() => setBulkFeedback(null)}
          />
        )}

        {showBulkSelectionPanel && (
          <div className="border-b border-white/[0.06] bg-white/[0.015] px-4 py-2 lg:px-5">
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0 space-y-1.5">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <AdminBadge tone="default" dot className="px-2.5 py-0.5 text-[11px]">
                    {resolveText('bulk.selectedCount', {
                      count: selectedCount,
                      defaultValue: 'Đã chọn {{count}} đơn',
                    })}
                  </AdminBadge>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-white/34">
                    {resolveText('bulk.selectCurrentPageHint', { defaultValue: 'Chọn tất cả chỉ áp dụng cho trang hiện tại.' })}
                  </span>
                  {hasSelectedShippingOrders && (
                    <span className="text-[10px] text-sky-200/80">
                      {resolveText('bulk.manualDelivery.inlineHint', {
                        defaultValue: 'Đơn giao hàng cần xác minh thủ công.',
                      })}
                    </span>
                  )}
                </div>
                {hasSelectedShippingOrders && (
                  <button
                    type="button"
                    onClick={handleOpenManualVerification}
                    className="inline-flex text-[11px] font-bold uppercase tracking-[0.1em] text-sky-300 transition-colors hover:text-sky-200"
                  >
                    {resolveText(
                      selectedShippingOrders.length > 1
                        ? 'bulk.manualDelivery.openFirst'
                        : 'bulk.manualDelivery.openSingle',
                      {
                        defaultValue: selectedShippingOrders.length > 1
                          ? 'Mở đơn đầu tiên'
                          : 'Mở chi tiết',
                      },
                    )}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 lg:flex-nowrap lg:justify-self-end">
                <AdminActionButton
                  type="button"
                  tone="info"
                  size="sm"
                  className="text-sm"
                  onClick={() => handleBulkActionRequest('mark-processing')}
                  disabled={isBulkSubmitting || isBulkExporting || !canApplyBulkStatus(ORDER_STATUS.PROCESSING)}
                >
                  <Box size={14} />
                  {resolveText('bulk.actions.markProcessingShort', { defaultValue: 'Xử lý' })}
                </AdminActionButton>
                <AdminActionButton
                  type="button"
                  tone="cyan"
                  size="sm"
                  className="text-sm"
                  onClick={() => handleBulkActionRequest('mark-shipping')}
                  disabled={isBulkSubmitting || isBulkExporting || !canApplyBulkStatus(ORDER_STATUS.SHIPPING)}
                >
                  <Truck size={14} />
                  {resolveText('bulk.actions.markShippingShort', { defaultValue: 'Giao hàng' })}
                </AdminActionButton>
                <AdminActionButton
                  type="button"
                  tone="danger"
                  size="sm"
                  className="text-sm"
                  onClick={() => handleBulkActionRequest('cancel')}
                  disabled={isBulkSubmitting || isBulkExporting || !canApplyBulkStatus(ORDER_STATUS.CANCELLED)}
                >
                  <Ban size={14} />
                  {resolveText('bulk.actions.cancelShort', { defaultValue: 'Hủy' })}
                </AdminActionButton>
                <AdminSecondaryButton
                  type="button"
                  onClick={() => handleBulkActionRequest('export')}
                  disabled={isBulkSubmitting || isBulkExporting}
                  className="px-3 py-1.5 text-sm"
                >
                  {isBulkExporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                  {resolveText('bulk.actions.exportSelectedShort', { defaultValue: 'Xuất' })}
                </AdminSecondaryButton>
                <AdminSecondaryButton
                  type="button"
                  onClick={handleExitSelectionMode}
                  className="px-2.5 py-1.5 text-sm"
                  title={resolveText('bulk.exitSelectionMode', { defaultValue: 'Thoát chọn nhiều' })}
                >
                  <X size={12} />
                  {resolveText('bulk.exitSelectionModeShort', { defaultValue: 'Thoát' })}
                </AdminSecondaryButton>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 rounded-full border-4 border-white/10 border-t-primary animate-spin" />
              <p className="text-sm text-white/45">{resolveText('page.loading', { defaultValue: 'Đang tải danh sách đơn hàng...' })}</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-sm text-center">
              <AlertCircle size={40} className="mx-auto text-red-400" />
              <h3 className="mt-4 text-base font-bold text-white">{resolveText('page.dataError', { defaultValue: 'Không thể hiển thị dữ liệu' })}</h3>
              <p className="mt-2 text-sm text-white/55">{error}</p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-primary hover:underline"
              >
                {resolveText('page.retry', { defaultValue: 'Thử lại' })}
              </button>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <AdminEmptyState
            icon={Package}
            title={resolveText('page.noOrders', { defaultValue: 'Chưa có đơn hàng nào' })}
            description={resolveText('page.changeFilter', { defaultValue: 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.' })}
          />
        ) : (
          <>
            <div className="flex flex-col gap-2 border-b border-white/[0.06] px-4 py-2 text-[12px] text-white/45 sm:flex-row sm:items-center sm:justify-between lg:px-5">
              <span>
                {resolveText('pagination.rangeSummary', {
                  start: rangeStart,
                  end: rangeEnd,
                  total,
                  defaultValue: 'Hiển thị {{start}}-{{end}} / {{total}} đơn',
                })}
              </span>
              {!isSelectionMode && (
                <AdminSecondaryButton
                  type="button"
                  onClick={handleEnterSelectionMode}
                  disabled={orders.length === 0}
                  className="self-start px-2.5 py-1.5 text-sm"
                >
                  <CheckCircle2 size={13} />
                  {resolveText('bulk.enterSelectionMode', { defaultValue: 'Chọn nhiều' })}
                </AdminSecondaryButton>
              )}
            </div>

            <div className={`min-h-0 flex-1 overflow-auto ${stableTableViewportHeightClass}`}>
              <table className="min-w-[880px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {[
                      ...(isSelectionMode ? [{
                        key: 'select',
                        label: (
                          <input
                            type="checkbox"
                            checked={isAllCurrentPageSelected}
                            onChange={(event) => handleSelectAllCurrentPage(event.target.checked)}
                            aria-label={resolveText('bulk.table.selectAllCurrentPage', { defaultValue: 'Chọn tất cả đơn trên trang hiện tại' })}
                            className="h-4 w-4 rounded border-white/20 bg-transparent text-primary focus:ring-0"
                          />
                        ),
                      }] : []),
                      { key: 'orderId', label: resolveText('table.orderId', { defaultValue: 'Mã đơn' }) },
                      { key: 'customer', label: resolveText('table.customer', { defaultValue: 'Khách hàng' }) },
                      { key: 'time', label: resolveText('table.time', { defaultValue: 'Thời gian' }) },
                      { key: 'total', label: resolveText('table.total', { defaultValue: 'Tổng tiền' }) },
                      { key: 'payment', label: resolveText('table.payment', { defaultValue: 'Thanh toán' }) },
                      { key: 'shipping', label: resolveText('table.shipping', { defaultValue: 'Trạng thái' }) },
                      { key: 'actions', label: resolveText('table.actions', { defaultValue: 'Thao tác' }) },
                    ].map((column, index) => (
                      <th
                        key={column.key}
                        className={`sticky top-0 z-10 bg-[#111319] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/38 lg:px-4 ${
                          index === (isSelectionMode ? 7 : 6) ? 'sticky right-0 z-20 text-right' : ''
                        }`}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <OrderTableRow
                      key={order.orderId}
                      order={order}
                      selectionEnabled={isSelectionMode}
                      isSelected={selectedOrderIds.includes(order.orderId)}
                      t={resolveText}
                      copyOrderNumberTitle={resolveText('actions.copyOrderNumber', { defaultValue: 'Sao chép mã đơn' })}
                      detailLabel={resolveText('actions.viewDetailShort', { defaultValue: 'Chi tiết' })}
                      onOpen={(orderId) => navigate(`/admin/orders/${orderId}`)}
                      onCopy={(orderNumber) => {
                        void handleCopyOrderNumber(orderNumber);
                      }}
                      onToggleSelect={toggleOrderSelection}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className={`border-t border-white/[0.06] px-4 py-3 lg:px-5 ${stableFooterHeightClass}`}>
            {totalPages > 1 ? (
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-xs text-white/42">
                  {resolveText('pagination.summary', {
                    page,
                    totalPages,
                    total,
                    defaultValue: 'Trang {{page}} / {{totalPages}} · {{total}} đơn',
                  })}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                    disabled={page <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-white/55 transition-colors duration-150 hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {visiblePages.map((visiblePage) => (
                    <button
                      key={visiblePage}
                      type="button"
                      onClick={() => setPage(visiblePage)}
                      className={`h-8 min-w-8 rounded-xl px-2.5 text-xs font-bold transition-colors duration-150 ${
                        visiblePage === page
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'border border-white/10 text-white/55 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {visiblePage}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                    disabled={page >= totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-white/55 transition-colors duration-150 hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </AdminSectionCard>

      <BulkActionModal
        action={bulkAction}
        selectedCount={selectedCount}
        loading={isBulkSubmitting || isBulkExporting}
        t={resolveText}
        onClose={() => setBulkAction(null)}
        onConfirm={(note) => {
          void handleBulkActionConfirm(note);
        }}
      />
    </AdminPageShell>
  );
};
