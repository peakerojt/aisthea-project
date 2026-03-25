import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminReturnService, OrderReturn } from '@/common/services/return.service';
import { useToast } from '@/common/contexts/ToastContext';

export type ReturnStatusFilter = 'ALL' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED';
export type AdminReturnAction = 'APPROVE' | 'REJECT' | 'COMPLETE_REFUND';

const PAGE_SIZE = 15;

export const useAdminReturns = () => {
  const { t: rawT } = useTranslation('returns');
  const t = rawT as (key: string, options?: Record<string, unknown>) => string;
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { ...options, defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };
  const { showToast } = useToast();

  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReturnStatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReturn, setSelectedReturn] = useState<OrderReturn | null>(null);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);

  const statusFilters = useMemo<{ label: string; value: ReturnStatusFilter }[]>(() => [
    { label: resolveText('filters.all', 'Tất cả'), value: 'ALL' },
    { label: resolveText('filters.pending', 'Chờ duyệt'), value: 'REQUESTED' },
    { label: resolveText('status.APPROVED', 'Đã duyệt'), value: 'APPROVED' },
    { label: resolveText('filters.rejected', 'Đã từ chối'), value: 'REJECTED' },
    { label: resolveText('status.RECEIVED', 'Đã nhận hàng'), value: 'RECEIVED' },
    { label: resolveText('status.REFUNDED', 'Đã hoàn tiền'), value: 'REFUNDED' },
  ], [resolveText]);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isFirstLoad = !hasLoadedRef.current;

    if (isFirstLoad) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const data = await adminReturnService.list({ status: statusFilter, page, pageSize: PAGE_SIZE });
      if (requestIdRef.current !== requestId) return;

      setReturns(data.returns);
      setTotalPages(data.pagination.totalPages);
      hasLoadedRef.current = true;
    } catch (error) {
      if (requestIdRef.current !== requestId) return;

      const err = error as Error | { message?: string };
      showToast({
        type: 'error',
        title: err?.message || resolveText('feedback.loadError', 'Không thể tải danh sách trả hàng.'),
      });
    } finally {
      if (requestIdRef.current !== requestId) return;

      if (isFirstLoad) {
        setLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, [page, showToast, statusFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAction = useCallback(async (
    returnId: number,
    action: AdminReturnAction,
    note?: string,
  ) => {
    try {
      const result = await adminReturnService.process(returnId, action, note);
      showToast({
        type: 'success',
        title: result.messageKey
          ? t(result.messageKey, {
            defaultValue: result.message || resolveText('feedback.processError', 'Không thể xử lý yêu cầu.'),
          })
          : result.message || resolveText('feedback.processError', 'Không thể xử lý yêu cầu.'),
      });
      setSelectedReturn(null);
      await load();
    } catch (error) {
      const err = error as Error & { message?: string; messageKey?: string };
      showToast({
        type: 'error',
        title: err?.messageKey
          ? t(err.messageKey, {
            defaultValue: err?.message || resolveText('feedback.processError', 'Không thể xử lý yêu cầu.'),
          })
          : err?.message || resolveText('feedback.processError', 'Không thể xử lý yêu cầu.'),
      });
    }
  }, [load, resolveText, showToast, t]);

  const pendingCount = useMemo(
    () => returns.filter((item) => item.status === 'REQUESTED').length,
    [returns],
  );

  const statusTabs = useMemo(() => statusFilters.map((filter) => ({
    key: filter.value,
    label: filter.label,
    count: filter.value === 'ALL'
      ? returns.length
      : returns.filter((item) => item.status === filter.value).length,
  })), [returns, statusFilters]);

  const changeStatusFilter = useCallback((nextFilter: ReturnStatusFilter) => {
    setStatusFilter(nextFilter);
    setPage(1);
  }, []);

  return {
    changeStatusFilter,
    handleAction,
    isRefreshing,
    loading,
    page,
    pendingCount,
    returns,
    selectedReturn,
    setPage,
    setSelectedReturn,
    statusFilter,
    statusTabs,
    totalPages,
    t,
  };
};
