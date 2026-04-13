import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminReturnReviewActions } from '@/admin/services/types';
import type { AdminReturnSortValue } from '@/admin/services/returns.query';
import type { CompleteBankRefundPayload, OrderReturn } from '@/common/services/return.types';
import { adminReturnReviewService } from '@/admin/services';
import { dispatchReturnSummaryChanged } from '@/common/events/returnSummary.events';
import {
  shouldAutoRefreshRefundState,
} from '@/common/utils/returnRefresh';
import { useReturnAutoRefresh } from '@/common/hooks/useReturnAutoRefresh';
import { useToast } from '@/common/contexts/ToastContext';
import { useAuth } from '@/common/contexts/AuthContext';
import { bucketReturnStatus } from '@/common/utils/returnStatus';
import {
  resolveAdminWorkflowAccess,
} from '@/common/utils/adminAccess';

export type ReturnStatusFilter = 'ALL' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED';
export type ReturnSortValue = AdminReturnSortValue;
export const DEFAULT_RETURN_PAGE_SIZE = 15;
export const DEFAULT_RETURN_SORT: ReturnSortValue = 'createdAt_desc';
export const RETURN_PAGE_SIZE_OPTIONS = [15, 30, 50] as const;

type ReturnStatusCounts = Record<ReturnStatusFilter, number>;

const createEmptyStatusCounts = (): ReturnStatusCounts => ({
  ALL: 0,
  REQUESTED: 0,
  APPROVED: 0,
  REJECTED: 0,
  RECEIVED: 0,
  REFUNDED: 0,
});

type UseAdminReturnsOptions = {
  initialStatusFilter?: ReturnStatusFilter;
  initialSearch?: string;
  initialSort?: ReturnSortValue;
  initialPage?: number;
  initialPageSize?: number;
};

type AdminReturnsLoadMode = 'navigation' | 'background';

type AdminReturnActionError = Error & {
  code?: string;
  messageKey?: string;
};

const createForbiddenActionError = (
  message: string,
  messageKey: string,
  code = 'FORBIDDEN',
): AdminReturnActionError => {
  const error = new Error(message) as AdminReturnActionError;
  error.code = code;
  error.messageKey = messageKey;
  return error;
};

