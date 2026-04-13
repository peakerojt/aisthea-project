import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/common/contexts/ToastContext';
import {
    Search, Users, AlertCircle, Loader2, Shield,
    ShieldCheck, ChevronLeft, ChevronRight, FilterX,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
    AdminEmptyState,
    AdminRefreshButton,
    AdminModalShell,
    AdminPageHeader,
    AdminPageShell,
    AdminPrimaryButton,
    AdminRefreshState,
    AdminSecondaryButton,
    AdminSectionCard,
    AdminToolbar,
    adminUiTokens,
} from '@/admin/components/AdminUI';
import {
    AdminUser,
    fetchAdminUsers,
    patchUserStatus,
    patchUserRole,
    getRoleDisplayName,
    getRoleLabel,
    isAssignableAdminRole,
    STATUS_LABELS,
    type FetchAdminUsersParams,
} from '@/common/services/user-admin.service';
import { UserActionMenu } from '@/admin/components/UserActionMenu';
import { getImageUrl } from '@/common/utils/cloudinary';
import { roleService, type RoleItem } from '@/admin/services/role.service';

const PAGE_SIZE_OPTIONS = [8, 10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 8;

const parsePositiveInt = (value: string | null, fallback: number) => {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getVisiblePages = (page: number, totalPages: number) => {
    const maxVisible = 5;
    const start = Math.max(1, Math.min(page - 2, totalPages - (maxVisible - 1)));
    return Array.from(
        { length: Math.min(maxVisible, totalPages) },
        (_, index) => start + index,
    );
};

// ─── Avatar Helpers ────────────────────────────────────────────────────────────

function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join('');
}

const AVATAR_COLORS = [
    'bg-cyan-600',
    'bg-blue-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-sky-600',
    'bg-teal-600',
];

function getAvatarColor(userId: number): string {
    return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

function getAssignableRoleDisplayName(role: Pick<RoleItem, 'roleName' | 'displayName'>) {
    return role.displayName ?? getRoleDisplayName(role.roleName);
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────

function RoleBadge({ roleName }: { roleName: string }) {
    const { t } = useTranslation(['customers']);
    const displayRoleName = getRoleDisplayName(roleName);
    const styles: Record<string, string> = {
        Admin: 'bg-teal-500/15 text-teal-300 border-teal-500/25',
        Customer: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
        Staff: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    };
    const cls = styles[displayRoleName] ?? 'bg-white/5 text-white/40 border-white/10';
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wide ${cls}`}>
            {t(`role.labels.${displayRoleName.toLowerCase()}`, { defaultValue: getRoleLabel(roleName) })}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const { t } = useTranslation(['customers']);
    if (status === 'Banned') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-[11px] font-bold uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                {t('status.banned')}
            </span>
        );
    }
    if (status === 'Active') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                {t('status.active')}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/40 text-[11px] font-bold uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-white/30 inline-block" />
            {t(`status.${status.toLowerCase()}`, { defaultValue: STATUS_LABELS[status] ?? status })}
        </span>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export const Customers: React.FC = () => {
    const { t } = useTranslation(['customers']);
    const { showToast: fireToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialSearch = searchParams.get('q') ?? '';
    const initialRoleFilter = searchParams.get('role') ?? 'all';
    const initialStatusFilter = searchParams.get('status') ?? 'all';
    const initialPage = parsePositiveInt(searchParams.get('page'), 1);
    const initialPageSize = parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);
    const requestIdRef = useRef(0);

    // Filters
    const [searchInput, setSearchInput] = useState(initialSearch);
    const [search, setSearch] = useState(initialSearch);
    const [roleFilter, setRoleFilter] = useState(initialRoleFilter);
    const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
    const [page, setPage] = useState(initialPage);
    const [pageSize, setPageSize] = useState(initialPageSize);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Modals
    const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
    const [banLoading, setBanLoading] = useState(false);

    const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const [roleLoading, setRoleLoading] = useState(false);
    const [availableRoles, setAvailableRoles] = useState<RoleItem[]>([]);

    // Debounce search
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSearchChange = (v: string) => {
        setSearchInput(v);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearch(v);
            setPage(1);
        }, 500);
    };

    // ─── Data loading ─────────────────────────────────────────────────────────
    const loadUsers = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        const isFirstLoad = !hasLoadedRef.current;
        if (isFirstLoad) setLoading(true);
        else setIsRefreshing(true);
        setError(null);
        try {
            const result = await fetchAdminUsers({
                search: search || undefined,
                role: roleFilter !== 'all' ? roleFilter : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                page,
                limit: pageSize,
            });
            if (requestIdRef.current !== requestId) return;
            setUsers(result.users);
            setTotal(result.pagination.total);
            setTotalPages(result.pagination.totalPages);
            hasLoadedRef.current = true;
        } catch (error) {
            if (requestIdRef.current !== requestId) return;
            const e = error as Error | { message?: string; error?: string; data?: unknown };
            setError(e.message || t('feedback.loadError'));
        } finally {
            if (requestIdRef.current !== requestId) return;
            if (isFirstLoad) setLoading(false);
            else setIsRefreshing(false);
        }
    }, [page, pageSize, roleFilter, search, statusFilter, t]);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    useEffect(() => () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
    }, []);

    useEffect(() => {
        const nextSearch = searchParams.get('q') ?? '';
        const nextRoleFilter = searchParams.get('role') ?? 'all';
        const nextStatusFilter = searchParams.get('status') ?? 'all';
        const nextPage = parsePositiveInt(searchParams.get('page'), 1);
        const nextPageSize = parsePositiveInt(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE);

        setSearch((current) => (current === nextSearch ? current : nextSearch));
        setSearchInput((current) => (current === nextSearch ? current : nextSearch));
        setRoleFilter((current) => (current === nextRoleFilter ? current : nextRoleFilter));
        setStatusFilter((current) => (current === nextStatusFilter ? current : nextStatusFilter));
        setPage((current) => (current === nextPage ? current : nextPage));
        setPageSize((current) => (current === nextPageSize ? current : nextPageSize));
    }, [searchParams]);

    useEffect(() => {
        const nextSearchParams = new URLSearchParams();
        if (search) nextSearchParams.set('q', search);
        if (roleFilter !== 'all') nextSearchParams.set('role', roleFilter);
        if (statusFilter !== 'all') nextSearchParams.set('status', statusFilter);
        if (page > 1) nextSearchParams.set('page', page.toString());
        if (pageSize !== DEFAULT_PAGE_SIZE) nextSearchParams.set('pageSize', pageSize.toString());

        if (nextSearchParams.toString() !== searchParams.toString()) {
            setSearchParams(nextSearchParams);
        }
    }, [page, pageSize, roleFilter, search, searchParams, setSearchParams, statusFilter]);

    useEffect(() => {
        let cancelled = false;

        const loadAvailableRoles = async () => {
            try {
                const roles = await roleService.getRoles();
                if (!cancelled) {
                    setAvailableRoles(
                        roles.filter(
                            (role) =>
                                (role.assignable ?? isAssignableAdminRole(role.roleName)) &&
                                !role.isProtected,
                        ),
                    );
                }
            } catch {
                if (!cancelled) {
                    setAvailableRoles([]);
                }
            }
        };

        void loadAvailableRoles();

        return () => {
            cancelled = true;
        };
    }, []);

    // ─── Toast ────────────────────────────────────────────────────────────────
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        fireToast({ type, title: message });
    };

    // ─── Ban / Unban ──────────────────────────────────────────────────────────
    const handleBanToggle = (user: AdminUser) => {
        setBanTarget(user);
    };

    const handleConfirmBan = async () => {
        if (!banTarget) return;
        setBanLoading(true);
        try {
            const res = await patchUserStatus(banTarget.userId);
            showToast(res.message || t('feedback.statusUpdated'), 'success');
            setBanTarget(null);
            await loadUsers();
        } catch (error) {
            const e = error as Error | { message?: string; error?: string; data?: unknown };
            showToast(e.message || t('feedback.statusError'), 'error');
            setBanTarget(null);
        } finally {
            setBanLoading(false);
        }
    };

    // ─── Role Change ──────────────────────────────────────────────────────────
    const handleChangeRole = (user: AdminUser) => {
        setRoleTarget(user);
        setSelectedRoleId(user.roles[0]?.roleId ?? null);
    };

    const handleConfirmRole = async () => {
        if (!roleTarget || selectedRoleId === null) return;
        setRoleLoading(true);
        try {
            const res = await patchUserRole(roleTarget.userId, selectedRoleId);
            showToast(res.message || t('feedback.roleUpdated'), 'success');
            setRoleTarget(null);
            await loadUsers();
        } catch (error) {
            const e = error as Error | { message?: string; error?: string; data?: unknown };
            showToast(e.message || t('feedback.roleError'), 'error');
            setRoleTarget(null);
        } finally {
            setRoleLoading(false);
        }
    };

    // ─── Format date ──────────────────────────────────────────────────────────
    const formatDate = (iso: string | null) => {
        if (!iso) return '—';
        const d = new Date(iso);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    const fallbackAssignableRoles: RoleItem[] = users
        .flatMap((user) => user.roles)
        .filter((role, index, allRoles) =>
            isAssignableAdminRole(role.roleName) &&
            allRoles.findIndex((candidate) => candidate.roleId === role.roleId) === index,
        )
        .map((role) => ({
            roleId: role.roleId,
            roleName: role.roleName,
            displayName: getRoleDisplayName(role.roleName),
            isProtected: false,
            assignable: true,
            permissionIds: [],
        }));

    const assignableRoles = availableRoles.length > 0 ? availableRoles : fallbackAssignableRoles;
    const hasFilters = !!search || roleFilter !== 'all' || statusFilter !== 'all';
    const rangeStart = total === 0 ? 0 : ((page - 1) * pageSize) + 1;
    const rangeEnd = Math.min(total, page * pageSize);
    const visiblePages = getVisiblePages(page, totalPages);

    const refreshUsers = useCallback(async () => {
        setIsManualRefreshing(true);
        try {
            await loadUsers();
        } finally {
            setIsManualRefreshing(false);
        }
    }, [loadUsers]);

    const handleClearFilters = () => {
        setSearch('');
        setSearchInput('');
        setRoleFilter('all');
        setStatusFilter('all');
        setPage(1);
        setPageSize(DEFAULT_PAGE_SIZE);
    };

    const updateFilters = (next: Partial<Pick<FetchAdminUsersParams, 'role' | 'status'>>) => {
        if (typeof next.role === 'string') {
            setRoleFilter(next.role);
        }
        if (typeof next.status === 'string') {
            setStatusFilter(next.status);
        }
        setPage(1);
    };

    const pageControls = (
        <div className="space-y-5 border-b border-white/5 p-5 lg:p-6">
            <AdminPageHeader
                icon={Users}
                title={t('page.title')}
                meta={loading ? t('page.loading') : t('page.userCount', { count: total })}
            />

            <AdminToolbar
                actions={(
                    <>
                        <AdminRefreshButton
                            type="button"
                            onClick={refreshUsers}
                            isRefreshing={isManualRefreshing}
                            disabled={loading || isRefreshing || isManualRefreshing}
                            label={t('actions.refresh', { defaultValue: 'Làm mới' })}
                        />
                        {hasFilters && (
                            <AdminSecondaryButton type="button" onClick={handleClearFilters}>
                                <FilterX size={14} />
                                {t('actions.reset', { defaultValue: 'Đặt lại' })}
                            </AdminSecondaryButton>
                        )}
                    </>
                )}
            >
                <div className="relative group flex-1 min-w-[240px] max-w-sm">
                    <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white/60 transition-colors"
                        size={16}
                    />
                    <input
                        type="text"
                        placeholder={t('filters.searchPlaceholder')}
                        value={searchInput}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className={adminUiTokens.searchFieldControl}
                    />
                </div>

                <div className="relative">
                    <select
                        value={roleFilter}
                        onChange={(e) => updateFilters({ role: e.target.value })}
                        className={`appearance-none cursor-pointer pl-4 pr-9 ${adminUiTokens.fieldControl}`}
                    >
                        <option value="all">{t('filters.allRoles')}</option>
                        {assignableRoles.map((role) => (
                            <option key={role.roleId} value={role.roleName}>
                                {t(`role.labels.${getAssignableRoleDisplayName(role).toLowerCase()}`, {
                                    defaultValue: role.displayName ?? getRoleLabel(role.roleName),
                                })}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => updateFilters({ status: e.target.value })}
                        className={`appearance-none cursor-pointer pl-4 pr-9 ${adminUiTokens.fieldControl}`}
                    >
                        <option value="all">{t('filters.allStatuses')}</option>
                        <option value="Active">{t('filters.statusActive')}</option>
                        <option value="Banned">{t('filters.statusBanned')}</option>
                        <option value="Pending">{t('filters.statusPending')}</option>
                    </select>
                </div>

                <div className="relative">
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setPage(1);
                        }}
                        className={`appearance-none cursor-pointer pl-4 pr-9 ${adminUiTokens.fieldControl}`}
                    >
                        {PAGE_SIZE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                                {t('pagination.perPageOption', { count: option, defaultValue: `${option} / trang` })}
                            </option>
                        ))}
                    </select>
                </div>
            </AdminToolbar>

            <AdminRefreshState
                isRefreshing={isRefreshing && !loading}
                label={t('page.loading')}
            />
        </div>
    );

    return (
        <AdminPageShell className="relative min-h-full">
            {/* ── Ban Confirmation Dialog ───────────────────────────────────── */}
            {banTarget && (
                <AdminModalShell
                    icon={Shield}
                    iconWrapperClassName="border-red-500/20 bg-red-500/10 text-red-400 rounded-full"
                    iconClassName="text-red-400"
                    title={banTarget.status === 'Banned' ? t('ban.titleUnban') : t('ban.titleBan')}
                    subtitle={banTarget.fullName}
                    onClose={() => !banLoading && setBanTarget(null)}
                    maxWidthClassName="max-w-md"
                    bodyClassName="space-y-5 p-6"
                    footer={(
                        <div className="flex justify-end gap-3">
                            <AdminSecondaryButton
                                onClick={() => setBanTarget(null)}
                                disabled={banLoading}
                                className="px-5 py-2.5"
                            >
                                {t('ban.cancel')}
                            </AdminSecondaryButton>
                            <AdminPrimaryButton
                                onClick={handleConfirmBan}
                                disabled={banLoading}
                                className="bg-red-600 px-5 py-2.5 shadow-lg shadow-red-900/30 hover:bg-red-700"
                            >
                                {banLoading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                                {banLoading ? t('ban.processing') : banTarget.status === 'Banned' ? t('ban.actionUnban') : t('ban.actionBan')}
                            </AdminPrimaryButton>
                        </div>
                    )}
                >
                        <div className="bg-red-500/[0.05] border border-red-500/20 rounded-lg px-4 py-3 space-y-1">
                            <p className="text-sm font-semibold text-white">
                                {banTarget.status === 'Banned' ?
                                    t('ban.confirmUnban').replace('<1>', '').replace('</1>', '').replace('{{name}}', banTarget.fullName) :
                                    t('ban.confirmBan').replace('<1>', '').replace('</1>', '').replace('{{name}}', banTarget.fullName)}
                            </p>
                            {banTarget.status !== 'Banned' && (
                                <p className="text-xs text-red-300/70">
                                    {t('ban.warningBan')}
                                </p>
                            )}
                        </div>
                </AdminModalShell>
            )}

            {/* ── Role Management Modal ─────────────────────────────────────── */}
            {roleTarget && (
                <AdminModalShell
                    icon={ShieldCheck}
                    iconWrapperClassName="border-teal-500/20 bg-teal-500/10 text-teal-400"
                    iconClassName="text-teal-400"
                    title={t('role.title')}
                    subtitle={roleTarget.fullName}
                    onClose={() => !roleLoading && setRoleTarget(null)}
                    maxWidthClassName="max-w-sm"
                    bodyClassName="space-y-5 p-6"
                    footer={(
                        <div className="flex gap-3">
                            <AdminSecondaryButton
                                onClick={() => setRoleTarget(null)}
                                disabled={roleLoading}
                                className="flex-1 py-2.5"
                            >
                                {t('role.cancel')}
                            </AdminSecondaryButton>
                            <AdminPrimaryButton
                                onClick={handleConfirmRole}
                                disabled={roleLoading || selectedRoleId === null}
                                className="flex-1 py-2.5"
                            >
                                {roleLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                {roleLoading ? t('role.saving') : t('role.saveRole')}
                            </AdminPrimaryButton>
                        </div>
                    )}
                >
                        <div className="space-y-2">
                            {assignableRoles.map((r) => {
                                const displayRoleName = getAssignableRoleDisplayName(r);
                                const roleToneClass =
                                    displayRoleName === 'Admin'
                                        ? 'bg-teal-500/20 text-teal-300'
                                        : displayRoleName === 'Customer'
                                            ? 'bg-blue-500/20 text-blue-300'
                                            : 'bg-amber-500/20 text-amber-300';

                                return (
                                <button
                                    key={r.roleId}
                                    onClick={() => setSelectedRoleId(r.roleId)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${selectedRoleId === r.roleId
                                        ? 'border-primary/50 bg-primary/10 text-white'
                                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white/80'
                                        }`}
                                >
                                    <span>{t(`role.labels.${displayRoleName.toLowerCase()}`, { defaultValue: getRoleLabel(r.roleName) })}</span>
                                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${roleToneClass}`}>
                                        {displayRoleName.toUpperCase()}
                                    </span>
                                </button>
                                );
                            })}
                        </div>
                </AdminModalShell>
            )}

            {/* ── Loading ───────────────────────────────────────────────────── */}
            {loading && (
                <AdminSectionCard className="flex-1 overflow-hidden">
                    {pageControls}
                    <div className="flex h-full min-h-[420px] items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm text-white/40">{t('feedback.loadingList')}</p>
                    </div>
                    </div>
                </AdminSectionCard>
            )}

            {/* ── Error ─────────────────────────────────────────────────────── */}
            {error && !loading && (
                <AdminSectionCard className="flex-1 overflow-hidden">
                    {pageControls}
                    <div className="flex h-full min-h-[420px] items-center justify-center">
                    <div className="flex flex-col items-center gap-4 max-w-sm text-center">
                        <AlertCircle size={40} className="text-red-400" />
                        <div>
                            <h3 className="text-base font-bold text-white mb-1">{t('feedback.dataError')}</h3>
                            <p className="text-sm text-white/50">{error}</p>
                        </div>
                        <button
                            onClick={refreshUsers}
                            className="text-xs text-primary font-bold uppercase tracking-wider hover:underline cursor-pointer"
                        >
                            {t('feedback.retry')}
                        </button>
                    </div>
                    </div>
                </AdminSectionCard>
            )}

            {/* ── Table ─────────────────────────────────────────────────────── */}
            {!loading && !error && (
                <AdminSectionCard className="flex-1 overflow-hidden">
                    {pageControls}
                    {users.length === 0 ? (
                        <AdminEmptyState
                            icon={Users}
                            title={t('feedback.notFound')}
                            description={t('feedback.changeFilter')}
                        />
                    ) : (
                        <>

                        <div className="orders-table-scroll-region min-h-0 flex-1 overflow-y-auto overflow-x-auto min-h-[292px] lg:min-h-[352px]">
                            <table className="w-full text-left border-collapse">
                                <thead className={adminUiTokens.tableHeaderSurface}>
                                    <tr>
                                        <th className={`sticky top-0 z-10 bg-[#111319] px-6 py-4 ${adminUiTokens.tableHeader}`}>{t('table.customer')}</th>
                                        <th className={`sticky top-0 z-10 bg-[#111319] px-4 py-4 ${adminUiTokens.tableHeader}`}>{t('table.contact')}</th>
                                        <th className={`sticky top-0 z-10 bg-[#111319] px-4 py-4 ${adminUiTokens.tableHeader}`}>{t('table.role')}</th>
                                        <th className={`sticky top-0 z-10 bg-[#111319] px-4 py-4 ${adminUiTokens.tableHeader}`}>{t('table.status')}</th>
                                        <th className={`sticky top-0 z-10 bg-[#111319] px-4 py-4 ${adminUiTokens.tableHeader}`}>{t('table.orders')}</th>
                                        <th className={`sticky top-0 z-10 bg-[#111319] px-4 py-4 ${adminUiTokens.tableHeader}`}>{t('table.joined')}</th>
                                        <th className={`sticky top-0 z-10 bg-[#111319] px-4 py-4 text-right ${adminUiTokens.tableHeader}`}>{t('table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className={adminUiTokens.tableBody}>
                                    {users.map((user) => (
                                        <tr
                                            key={user.userId}
                                            className={`group ${adminUiTokens.tableRowSoft}`}
                                        >
                                            {/* Khách hàng */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    {/* Avatar */}
                                                    <div
                                                        className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${user.avatarUrl ? '' : getAvatarColor(user.userId)}`}
                                                    >
                                                        {user.avatarUrl ? (
                                                            <img
                                                                src={getImageUrl(user.avatarUrl)}
                                                                alt={user.fullName}
                                                                loading="lazy"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-xs font-bold text-white select-none">
                                                                {getInitials(user.fullName)}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Name + Email */}
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-semibold text-white truncate group-hover:text-primary transition-colors">
                                                            {user.fullName}
                                                        </span>
                                                        <span className="text-xs text-white/40 truncate">{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Liên hệ */}
                                            <td className="py-4 px-4 text-sm text-white/50 font-mono">
                                                {user.phone || '—'}
                                            </td>

                                            {/* Vai trò */}
                                            <td className="py-4 px-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {user.roles.length > 0 ? (
                                                        user.roles.map((r) => (
                                                            <RoleBadge key={r.roleId} roleName={r.roleName} />
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-white/30">{t('table.noRole')}</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Trạng thái */}
                                            <td className="py-4 px-4">
                                                <StatusBadge status={user.status} />
                                            </td>

                                            {/* Đơn hàng */}
                                            <td className="py-4 px-4 text-sm font-bold text-white">
                                                {user.totalOrders}
                                            </td>

                                            {/* Ngày tham gia */}
                                            <td className="py-4 px-4 text-sm text-white/40">
                                                {formatDate(user.createdAt)}
                                            </td>

                                            {/* Thao tác */}
                                            <td className="py-4 px-4 text-right">
                                                <UserActionMenu
                                                    user={user}
                                                    onBanToggle={handleBanToggle}
                                                    onChangeRole={handleChangeRole}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        </>
                    )}
                    {users.length > 0 && (
                        <div className="flex flex-col gap-3 border-t border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
                            <p className="text-xs text-white/42">
                                {t('pagination.rangeSummary', {
                                    start: rangeStart,
                                    end: rangeEnd,
                                    total,
                                    defaultValue: 'Hiển thị {{start}}-{{end}} / {{total}} tài khoản',
                                })}
                            </p>

                            {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                                    disabled={page <= 1}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/55 transition-colors duration-150 hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    <ChevronLeft size={15} />
                                </button>

                                {visiblePages.map((visiblePage) => (
                                    <button
                                        key={visiblePage}
                                        type="button"
                                        onClick={() => setPage(visiblePage)}
                                        className={`h-9 min-w-9 rounded-xl px-3 text-xs font-bold transition-colors duration-150 ${
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
                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/55 transition-colors duration-150 hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                            )}
                        </div>
                    )}
                </AdminSectionCard>
            )}
        </AdminPageShell>
    );
};
