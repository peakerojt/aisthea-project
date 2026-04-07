import React from 'react';
import {
  AlertCircle,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  AdminActionButton,
  AdminBadge,
  AdminEmptyState,
  AdminPageHeader,
  AdminPageShell,
  AdminSectionCard,
  AdminStatCards,
  AdminStatusFilterBar,
  AdminToolbar,
  adminUiTokens,
} from '@/admin/components/AdminUI';
import { notificationQueueService } from '@/admin/services/notifications.service';
import { useAuth } from '@/common/contexts/AuthContext';
import type { AdminEmailJobRecord, EmailJobStatus } from '@/admin/api/notifications.api';

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const STATUS_FILTERS = ['ALL', 'PENDING', 'PROCESSING', 'FAILED', 'SENT'] as const;
const CLEANUP_TERMINAL_STATUSES = ['FAILED', 'SENT'] as const;
const EVENT_TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả sự kiện' },
  { value: 'AUTH_VERIFICATION', label: 'Xác minh email' },
  { value: 'AUTH_PASSWORD_RESET', label: 'Đặt lại mật khẩu' },
  { value: 'ORDER_PLACED', label: 'Đơn hàng mới' },
  { value: 'ORDER_STATUS_UPDATED', label: 'Cập nhật trạng thái đơn' },
  { value: 'REFUND_ACCEPTED_BANK_INFO_REQUIRED', label: 'Nhắc bổ sung ngân hàng' },
  { value: 'REFUND_ACCEPTED_AWAITING_PAYOUT', label: 'Refund chờ chuyển khoản' },
  { value: 'REFUND_COMPLETED_BENEFIT_ISSUED', label: 'Refund hoàn tất' },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];
type EventTypeFilter = (typeof EVENT_TYPE_OPTIONS)[number]['value'];

const parseStatusFilter = (value: string | null): StatusFilter =>
  value && STATUS_FILTERS.includes(value as StatusFilter) ? (value as StatusFilter) : 'ALL';

const parseEventTypeFilter = (value: string | null): EventTypeFilter =>
  value && EVENT_TYPE_OPTIONS.some((option) => option.value === value)
    ? (value as EventTypeFilter)
    : 'ALL';

const parsePositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const STATUS_BADGE_TONE: Record<EmailJobStatus, 'warning' | 'info' | 'danger' | 'success'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  FAILED: 'danger',
  SENT: 'success',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  AUTH_VERIFICATION: 'Xác minh email',
  AUTH_PASSWORD_RESET: 'Đặt lại mật khẩu',
  ORDER_PLACED: 'Đơn hàng mới',
  ORDER_STATUS_UPDATED: 'Trạng thái đơn hàng',
  REFUND_ACCEPTED_BANK_INFO_REQUIRED: 'Nhắc bổ sung ngân hàng',
  REFUND_ACCEPTED_AWAITING_PAYOUT: 'Refund chờ xử lý',
  REFUND_COMPLETED_BENEFIT_ISSUED: 'Refund hoàn tất',
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatEventTypeLabel = (value: string) => EVENT_TYPE_LABELS[value] ?? value;

const resolveStatusLabel = (value: EmailJobStatus) => {
  switch (value) {
    case 'PENDING':
      return 'Đang chờ';
    case 'PROCESSING':
      return 'Đang gửi';
    case 'FAILED':
      return 'Thất bại';
    case 'SENT':
      return 'Đã gửi';
    default:
      return value;
  }
};

const hasPermissionCode = (permissionCodes: string[] | undefined, code: string) =>
  (permissionCodes ?? []).some((permissionCode) => permissionCode.trim().toUpperCase() === code);

