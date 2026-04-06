import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminReturnReviewActions } from '@/admin/services/types';
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

const PAGE_SIZE = 15;

type UseAdminReturnsOptions = {
  initialStatusFilter?: ReturnStatusFilter;
  initialPage?: number;
};

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
  const normalizedInitialPage = Number.isFinite(options.initialPage) && (options.initialPage ?? 0) > 0
    ? Math.floor(options.initialPage as number)
    : 1;
  const [statusFilter, setStatusFilter] = useState<ReturnStatusFilter>(options.initialStatusFilter ?? 'ALL');
  const [page, setPage] = useState(normalizedInitialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReturn, setSelectedReturn] = useState<OrderReturn | null>(null);
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);
  const previousInitialStatusFilterRef = useRef<ReturnStatusFilter | undefined>(options.initialStatusFilter);
  const previousInitialPageRef = useRef<number | undefined>(options.initialPage);

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
      const data = await adminReturnReviewService.list({ status: statusFilter, page, pageSize: PAGE_SIZE });
      if (requestIdRef.current !== requestId) return;

      setReturns(data.returns);
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
      } else {
        setIsRefreshing(false);
      }
    }
  }, [page, showToast, statusFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (previousInitialStatusFilterRef.current !== options.initialStatusFilter) {
      previousInitialStatusFilterRef.current = options.initialStatusFilter;
      setStatusFilter(options.initialStatusFilter ?? 'ALL');
    }
  }, [options.initialStatusFilter]);

  useEffect(() => {
    if (previousInitialPageRef.current !== options.initialPage) {
      previousInitialPageRef.current = options.initialPage;
      setPage(normalizedInitialPage);
    }
  }, [normalizedInitialPage, options.initialPage]);

  useReturnAutoRefresh({
    enabled: returns.some((item) => shouldAutoRefreshRefundState(item.refundStatus)),
    onRefresh: () => {
      void load();
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
    () => returns.filter((item) => getStatusBucket(item) === 'REQUESTED').length,
    [getStatusBucket, returns],
  );

  const statusTabs = useMemo(() => statusFilters.map((filter) => ({
    key: filter.value,
    label: filter.label,
    count: filter.value === 'ALL'
      ? returns.length
      : returns.filter((item) => getStatusBucket(item) === filter.value).length,
  })), [getStatusBucket, returns, statusFilters]);

  const changeStatusFilter = useCallback((nextFilter: ReturnStatusFilter) => {
    setStatusFilter(nextFilter);
    setPage(1);
  }, []);

  return {
    canManageRefundWorkflow,
    canManageReturnWorkflow,
    changeStatusFilter,
    isRefreshing,
    loading,
    page,
    pendingCount,
    reviewActions,
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
