import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Search, Users, AlertCircle, CheckCircle2, Loader2, Shield,
    X, ShieldCheck, ChevronDown,
} from 'lucide-react';
import {
    AdminUser,
    fetchAdminUsers,
    patchUserStatus,
    patchUserRole,
    getRoleLabel,
    STATUS_LABELS,
    ROLE_LABELS,
} from '../services/user-admin.service';
import { UserActionMenu } from '../components/features/UserActionMenu';
import { getImageUrl } from '../utils/cloudinary';

// ─── Toast ─────────────────────────────────────────────────────────────────────

interface ToastState {
    message: string;
    type: 'success' | 'error';
}

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
    'bg-violet-600',
    'bg-blue-600',
    'bg-emerald-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-indigo-600',
    'bg-teal-600',
];

function getAvatarColor(userId: number): string {
    return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────

function RoleBadge({ roleName }: { roleName: string }) {
    const { t } = useTranslation(['customers']);
    const styles: Record<string, string> = {
        Admin: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
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

export const AdminCustomers: React.FC = () => {
    const { t } = useTranslation(['customers']);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Toast
    const [toast, setToast] = useState<ToastState | null>(null);

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
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAdminUsers({
                search: search || undefined,
                role: roleFilter !== 'all' ? roleFilter : undefined,
                status: statusFilter !== 'all' ? statusFilter : undefined,
            });
            setUsers(data);
        } catch (e: any) {
            setError(e.message || t('feedback.loadError'));
        } finally {
            setLoading(false);
        }
    }, [search, roleFilter, statusFilter]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // ─── Toast ────────────────────────────────────────────────────────────────
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
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
        } catch (e: any) {
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
        } catch (e: any) {
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

    return (
        <div
            className="p-8 max-w-[1600px] mx-auto h-full flex flex-col relative"
            style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
        >
            {/* ── Toast ────────────────────────────────────────────────────── */}
            {toast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] animate-fade-in-up pointer-events-none">
                    <div
                        className={`bg-[#111113] border shadow-2xl rounded-full px-5 py-3 flex items-center gap-3 ${toast.type === 'error' ? 'border-red-500/30' : 'border-emerald-500/20'
                            }`}
                    >
                        {toast.type === 'error' ? (
                            <AlertCircle size={14} className="text-red-400 shrink-0" />
                        ) : (
                            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        )}
                        <span className="text-sm font-medium text-white">{toast.message}</span>
                    </div>
                </div>
            )}

            {/* ── Ban Confirmation Dialog ───────────────────────────────────── */}
            {banTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => !banLoading && setBanTarget(null)}
                    />
                    <div className="relative bg-[#111113] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                                    <Shield size={18} className="text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">
                                        {banTarget.status === 'Banned' ? t('ban.titleUnban') : t('ban.titleBan')}
                                    </h3>
                                    <p className="text-xs text-white/40 mt-0.5 truncate max-w-[260px]">
                                        {banTarget.fullName}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setBanTarget(null)}
                                disabled={banLoading}
                                className="text-white/30 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Warning box */}
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

                        {/* Actions */}
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setBanTarget(null)}
                                disabled={banLoading}
                                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                {t('ban.cancel')}
                            </button>
                            <button
                                onClick={handleConfirmBan}
                                disabled={banLoading}
                                className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-2 shadow-lg shadow-red-900/30 cursor-pointer"
                            >
                                {banLoading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                                {banLoading ? t('ban.processing') : banTarget.status === 'Banned' ? t('ban.actionUnban') : t('ban.actionBan')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Role Management Modal ─────────────────────────────────────── */}
            {roleTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => !roleLoading && setRoleTarget(null)}
                    />
                    <div className="relative bg-[#111113] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                    <ShieldCheck size={16} className="text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">{t('role.title')}</h3>
                                    <p className="text-[11px] text-white/40 truncate max-w-[180px]">{roleTarget.fullName}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setRoleTarget(null)}
                                disabled={roleLoading}
                                className="text-white/30 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Role list */}
                        <div className="space-y-2">
                            {KNOWN_ROLES.map((r) => (
                                <button
                                    key={r.roleId}
                                    onClick={() => setSelectedRoleId(r.roleId)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${selectedRoleId === r.roleId
                                        ? 'border-primary/50 bg-primary/10 text-white'
                                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white/80'
                                        }`}
                                >
                                    <span>{t(`role.labels.${r.roleName.toLowerCase()}`, { defaultValue: getRoleLabel(r.roleName) })}</span>
                                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${r.roleName === 'Admin' ? 'bg-purple-500/20 text-purple-300' :
                                        r.roleName === 'Customer' ? 'bg-blue-500/20 text-blue-300' :
                                            'bg-amber-500/20 text-amber-300'
                                        }`}>
                                        {r.roleName}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setRoleTarget(null)}
                                disabled={roleLoading}
                                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                            >
                                {t('role.cancel')}
                            </button>
                            <button
                                onClick={handleConfirmRole}
                                disabled={roleLoading || selectedRoleId === null}
                                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer"
                            >
                                {roleLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                {roleLoading ? t('role.saving') : t('role.saveRole')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header ────────────────────────────────────────────────────── */}
            <header className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Users size={16} className="text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">{t('page.title')}</h2>
                    </div>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1 pl-11">
                        {loading ? t('page.loading') : t('page.userCount', { count: users.length })}
                    </p>
                </div>
            </header>

            {/* ── Toolbar ───────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
                {/* Search */}
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
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                </div>

                {/* Role Filter */}
                <div className="relative">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="appearance-none bg-white/[0.04] border border-white/10 rounded-xl py-2.5 pl-4 pr-9 text-sm text-white/80 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                    >
                        <option value="all">{t('filters.allRoles')}</option>
                        {Object.entries(ROLE_LABELS).map(([key]) => (
                            <option key={key} value={key}>{t(`role.labels.${key.toLowerCase()}`, { defaultValue: getRoleLabel(key) })}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                </div>

                {/* Status Filter */}
                <div className="relative">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none bg-white/[0.04] border border-white/10 rounded-xl py-2.5 pl-4 pr-9 text-sm text-white/80 focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                    >
                        <option value="all">{t('filters.allStatuses')}</option>
                        <option value="Active">{t('filters.statusActive')}</option>
                        <option value="Banned">{t('filters.statusBanned')}</option>
                        <option value="Pending">{t('filters.statusPending')}</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                </div>
            </div>

            {/* ── Loading ───────────────────────────────────────────────────── */}
            {loading && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-white/10 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm text-white/40">{t('feedback.loadingList')}</p>
                    </div>
                </div>
            )}

            {/* ── Error ─────────────────────────────────────────────────────── */}
            {error && !loading && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl flex-1 flex items-center justify-center">
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
            )}

            {/* ── Table ─────────────────────────────────────────────────────── */}
            {!loading && !error && (
                <div className="bg-white/[0.02] border border-white/5 rounded-xl shadow-2xl flex flex-col flex-1 overflow-hidden">
                    {users.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                                <Users size={24} className="text-white/20" />
                            </div>
                            <div className="text-center">
                                <p className="text-base font-semibold text-white/60">{t('feedback.notFound')}</p>
                                <p className="text-sm text-white/30 mt-1">{t('feedback.changeFilter')}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white/[0.02] border-b border-white/[0.06]">
                                    <tr className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                                        <th className="py-4 px-6">{t('table.customer')}</th>
                                        <th className="py-4 px-4">{t('table.contact')}</th>
                                        <th className="py-4 px-4">{t('table.role')}</th>
                                        <th className="py-4 px-4">{t('table.status')}</th>
                                        <th className="py-4 px-4">{t('table.orders')}</th>
                                        <th className="py-4 px-4">{t('table.joined')}</th>
                                        <th className="py-4 px-4 text-right">{t('table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {users.map((user) => (
                                        <tr
                                            key={user.userId}
                                            className="group hover:bg-white/[0.02] transition-colors"
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
                </div>
            )}
        </div>
    );
};