export const useAdminReturns = (options: UseAdminReturnsOptions = {}) => {
  const { t: rawT } = useTranslation('returns');
  const t = rawT as (key: string, options?: Record<string, unknown>) => string;
  const interpolateFallback = (template: string, options?: Record<string, unknown>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_, token) => String(options?.[token] ?? `{{${token}}}`));
  const resolveText = (key: string, fallback: string, options?: Record<string, unknown>) => {
    const value = t(key, { ...options, defaultValue: fallback });
    return value === key ? interpolateFallback(fallback, options) : value;
  };
  const { showToast } = useToast();
  const { permissions, role, user } = useAuth();
  const getStatusBucket = useCallback(
    (item: OrderReturn) => item.statusBucket ?? bucketReturnStatus(item.workflowStatus ?? item.status),
    [],
  );
  const workflowAccess = useMemo(
    () => resolveAdminWorkflowAccess(
      user?.roles ?? (role ? [role] : []),
      user?.permissions ?? permissions,
    ),
    [permissions, role, user?.permissions, user?.roles],
  );
  const canManageReturnWorkflow = useMemo(
    () => workflowAccess.canManageReturnWorkflow,
    [workflowAccess],
  );
  const canManageRefundWorkflow = useMemo(
    () => workflowAccess.canManageRefundWorkflow,
    [workflowAccess],
  );

  const [returns, setReturns] = useState<OrderReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusCounts, setStatusCounts] = useState<ReturnStatusCounts | null>(null);
  const normalizedInitialPage = Number.isFinite(options.initialPage) && (options.initialPage ?? 0) > 0
    ? Math.floor(options.initialPage as number)
    : 1;
  const normalizedInitialPageSize = Number.isFinite(options.initialPageSize) && (options.initialPageSize ?? 0) > 0
    ? Math.floor(options.initialPageSize as number)
    : DEFAULT_RETURN_PAGE_SIZE;
  const normalizedInitialSort = options.initialSort ?? DEFAULT_RETURN_SORT;
  const [statusFilter, setStatusFilter] = useState<ReturnStatusFilter>(options.initialStatusFilter ?? 'ALL');
  const [search, setSearch] = useState(options.initialSearch ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState((options.initialSearch ?? '').trim());
  const [sort, setSort] = useState<ReturnSortValue>(normalizedInitialSort);
  const [page, setPage] = useState(normalizedInitialPage);
  const [pageSize, setPageSize] = useState(normalizedInitialPageSize);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReturns, setTotalReturns] = useState(0);
  const [selectedReturn, setSelectedReturn] = useState<OrderReturn | null>(null);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);
  const previousInitialStatusFilterRef = useRef<ReturnStatusFilter | undefined>(options.initialStatusFilter);
  const previousInitialSearchRef = useRef<string | undefined>(options.initialSearch);
  const previousInitialSortRef = useRef<ReturnSortValue | undefined>(options.initialSort);
  const previousInitialPageRef = useRef<number | undefined>(options.initialPage);
  const previousInitialPageSizeRef = useRef<number | undefined>(options.initialPageSize);

  const statusFilters = useMemo<{ label: string; value: ReturnStatusFilter }[]>(() => [
    { label: resolveText('filters.all', 'Tất cả'), value: 'ALL' },
    { label: resolveText('filters.pending', 'Chờ duyệt'), value: 'REQUESTED' },
    { label: resolveText('status.APPROVED', 'Đã duyệt'), value: 'APPROVED' },
    { label: resolveText('filters.rejected', 'Đã từ chối'), value: 'REJECTED' },
    { label: resolveText('status.RECEIVED', 'Đã nhận hàng'), value: 'RECEIVED' },
    { label: resolveText('status.REFUNDED', 'Đã hoàn tiền'), value: 'REFUNDED' },
  ], [resolveText]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (mode: AdminReturnsLoadMode = 'navigation') => {
    const requestId = ++requestIdRef.current;
    const isFirstLoad = !hasLoadedRef.current;

    if (isFirstLoad) {
      setLoading(true);
      setIsRefreshing(false);
    } else if (mode === 'background') {
      setIsRefreshing(true);
    } else {
      setIsRefreshing(false);
    }

    try {
      const data = await adminReturnReviewService.list({
        status: statusFilter,
        search: debouncedSearch || undefined,
        sort,
        page,
        pageSize,
      });
      if (requestIdRef.current !== requestId) return;

      setReturns(data.returns);
      setTotalReturns(data.pagination.total);
      setStatusCounts(data.summary ?? null);
      setSelectedReturn((current) => {
        if (!current) {
          return current;
        }

        return data.returns.find((item) => item.returnId === current.returnId) ?? null;
      });
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
      }

      setIsRefreshing(false);
    }
  }, [debouncedSearch, page, pageSize, showToast, sort, statusFilter, t]);

  useEffect(() => {
    void load('navigation');
  }, [load]);

  useEffect(() => {
    if (previousInitialStatusFilterRef.current !== options.initialStatusFilter) {
      previousInitialStatusFilterRef.current = options.initialStatusFilter;
      setStatusFilter(options.initialStatusFilter ?? 'ALL');
    }
  }, [options.initialStatusFilter]);

  useEffect(() => {
    if (previousInitialSearchRef.current !== options.initialSearch) {
      previousInitialSearchRef.current = options.initialSearch;
      const nextSearch = options.initialSearch ?? '';
      setSearch(nextSearch);
      setDebouncedSearch(nextSearch.trim());
    }
  }, [options.initialSearch]);

  useEffect(() => {
    if (previousInitialSortRef.current !== options.initialSort) {
      previousInitialSortRef.current = options.initialSort;
      setSort(options.initialSort ?? DEFAULT_RETURN_SORT);
    }
  }, [options.initialSort]);

  useEffect(() => {
    if (previousInitialPageRef.current !== options.initialPage) {
      previousInitialPageRef.current = options.initialPage;
      setPage(normalizedInitialPage);
    }
  }, [normalizedInitialPage, options.initialPage]);

  useEffect(() => {
    if (previousInitialPageSizeRef.current !== options.initialPageSize) {
      previousInitialPageSizeRef.current = options.initialPageSize;
      setPageSize(normalizedInitialPageSize);
    }
  }, [normalizedInitialPageSize, options.initialPageSize]);

  useReturnAutoRefresh({
    enabled: returns.some((item) => shouldAutoRefreshRefundState(item.refundStatus)),
    onRefresh: () => {
      void load('background');
    },
  });

  const runReviewAction = useCallback(async (
    returnId: number,
    request: () => Promise<{ success: boolean; message?: string; messageKey?: string; code?: string }>,
    options?: { closeOnSuccess?: boolean },
  ) => {
    const closeOnSuccess = options?.closeOnSuccess ?? true;
    try {
      const result = await request();
      const activeReturn =
        (selectedReturn?.returnId === returnId ? selectedReturn : null) ??
        returns.find((item) => item.returnId === returnId) ??
        null;
      showToast({
        type: 'success',
        title: result.messageKey
          ? t(result.messageKey, {
            defaultValue: result.message || resolveText('feedback.processError', 'Không thể xử lý yêu cầu.'),
          })
          : result.message || resolveText('feedback.processError', 'Không thể xử lý yêu cầu.'),
      });
      dispatchReturnSummaryChanged({
        orderId: activeReturn?.orderId,
        returnRequestId: activeReturn?.returnId ?? returnId,
      });
      if (closeOnSuccess) {
        setSelectedReturn(null);
      }
      await load('background');
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
  }, [load, resolveText, returns, selectedReturn, showToast, t]);

  const ensureReturnWorkflowAccess = useCallback(() => {
    if (canManageReturnWorkflow) {
      return;
    }

    throw createForbiddenActionError(
      resolveText('feedback.returnWorkflowForbidden', 'Bạn không có quyền xử lý quy trình trả hàng.'),
      'feedback.returnWorkflowForbidden',
    );
  }, [canManageReturnWorkflow, resolveText]);

  const ensureRefundWorkflowAccess = useCallback(() => {
    if (canManageRefundWorkflow) {
      return;
    }

    throw createForbiddenActionError(
      resolveText('feedback.refundWorkflowForbidden', 'Chỉ quản trị viên được phép xử lý bước hoàn tiền.'),
      'feedback.refundWorkflowForbidden',
    );
  }, [canManageRefundWorkflow, resolveText]);

  const reviewActions = useMemo<AdminReturnReviewActions>(() => ({
    acceptForRefund: (returnId) =>
      runReviewAction(
        returnId,
        () => {
          ensureReturnWorkflowAccess();
          return adminReturnReviewService.adminAcceptForRefund(returnId);
        },
        { closeOnSuccess: false },
      ),
    approve: (returnId) => runReviewAction(returnId, () => {
      ensureReturnWorkflowAccess();
      return adminReturnReviewService.adminApprove(returnId);
    }),
    markInTransit: (returnId) => runReviewAction(returnId, () => {
      ensureReturnWorkflowAccess();
      return adminReturnReviewService.adminMarkInTransit(returnId);
    }),
    markReceived: (returnId) => runReviewAction(returnId, () => {
      ensureReturnWorkflowAccess();
      return adminReturnReviewService.adminMarkReceived(returnId);
    }),
    reject: (returnId, note) => runReviewAction(returnId, () => {
      ensureReturnWorkflowAccess();
      return adminReturnReviewService.adminReject(returnId, note);
    }),
    refund: (returnId, payload: CompleteBankRefundPayload) =>
      runReviewAction(returnId, () => {
        ensureRefundWorkflowAccess();
        return adminReturnReviewService.adminCompleteRefund(returnId, payload);
      }),
    sendBankInfoReminder: (returnId) =>
      runReviewAction(
        returnId,
        () => {
          ensureRefundWorkflowAccess();
          return adminReturnReviewService.adminSendBankInfoReminder(returnId);
        },
        { closeOnSuccess: false },
      ),
    setRefundFailed: (returnId, note) =>
      runReviewAction(
        returnId,
        () => {
          ensureRefundWorkflowAccess();
          return adminReturnReviewService.adminSetRefundFailed(returnId, note);
        },
        { closeOnSuccess: false },
      ),
    setRefundManualReview: (returnId, note) =>
      runReviewAction(
        returnId,
        () => {
          ensureRefundWorkflowAccess();
          return adminReturnReviewService.adminSetRefundManualReview(returnId, note);
        },
        { closeOnSuccess: false },
      ),
    setRefundPending: (returnId) =>
      runReviewAction(
        returnId,
        () => {
          ensureRefundWorkflowAccess();
          return adminReturnReviewService.adminSetRefundPending(returnId);
        },
        { closeOnSuccess: false },
      ),
    setRefundProcessing: (returnId) =>
      runReviewAction(
        returnId,
        () => {
          ensureRefundWorkflowAccess();
          return adminReturnReviewService.adminSetRefundProcessing(returnId);
        },
        { closeOnSuccess: false },
      ),
  }), [
    ensureRefundWorkflowAccess,
    ensureReturnWorkflowAccess,
    runReviewAction,
  ]);

  const pendingCount = useMemo(
    () => statusCounts?.REQUESTED ?? returns.filter((item) => getStatusBucket(item) === 'REQUESTED').length,
    [getStatusBucket, returns, statusCounts],
  );

  const statusTabs = useMemo(() => statusFilters.map((filter) => ({
    key: filter.value,
    label: filter.label,
    count: statusCounts
      ? statusCounts[filter.value]
      : filter.value === 'ALL'
        ? totalReturns
        : returns.filter((item) => getStatusBucket(item) === filter.value).length,
  })), [getStatusBucket, returns, statusFilters, statusCounts, totalReturns]);

  const changeStatusFilter = useCallback((nextFilter: ReturnStatusFilter) => {
    setStatusFilter(nextFilter);
    setPage(1);
  }, []);

  const changeSearch = useCallback((nextSearch: string) => {
    setSearch(nextSearch);
    setPage(1);
  }, []);

  const changeSort = useCallback((nextSort: ReturnSortValue) => {
    setSort(nextSort);
    setPage(1);
  }, []);

  const changePageSize = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
  }, []);

  return {
    canManageRefundWorkflow,
    canManageReturnWorkflow,
    changePageSize,
    changeSearch,
    changeSort,
    changeStatusFilter,
    isRefreshing,
    loading,
    page,
    pageSize,
    pendingCount,
    reviewActions,
    returns,
    search,
    selectedReturn,
    setPage,
    setSelectedReturn,
    sort,
    statusFilter,
    statusTabs,
    totalPages,
    t,
  };
};
