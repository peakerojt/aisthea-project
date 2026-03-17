import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/common/contexts/ToastContext';
import {
    Search, Users, AlertCircle, Loader2, Shield,
    ShieldCheck, ChevronDown,
} from 'lucide-react';
import {
    AdminEmptyState,
    AdminModalShell,
    AdminPageHeader,
    AdminPageShell,
    AdminPrimaryButton,
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
    getRoleLabel,
    STATUS_LABELS,
    ROLE_LABELS,
} from '@/common/services/user-admin.service';
import { UserActionMenu } from '@/admin/components/UserActionMenu';
import { getImageUrl } from '@/common/utils/cloudinary';

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

// ─── Badge helpers ─────────────────────────────────────────────────────────────

function RoleBadge({ roleName }: { roleName: string }) {
    const { t } = useTranslation(['customers']);
    const styles: Record<string, string> = {
        Admin: 'bg-teal-500/15 text-teal-300 border-teal-500/25',
        Customer: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
        Staff: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    };
    const cls = styles[roleName] ?? 'bg-white/5 text-white/40 border-white/10';
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wide ${cls}`}>
            {t(`role.labels.${roleName.toLowerCase()}`, { defaultValue: getRoleLabel(roleName) })}
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
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasLoadedRef = useRef(false);
    const requestIdRef = useRef(0);

    // Filters
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modals
    const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
    const [banLoading, setBanLoading] = useState(false);

    const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
    const [roleLoading, setRoleLoading] = useState(false);

    // Debounce search
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSearchChange = (v: string) => {
        setSearchInput(v);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setSearch(v), 500);
    };

    // ─── Data loading ─────────────────────────────────────────────────────────
    const loadUsers = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        const isFirstLoad = !hasLoadedRef.current;
        if (isFirstLoad) setLoading(true);
        else setIsRefreshing(true);
        setError(null);
        try {
            const data = await fetchAdminUsers({
                search: search || undefined,
                role: roleFilter !== 'all' ? roleFilter : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
            });
            if (requestIdRef.current !== requestId) return;
            setUsers(data);
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
    }, [search, roleFilter, statusFilter]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

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

    // Known roles for the role modal (matching DB)
    const KNOWN_ROLES = [
        { roleId: 1, roleName: 'Admin' },
        { roleId: 2, roleName: 'Customer' },
        { roleId: 3, roleName: 'Staff' },
    ];

    const pageControls = (
        <div className="space-y-5 border-b border-white/5 p-5 lg:p-6">
            <AdminPageHeader
                icon={Users}
                title={t('page.title')}
                meta={loading ? t('page.loading') : t('page.userCount', { count: users.length })}
            />

            <AdminToolbar>
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
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className={`appearance-none cursor-pointer pl-4 pr-9 ${adminUiTokens.fieldControl}`}
                    >
                        <option value="all">{t('filters.allRoles')}</option>
                        {Object.entries(ROLE_LABELS).map(([key]) => (
                            <option key={key} value={key}>{t(`role.labels.${key.toLowerCase()}`, { defaultValue: getRoleLabel(key) })}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                </div>

                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`appearance-none cursor-pointer pl-4 pr-9 ${adminUiTokens.fieldControl}`}
                    >
                        <option value="all">{t('filters.allStatuses')}</option>
                        <option value="Active">{t('filters.statusActive')}</option>
                        <option value="Banned">{t('filters.statusBanned')}</option>
                        <option value="Pending">{t('filters.statusPending')}</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                </div>
            </AdminToolbar>
        </div>
    );

    return (
        <AdminPageShell className="relative h-full">
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
                            {KNOWN_ROLES.map((r) => (
                                <button
                                    key={r.roleId}
                                    onClick={() => setSelectedRoleId(r.roleId)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${selectedRoleId === r.roleId
                                        ? 'border-primary/50 bg-primary/10 text-white'
                                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white/80'
                                        }`}
                                >
                                    <span>{t(`role.labels.${r.roleName.toLowerCase()}`, { defaultValue: getRoleLabel(r.roleName) })}</span>
                                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${r.roleName === 'Admin' ? 'bg-teal-500/20 text-teal-300' :
                                        r.roleName === 'Customer' ? 'bg-blue-500/20 text-blue-300' :
                                            'bg-amber-500/20 text-amber-300'
                                        }`}>
                                        {r.roleName}
                                    </span>
                                </button>
                            ))}
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
                            onClick={loadUsers}
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
                    {isRefreshing && <div className="h-px w-full bg-primary/60" />}
                    {users.length === 0 ? (
                        <AdminEmptyState
                            icon={Users}
                            title={t('feedback.notFound')}
                            description={t('feedback.changeFilter')}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className={adminUiTokens.tableHeaderSurface}>
                                    <tr>
                                        <th className={`px-6 py-4 ${adminUiTokens.tableHeader}`}>{t('table.customer')}</th>
                                        <th className={`px-4 py-4 ${adminUiTokens.tableHeader}`}>{t('table.contact')}</th>
                                        <th className={`px-4 py-4 ${adminUiTokens.tableHeader}`}>{t('table.role')}</th>
                                        <th className={`px-4 py-4 ${adminUiTokens.tableHeader}`}>{t('table.status')}</th>
                                        <th className={`px-4 py-4 ${adminUiTokens.tableHeader}`}>{t('table.orders')}</th>
                                        <th className={`px-4 py-4 ${adminUiTokens.tableHeader}`}>{t('table.joined')}</th>
                                        <th className={`px-4 py-4 text-right ${adminUiTokens.tableHeader}`}>{t('table.actions')}</th>
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
                                                        className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${user.avatarUrl ? '' : getAvatarColor(user.userId)
                                                            }`}
                                                    >
                                                        {user.avatarUrl ? (
                                                            <img
                                                                src={getImageUrl(user.avatarUrl)}
                                                                alt={user.fullName}
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
                    )}
                </AdminSectionCard>
            )}
        </AdminPageShell>
    );
};