export const EmailQueue: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = parseStatusFilter(searchParams.get('status'));
  const initialEventType = parseEventTypeFilter(searchParams.get('eventType'));
  const initialSearch = searchParams.get('q') ?? '';
  const initialPage = parsePositiveInt(searchParams.get('page'), 1);
  const initialPageSize = parsePositiveInt(searchParams.get('pageSize'), 20);
  const [items, setItems] = React.useState<AdminEmailJobRecord[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>(initialStatus);
  const [eventTypeFilter, setEventTypeFilter] = React.useState<EventTypeFilter>(initialEventType);
  const [search, setSearch] = React.useState(initialSearch);
  const [searchInput, setSearchInput] = React.useState(initialSearch);
  const [page, setPage] = React.useState(initialPage);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);
  const [summary, setSummary] = React.useState<{ total: number; byStatus: Partial<Record<EmailJobStatus, number>>; byEventType: Record<string, number> }>({
    total: 0,
    byStatus: {},
    byEventType: {},
  });
  const [loading, setLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [busyJobId, setBusyJobId] = React.useState<number | null>(null);
  const [cleanupBusy, setCleanupBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const requestIdRef = React.useRef(0);
  const hasLoadedRef = React.useRef(false);
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const permissionCodes = React.useMemo(
    () => (user?.permissions ?? []).map((permission) => permission.trim().toUpperCase()),
    [user?.permissions],
  );
  const canManageQueue = React.useMemo(() => {
    const roles = (user?.roles ?? []).map((role) => role.trim().toLowerCase());
    return (
      roles.includes('admin')
      || roles.includes('super admin')
      || hasPermissionCode(permissionCodes, 'MANAGE_NOTIFICATION_QUEUE')
    );
  }, [permissionCodes, user?.roles]);

  const loadEmailJobs = React.useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isFirstLoad = !hasLoadedRef.current;

    if (isFirstLoad) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError(null);

    try {
      const data = await notificationQueueService.list({
        status: statusFilter === 'ALL' ? 'ALL' : statusFilter,
        eventType: eventTypeFilter === 'ALL' ? undefined : eventTypeFilter,
        search: search || undefined,
        page,
        pageSize,
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      setItems(data.items);
      setPage(data.page);
      setPageSize(data.pageSize);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setSummary(data.summary);
      hasLoadedRef.current = true;
    } catch (requestError) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      const errorObject = requestError as { message?: string };
      setError(errorObject.message || 'Không thể tải hàng đợi email.');
    } finally {
      if (requestIdRef.current !== requestId) {
        return;
      }

      if (isFirstLoad) {
        setLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, [eventTypeFilter, page, pageSize, search, statusFilter]);

  React.useEffect(() => {
    void loadEmailJobs();
  }, [loadEmailJobs]);

  React.useEffect(() => () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
  }, []);

  React.useEffect(() => {
    const nextStatus = parseStatusFilter(searchParams.get('status'));
    const nextEventType = parseEventTypeFilter(searchParams.get('eventType'));
    const nextSearch = searchParams.get('q') ?? '';
    const nextPage = parsePositiveInt(searchParams.get('page'), 1);
    const nextPageSize = parsePositiveInt(searchParams.get('pageSize'), 20);

    setStatusFilter((current) => (current === nextStatus ? current : nextStatus));
    setEventTypeFilter((current) => (current === nextEventType ? current : nextEventType));
    setSearch((current) => (current === nextSearch ? current : nextSearch));
    setSearchInput((current) => (current === nextSearch ? current : nextSearch));
    setPage((current) => (current === nextPage ? current : nextPage));
    setPageSize((current) => (current === nextPageSize ? current : nextPageSize));
  }, [searchParams]);

  React.useEffect(() => {
    const nextSearchParams = new URLSearchParams();

    if (statusFilter !== 'ALL') {
      nextSearchParams.set('status', statusFilter);
    }
    if (eventTypeFilter !== 'ALL') {
      nextSearchParams.set('eventType', eventTypeFilter);
    }
    if (search) {
      nextSearchParams.set('q', search);
    }
    if (page > 1) {
      nextSearchParams.set('page', page.toString());
    }
    if (pageSize !== 20) {
      nextSearchParams.set('pageSize', pageSize.toString());
    }

    if (nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams);
    }
  }, [eventTypeFilter, page, pageSize, search, searchParams, setSearchParams, statusFilter]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setSearchInput(nextValue);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setSearch(nextValue);
      setPage(1);
    }, 350);
  };

  const handleRetry = async (emailJobId: number) => {
    if (!canManageQueue) {
      return;
    }

    setBusyJobId(emailJobId);
    setNotice(null);
    setError(null);

    try {
      await notificationQueueService.retry(emailJobId);
      setNotice(`Đã đưa email job #${emailJobId} về hàng chờ.`);
      await loadEmailJobs();
    } catch (requestError) {
      const errorObject = requestError as { message?: string };
      setError(errorObject.message || 'Không thể retry email job.');
    } finally {
      setBusyJobId(null);
    }
  };

  const handleCleanup = async () => {
    if (!canManageQueue) {
      return;
    }

    setCleanupBusy(true);
    setNotice(null);
    setError(null);

    try {
      const result = await notificationQueueService.cleanup({
        olderThanDays: 30,
        statuses: [...CLEANUP_TERMINAL_STATUSES],
      });
      setNotice(`Đã dọn ${result.deletedCount} email job cũ hơn ${result.olderThanDays} ngày.`);
      await loadEmailJobs();
    } catch (requestError) {
      const errorObject = requestError as { message?: string };
      setError(errorObject.message || 'Không thể dọn email job cũ.');
    } finally {
      setCleanupBusy(false);
    }
  };

  const handleRefresh = () => {
    void loadEmailJobs();
  };

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setEventTypeFilter('ALL');
    setSearch('');
    setSearchInput('');
    setPage(1);
    setNotice(null);
  };

  const statusTabs = React.useMemo(
    () => STATUS_FILTERS.map((status) => ({
      key: status,
      label:
        status === 'ALL'
          ? 'Tất cả'
          : resolveStatusLabel(status),
      count:
        status === 'ALL'
          ? summary.total
          : summary.byStatus[status as EmailJobStatus] ?? 0,
    })),
    [summary.byStatus, summary.total],
  );

  const statCards = React.useMemo(
    () => [
      {
        key: 'total',
        label: 'Tổng queue',
        value: summary.total,
        hint: `${items.length} job đang hiển thị`,
        icon: Mail,
        tone: 'primary' as const,
      },
      {
        key: 'pending',
        label: 'Đang chờ',
        value: summary.byStatus.PENDING ?? 0,
        hint: 'Sẵn sàng được worker lấy',
        icon: RefreshCw,
        tone: 'warning' as const,
      },
      {
        key: 'processing',
        label: 'Đang gửi',
        value: summary.byStatus.PROCESSING ?? 0,
        hint: 'Worker đang xử lý',
        icon: ShieldAlert,
        tone: 'info' as const,
      },
      {
        key: 'failed',
        label: 'Thất bại',
        value: summary.byStatus.FAILED ?? 0,
        hint: 'Có thể retry thủ công',
        icon: AlertCircle,
        tone: 'danger' as const,
      },
    ],
    [items.length, summary.byStatus, summary.total],
  );

  const hasFilters = statusFilter !== 'ALL' || eventTypeFilter !== 'ALL' || !!search;
  const rangeStart = total === 0 ? 0 : ((page - 1) * pageSize) + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  return (
    <AdminPageShell>
      <AdminSectionCard bodyClassName="space-y-5 p-5 lg:p-6">
        <AdminPageHeader
          icon={Mail}
          title="Email Queue"
          subtitle="Theo dõi email chờ gửi, job lỗi và thao tác recovery thủ công."
          meta={`${summary.byStatus.FAILED ?? 0} job lỗi cần theo dõi`}
          actions={canManageQueue ? (
            <AdminActionButton type="button" tone="danger" size="md" onClick={handleCleanup} disabled={cleanupBusy}>
              <Trash2 size={14} />
              {cleanupBusy ? 'Đang dọn...' : 'Dọn job cũ'}
            </AdminActionButton>
          ) : undefined}
        />

        <AdminStatCards items={statCards} />

        <AdminToolbar
          actions={(
            <>
              <AdminActionButton type="button" tone="info" size="md" onClick={handleRefresh}>
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                Làm mới
              </AdminActionButton>
              {hasFilters && (
                <AdminActionButton type="button" tone="default" size="md" onClick={handleResetFilters}>
                  Xóa lọc
                </AdminActionButton>
              )}
            </>
          )}
        >
          <div className="grid w-full gap-3 md:grid-cols-3 xl:grid-cols-[minmax(280px,1.4fr)_minmax(200px,1fr)_minmax(140px,0.6fr)]">
            <label className="relative">
              <span className={adminUiTokens.fieldLabel}>Tìm kiếm</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-[38px] -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Event key, email người nhận hoặc lỗi gần nhất"
                className={adminUiTokens.searchFieldControl}
              />
            </label>

            <label>
              <span className={adminUiTokens.fieldLabel}>Loại sự kiện</span>
              <select
                value={eventTypeFilter}
                onChange={(event) => {
                  setEventTypeFilter(event.target.value as EventTypeFilter);
                  setPage(1);
                }}
                className={adminUiTokens.fieldControl}
              >
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#111318]">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={adminUiTokens.fieldLabel}>Mỗi trang</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className={adminUiTokens.fieldControl}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-[#111318]">
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </AdminToolbar>

        <AdminStatusFilterBar
          items={statusTabs}
          activeKey={statusFilter}
          onChange={(key) => {
            setStatusFilter(key as StatusFilter);
            setPage(1);
          }}
          isRefreshing={isRefreshing && !loading}
          refreshLabel="Đang đồng bộ queue"
        />

        {notice && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {notice}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </AdminSectionCard>

      <AdminSectionCard className="flex min-h-0 flex-1 flex-col" bodyClassName="flex min-h-0 flex-1 flex-col">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-primary" />
              <p className="text-sm text-white/45">Đang tải email queue...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <AdminEmptyState
            icon={Mail}
            title="Không có email job nào khớp bộ lọc."
            description="Thử thay đổi trạng thái hoặc từ khóa tìm kiếm."
          />
        ) : (
          <>
            <div className="border-b border-white/[0.06] px-5 py-3 text-xs text-white/45 lg:px-6">
              Hiển thị {rangeStart}-{rangeEnd} / {total} job
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-[1180px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Sự kiện', 'Người nhận', 'Trạng thái', 'Lịch gửi', 'Lần thử', 'Provider', 'Lỗi gần nhất', 'Thao tác'].map((label, index) => (
                      <th
                        key={label}
                        className={`sticky top-0 z-10 bg-[#111319] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/34 ${
                          index === 7 ? 'sticky right-0 z-20 text-right' : ''
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.emailJobId} className="border-b border-white/[0.04] align-top transition-colors hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-white">{formatEventTypeLabel(item.eventType)}</div>
                          <div className="font-mono text-[11px] text-white/45">{item.eventKey}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-white/88">{item.recipient}</div>
                        <div className="mt-1 text-[11px] text-white/42">Job #{item.emailJobId}</div>
                      </td>
                      <td className="px-5 py-4">
                        <AdminBadge tone={STATUS_BADGE_TONE[item.status]} dot className="uppercase tracking-[0.14em]">
                          {resolveStatusLabel(item.status)}
                        </AdminBadge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-sm text-white/78">
                          <div>Schedule: {formatDateTime(item.scheduledAt)}</div>
                          <div className="text-[11px] text-white/42">Updated: {formatDateTime(item.updatedAt)}</div>
                          <div className="text-[11px] text-white/42">Sent: {formatDateTime(item.sentAt)}</div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-white">{item.attempts}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-white/78">{item.provider ?? '—'}</div>
                        <div className="mt-1 text-[11px] text-white/42">{item.providerMessageId ?? 'Chưa có message id'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="max-w-[320px] text-sm leading-relaxed text-white/68">
                          {item.lastError ?? 'Không có lỗi gần nhất'}
                        </div>
                      </td>
                      <td className="sticky right-0 bg-[#0f1014] px-5 py-4 text-right">
                        <AdminActionButton
                          type="button"
                          tone="warning"
                          size="sm"
                          onClick={() => {
                            void handleRetry(item.emailJobId);
                          }}
                          disabled={!canManageQueue || item.status !== 'FAILED' || busyJobId === item.emailJobId}
                        >
                          <RotateCcw size={13} />
                          {busyJobId === item.emailJobId ? 'Đang retry...' : 'Retry'}
                        </AdminActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-xs text-white/42">Trang {page} / {totalPages}</p>
            <div className="flex items-center gap-2">
              <AdminActionButton
                type="button"
                size="sm"
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={page <= 1}
              >
                Trước
              </AdminActionButton>
              <AdminActionButton
                type="button"
                size="sm"
                onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                disabled={page >= totalPages}
              >
                Sau
              </AdminActionButton>
            </div>
          </div>
        )}
      </AdminSectionCard>
    </AdminPageShell>
  );
};
