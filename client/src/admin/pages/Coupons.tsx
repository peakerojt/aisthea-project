/**
 * Coupons.tsx — Quản lý Mã Giảm Giá AISTHEA
 * ──────────────────────────────────────────────────────────────────────
 * Features:
 *  • Danh sách mã giảm giá với trạng thái màu sắc động
 *  • Tạo / Chỉnh sửa mã qua Dialog
 *  • Trường "Giảm tối đa" động (chỉ hiện khi PERCENTAGE)
 *  • Nút sinh mã ngẫu nhiên "AISTHEA-XXXX"
 *  • Lọc theo trạng thái, tìm kiếm theo code
 *  • i18n via react-i18next (coupons namespace)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/common/contexts/ToastContext';
import {
    TicketPercent,
    Plus,
    Search,
    Pencil,
    Trash2,
    X,
    Wand2,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Ban,
    Loader2,
    CalendarRange,
    Tag,
} from 'lucide-react';
import {
    AdminActionButton,
    AdminBadge,
    AdminModalShell,
    AdminPageHeader,
    AdminPageShell,
    AdminPrimaryButton,
    AdminRefreshButton,
    AdminRowIconButton,
    AdminSecondaryButton,
    AdminSectionCard,
    AdminStatCards,
    AdminTabs,
    AdminToolbar,
    adminUiTokens,
} from '@/admin/components/AdminUI';
import {
    fetchCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    type Coupon,
    type CouponType,
    type CreateCouponPayload,
} from '@/common/services/coupon.service';
import { mapZodFieldErrors } from '@/common/validation/errors';
import { createCouponClientSchema, updateCouponClientSchema } from '@/common/validation/schemas';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(value: number): string {
    return value.toLocaleString('vi-VN') + '₫';
}

function normalizeCurrencyInput(value: string): string {
    return value.replace(/[^\d]/g, '');
}

function fmtCurrencyInput(value: string): string {
    const normalized = normalizeCurrencyInput(value);
    if (!normalized) return '';
    return Number(normalized).toLocaleString('vi-VN');
}

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function toInputDate(iso: string): string {
    return new Date(iso).toISOString().slice(0, 10);
}

function generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
        suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    return `AISTHEA-${suffix}`;
}

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_ICON_MAP: Record<string, React.ElementType> = {
    ACTIVE: CheckCircle2,
    EXPIRED: Clock,
    DEPLETED: Ban,
    UPCOMING: CalendarRange,
    INACTIVE: Ban,
};

const getStatusBadgeTone = (status: string) => {
    if (status === 'ACTIVE') return 'success' as const;
    if (status === 'DEPLETED') return 'danger' as const;
    if (status === 'UPCOMING') return 'info' as const;
    if (status === 'INACTIVE') return 'default' as const;
    return 'warning' as const;
};

// ─── Coupon Form Dialog ───────────────────────────────────────────────────────

interface FormErrors {
    [key: string]: string;
}

interface CouponDialogProps {
    coupon: Coupon | null; // null = create mode
    onClose: () => void;
    onSaved: () => void;
    setToast: (toast: { message: string; type: 'success' | 'error' }) => void;
    t: (key: string, opts?: Record<string, unknown>) => string;
}

const CouponDialog: React.FC<CouponDialogProps> = ({ coupon, onClose, onSaved, setToast, t }) => {
    const isEdit = coupon !== null;

    const [code, setCode] = useState(coupon?.code ?? '');
    const [type, setType] = useState<CouponType>(coupon?.type ?? 'FIXED_AMOUNT');
    const [value, setValue] = useState(coupon ? String(coupon.value) : '');
    const [maxDiscountAmount, setMaxDiscountAmount] = useState(
        coupon?.maxDiscountAmount != null ? String(coupon.maxDiscountAmount) : ''
    );
    const [minOrderValue, setMinOrderValue] = useState(coupon ? String(coupon.minOrderValue) : '0');
    const [startDate, setStartDate] = useState(coupon ? toInputDate(coupon.startDate) : '');
    const [endDate, setEndDate] = useState(coupon ? toInputDate(coupon.endDate) : '');
    const [usageLimit, setUsageLimit] = useState(coupon ? String(coupon.usageLimit) : '100');
    const [usagePerUser, setUsagePerUser] = useState(coupon ? String(coupon.usagePerUser) : '1');
    const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    const handleCurrencyInput = (
        setter: React.Dispatch<React.SetStateAction<string>>,
        fallback = ''
    ) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const normalized = normalizeCurrencyInput(event.target.value);
        setter(normalized || fallback);
    };

    const buildPayload = (): CreateCouponPayload => ({
        code: code.toUpperCase().trim(),
        type,
        value: Number(value),
        maxDiscountAmount: type === 'PERCENTAGE' && maxDiscountAmount ? Number(maxDiscountAmount) : null,
        minOrderValue: Number(minOrderValue) || 0,
        startDate,
        endDate,
        usageLimit: Number(usageLimit),
        usagePerUser: Number(usagePerUser) || 1,
        isActive,
    });

    const validate = (): CreateCouponPayload | null => {
        const payload = buildPayload();
        const result = (isEdit ? updateCouponClientSchema : createCouponClientSchema).safeParse(payload);

        if (!result.success) {
            setErrors(mapZodFieldErrors(result.error));
            return null;
        }

        setErrors({});
        return result.data as CreateCouponPayload;
    };

    const handleSubmit = async () => {
        const payload = validate();
        if (!payload) return;
        setSaving(true);
        try {
            if (isEdit) {
                await updateCoupon(coupon.couponId, payload);
                setToast({ message: t('coupons:feedback.updateSuccess'), type: 'success' });
            } else {
                await createCoupon(payload);
                setToast({ message: t('coupons:feedback.createSuccess'), type: 'success' });
            }
            onSaved();
            onClose();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } }, message?: string };
            const msg = error?.response?.data?.error ?? error?.message ?? 'Có lỗi xảy ra.';
            setToast({ message: msg, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const inputClass = (field: string) =>
        `w-full ${adminUiTokens.fieldControl} rounded-lg px-4 placeholder:text-white/25 focus:ring-1 ${errors[field]
            ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30'
            : 'focus:ring-primary/40'
        }`;

    const labelClass = `${adminUiTokens.fieldLabel} text-white/50 tracking-wider`;

    return (
        <>
            <AdminModalShell
                icon={TicketPercent}
                title={isEdit ? t('coupons:form.titleEdit') : t('coupons:form.titleCreate')}
                subtitle={isEdit ? t('coupons:form.subtitleEdit', { code: coupon.code }) : t('coupons:form.subtitleCreate')}
                onClose={onClose}
                maxWidthClassName="max-w-2xl"
                panelClassName="max-h-[90vh] overflow-y-auto"
                bodyClassName="p-6 space-y-5"
                stickyHeader
                footer={(
                    <div className="flex justify-end gap-3">
                        <AdminSecondaryButton
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-xs"
                        >
                            {t('common:actions.cancel')}
                        </AdminSecondaryButton>
                        <AdminPrimaryButton
                            type="button"
                            onClick={handleSubmit}
                            disabled={saving}
                            className="rounded-lg px-6 py-2 text-xs uppercase tracking-wider disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                            {saving ? t('coupons:form.saving') : isEdit ? t('coupons:form.update') : t('coupons:form.create')}
                        </AdminPrimaryButton>
                    </div>
                )}
            >
                        {/* Code + Generator */}
                        <div>
                            <label className={labelClass}>{t('coupons:form.labelCode')}</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder={t('coupons:form.codePlaceholder')}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    className={inputClass('code') + ' flex-1 font-mono tracking-widest'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setCode(generateCode())}
                                    title={t('coupons:form.generateCode')}
                                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white/50 transition-colors hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
                                >
                                    <Wand2 size={14} />
                                    {t('coupons:form.generateCode')}
                                </button>
                            </div>
                            {errors.code && <p className="mt-1 text-[11px] text-red-400">{errors.code}</p>}
                        </div>

                        {/* Type + Value */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>{t('coupons:form.labelType')}</label>
                                <select
                                    value={type}
                                    onChange={(e) => {
                                        setType(e.target.value as CouponType);
                                        setMaxDiscountAmount('');
                                    }}
                                    className={inputClass('type') + ' cursor-pointer'}
                                >
                                    <option value="FIXED_AMOUNT">{t('coupons:form.typeFixed')}</option>
                                    <option value="PERCENTAGE">{t('coupons:form.typePercent')}</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>
                                    {type === 'PERCENTAGE' ? t('coupons:form.labelValuePercent') : t('coupons:form.labelValueFixed')}
                                </label>
                                <input
                                    type={type === 'PERCENTAGE' ? 'number' : 'text'}
                                    inputMode={type === 'PERCENTAGE' ? undefined : 'numeric'}
                                    min={type === 'PERCENTAGE' ? 1 : undefined}
                                    max={type === 'PERCENTAGE' ? 100 : undefined}
                                    step={type === 'PERCENTAGE' ? 1 : undefined}
                                    value={type === 'PERCENTAGE' ? value : fmtCurrencyInput(value)}
                                    onChange={type === 'PERCENTAGE' ? (e) => setValue(e.target.value) : handleCurrencyInput(setValue)}
                                    className={inputClass('value')}
                                    placeholder={type === 'PERCENTAGE' ? t('coupons:form.placeholders.valuePercent') : t('coupons:form.placeholders.valueFixed')}
                                />
                                {errors.value && <p className="mt-1 text-[11px] text-red-400">{errors.value}</p>}
                            </div>
                        </div>

                        {/* Max discount amount (PERCENTAGE only) */}
                        {type === 'PERCENTAGE' && (
                            <div className="border border-blue-500/15 bg-blue-500/[0.04] rounded-xl p-4">
                                <label className={`${labelClass} text-blue-400/70`}>
                                    {t('coupons:form.labelMaxDiscount')}
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={fmtCurrencyInput(maxDiscountAmount)}
                                    onChange={handleCurrencyInput(setMaxDiscountAmount)}
                                    className="w-full rounded-lg border border-blue-500/20 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25 transition-colors focus:border-blue-500/40 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                                    placeholder={t('coupons:form.placeholders.maxDiscount')}
                                />
                                <p className="mt-1.5 text-[10px] text-white/30">
                                    {t('coupons:form.maxDiscountNote')}
                                </p>
                            </div>
                        )}

                        {/* Conditions row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>{t('coupons:form.labelMinOrder')}</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={fmtCurrencyInput(minOrderValue)}
                                    onChange={handleCurrencyInput(setMinOrderValue, '0')}
                                    className={inputClass('minOrderValue')}
                                    placeholder={t('coupons:form.placeholders.minOrderValue')}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>{t('coupons:form.labelPerUser')}</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={usagePerUser}
                                    onChange={(e) => setUsagePerUser(e.target.value)}
                                    className={inputClass('usagePerUser')}
                                />
                            </div>
                        </div>

                        {/* Date range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>{t('coupons:form.labelStartDate')}</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={inputClass('startDate') + ' [color-scheme:dark]'}
                                />
                                {errors.startDate && <p className="mt-1 text-[11px] text-red-400">{errors.startDate}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>{t('coupons:form.labelEndDate')}</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className={inputClass('endDate') + ' [color-scheme:dark]'}
                                />
                                {errors.endDate && <p className="mt-1 text-[11px] text-red-400">{errors.endDate}</p>}
                            </div>
                        </div>

                        {/* Usage + Active toggle */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>{t('coupons:form.labelLimit')}</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={usageLimit}
                                    onChange={(e) => setUsageLimit(e.target.value)}
                                    className={inputClass('usageLimit')}
                                />
                                {errors.usageLimit && <p className="mt-1 text-[11px] text-red-400">{errors.usageLimit}</p>}
                            </div>
                            <div className="flex flex-col justify-end">
                                <label className={labelClass}>{t('coupons:form.labelStatus')}</label>
                                <button
                                    type="button"
                                    onClick={() => setIsActive((p) => !p)}
                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors ${isActive
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                        : 'bg-white/[0.04] border-white/[0.10] text-white/40'
                                        }`}
                                >
                                    <div
                                        className={`relative w-9 h-5 rounded-full transition-colors border ${isActive ? 'bg-emerald-500 border-emerald-500' : 'bg-white/10 border-white/20'
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-4' : ''
                                                }`}
                                        />
                                    </div>
                                    {isActive ? t('coupons:form.statusActive') : t('coupons:form.statusInactive')}
                                </button>
                            </div>
                        </div>
            </AdminModalShell>
        </>
    );
};

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

const DeleteConfirmDialog: React.FC<{
    coupon: Coupon;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
    t: (key: string, opts?: Record<string, unknown>) => string;
}> = ({ coupon, onConfirm, onCancel, loading, t }) => (
    <AdminModalShell
        icon={Trash2}
        iconWrapperClassName="border-red-500/20 bg-red-500/10 text-red-400"
        iconClassName="text-red-400"
        title={t('coupons:delete.title')}
        subtitle={t('coupons:delete.subtitle')}
        onClose={onCancel}
        maxWidthClassName="max-w-sm"
        bodyClassName="p-6"
        footer={(
            <div className="flex justify-end gap-3">
                <AdminSecondaryButton
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg px-4 py-2 text-xs"
                >
                    {t('common:actions.cancel')}
                </AdminSecondaryButton>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : null}
                    {loading ? t('coupons:delete.processing') : t('coupons:delete.action')}
                </button>
            </div>
        )}
    >
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle size={18} className="text-red-400" />
                    <p className="text-sm font-semibold text-white/80">{t('coupons:delete.subtitle')}</p>
                </div>
                <p className="text-sm text-white/60 mb-5">
                    Bạn có chắc muốn vô hiệu hóa mã{' '}
                    <code className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {coupon.code}
                    </code>
                    ? Khách hàng sẽ không thể dùng mã này nữa.
                </p>
    </AdminModalShell>
);

// ─── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonRow: React.FC = () => (
    <tr className="border-b border-white/[0.04]">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <td key={i} className="px-5 py-4">
                <div
                    className="h-3.5 rounded bg-white/[0.05] animate-pulse"
                    style={{ width: `${45 + i * 8}%` }}
                />
            </td>
        ))}
    </tr>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const Coupons: React.FC = () => {
    const { t } = useTranslation();
    const { showToast: fireToast } = useToast();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [summaryCounts, setSummaryCounts] = useState({
        total: 0,
        active: 0,
        expired: 0,
        depleted: 0,
        upcoming: 0,
        inactive: 0,
    });

    const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);
    const hasLoadedRef = useRef(false);
    const requestIdRef = useRef(0);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(timer);
    }, [search]);

    const loadCoupons = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        const isFirstLoad = !hasLoadedRef.current;
        if (isFirstLoad) setLoading(true);
        else setIsRefreshing(true);
        setError(null);
        try {
            const resp = await fetchCoupons({
                page,
                search: debouncedSearch || undefined,
                includeHidden: true,
                isActive:
                    statusFilter === 'INACTIVE'
                        ? false
                        : undefined,
            });
            if (requestIdRef.current !== requestId) return;
            let filtered = resp.coupons;

            // Always filter by computed UI status so expired/upcoming/depleted coupons
            // do not leak into the "active" tab just because isActive=true in DB.
            if (statusFilter !== 'ALL') {
                filtered = filtered.filter((c) => c.status === statusFilter);
            }

            setCoupons(filtered);
            setTotalPages(resp.pagination.totalPages);
            setTotal(resp.pagination.total);
            if (resp.summary) {
                setSummaryCounts(resp.summary);
            }
            hasLoadedRef.current = true;
        } catch (err: unknown) {
            if (requestIdRef.current !== requestId) return;
            const error = err as { message?: string };
            setError(error.message ?? t('coupons:feedback.loadError'));
        } finally {
            if (requestIdRef.current !== requestId) return;
            if (isFirstLoad) setLoading(false);
            else setIsRefreshing(false);
        }
    }, [page, debouncedSearch, statusFilter, t]);

    useEffect(() => {
        loadCoupons();
    }, [loadCoupons]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter]);

    const handleManualRefresh = useCallback(async () => {
        setIsManualRefreshing(true);
        try {
            await loadCoupons();
        } finally {
            setIsManualRefreshing(false);
        }
    }, [loadCoupons]);

    const setToast = useCallback((toast: { message: string; type: 'success' | 'error' }) => {
        fireToast({ type: toast.type, title: toast.message });
    }, [fireToast]);

    // Keyboard Esc to close dialogs
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setDialogMode(null);
                setDeleteTarget(null);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteCoupon(deleteTarget.couponId);
            setToast({ message: t('coupons:feedback.deleteSuccess', { code: deleteTarget.code }), type: 'success' });
            setDeleteTarget(null);
            await loadCoupons();
        } catch (err: unknown) {
            const error = err as { message?: string };
            setToast({ message: error.message ?? 'Có lỗi xảy ra.', type: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    const openEdit = (c: Coupon) => {
        setSelectedCoupon(c);
        setDialogMode('edit');
    };

    const statFilters = [
        { key: 'ALL', label: t('coupons:filters.all') },
        { key: 'ACTIVE', label: t('coupons:filters.active') },
        { key: 'UPCOMING', label: t('coupons:filters.upcoming') },
        { key: 'EXPIRED', label: t('coupons:filters.expired') },
        { key: 'DEPLETED', label: t('coupons:filters.depleted') },
        { key: 'INACTIVE', label: t('coupons:filters.inactive') },
    ];

    const statsBar = [
        { key: 'total', label: t('coupons:stats.total'), value: loading ? '–' : summaryCounts.total, icon: Tag, tone: 'default' as const },
        { key: 'active', label: t('coupons:stats.active'), value: loading ? '–' : summaryCounts.active, icon: CheckCircle2, tone: 'success' as const },
        { key: 'expired', label: t('coupons:stats.expired'), value: loading ? '–' : summaryCounts.expired, icon: Clock, tone: 'default' as const },
        { key: 'depleted', label: t('coupons:stats.depleted'), value: loading ? '–' : summaryCounts.depleted, icon: Ban, tone: 'danger' as const },
    ];

    const pageControls = (
        <div className="space-y-5 border-b border-white/[0.06] p-5 lg:p-6">
            <AdminPageHeader
                icon={TicketPercent}
                title={t('coupons:page.title')}
                subtitle={t('coupons:page.subtitle')}
                actions={(
                    <AdminPrimaryButton
                        type="button"
                        onClick={() => { setSelectedCoupon(null); setDialogMode('create'); }}
                    >
                        <Plus size={15} />
                        {t('coupons:page.create')}
                    </AdminPrimaryButton>
                )}
            />

            <AdminStatCards items={statsBar} />

            <AdminToolbar
                actions={(
                    <AdminRefreshButton
                        type="button"
                        onClick={handleManualRefresh}
                        isRefreshing={isManualRefreshing}
                        disabled={loading || isRefreshing || isManualRefreshing}
                        label={t('coupons:filters.refresh')}
                    />
                )}
            >
                <div className="relative min-w-[220px] flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                    <input
                        type="text"
                        placeholder={t('coupons:filters.searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={adminUiTokens.searchFieldControl}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </AdminToolbar>

            <AdminTabs
                items={statFilters.map((filter) => ({ key: filter.key, label: filter.label }))}
                activeKey={statusFilter}
                onChange={setStatusFilter}
            />
        </div>
    );

    return (
        <AdminPageShell className="min-h-full">
            <style>{`
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
        .animate-fade-in-up { animation: fade-in-up 0.2s ease-out both; }
        .animate-scale-in { animation: scale-in 0.18s ease-out both; }
      `}</style>

            {/* ── Table ── */}
            <AdminSectionCard className="flex-1 overflow-hidden bg-[#0e0e0e]" bodyClassName="flex h-full flex-col">
                {pageControls}
                {error ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <AlertTriangle size={40} className="text-red-400 mb-4" />
                        <p className="text-white/60 font-medium mb-6">{error}</p>
                        <button
                            onClick={loadCoupons}
                            className="text-xs font-bold uppercase tracking-wider text-primary border border-primary/30 px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
                        >
                            {t('coupons:feedback.retry')}
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-hidden">
                        <table className="w-full table-fixed border-collapse text-left">
                            <colgroup>
                                <col className="w-[14%]" />
                                <col className="w-[18%]" />
                                <col className="w-[19%]" />
                                <col className="w-[13%]" />
                                <col className="w-[11%]" />
                                <col className="w-[16%]" />
                                <col className="w-[9%]" />
                            </colgroup>
                            <thead className={adminUiTokens.tableHeaderSurface}>
                                <tr>
                                    <th className={`px-4 py-3.5 ${adminUiTokens.tableHeader}`}>{t('coupons:table.code')}</th>
                                    <th className={`px-4 py-3.5 ${adminUiTokens.tableHeader}`}>{t('coupons:table.type')}</th>
                                    <th className={`px-4 py-3.5 ${adminUiTokens.tableHeader}`}>{t('coupons:table.condition')}</th>
                                    <th className={`px-4 py-3.5 ${adminUiTokens.tableHeader}`}>{t('coupons:table.period')}</th>
                                    <th className={`px-4 py-3.5 text-center ${adminUiTokens.tableHeader}`}>{t('coupons:table.usage')}</th>
                                    <th className={`px-4 py-3.5 ${adminUiTokens.tableHeader}`}>{t('coupons:table.status')}</th>
                                    <th className={`px-4 py-3.5 text-center ${adminUiTokens.tableHeader}`}>{t('coupons:table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className={adminUiTokens.tableBody}>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                ) : coupons.length === 0 ? (
                                    <tr>
                                        <td colSpan={7}>
                                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                                <TicketPercent size={48} className="text-white/10 mb-4" />
                                                <p className="text-white/40 text-sm font-medium">
                                                    {search || statusFilter !== 'ALL' ? t('coupons:table.noMatch') : t('coupons:table.noData')}
                                                </p>
                                                {(search || statusFilter !== 'ALL') && (
                                                    <button
                                                        onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
                                                        className="mt-3 text-xs text-primary hover:underline"
                                                    >
                                                        {t('coupons:table.clearFilter')}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    coupons.map((c) => {
                                        const statusLabel = t(`coupons:status.${c.status}`) || c.status;
                                        const StatusIcon = STATUS_ICON_MAP[c.status] ?? Ban;
                                        const usagePct = c.usageLimit > 0 ? Math.min(100, (c.usedCount / c.usageLimit) * 100) : 0;

                                        return (
                                            <tr
                                                key={c.couponId}
                                                className={adminUiTokens.tableRowSoft}
                                            >
                                                {/* Code */}
                                                <td className="px-4 py-4">
                                                    <code className="font-mono font-bold text-sm text-white bg-white/5 border border-white/[0.08] px-2.5 py-1 rounded-lg tracking-wider">
                                                        {c.code}
                                                    </code>
                                                </td>

                                                {/* Type + Value */}
                                                <td className="px-4 py-4">
                                                    <div>
                                                        <p className="text-sm font-semibold text-white">
                                                            {c.type === 'FIXED_AMOUNT'
                                                                ? fmtCurrency(c.value)
                                                                : `${c.value}%`}
                                                        </p>
                                                        <p className="text-[11px] text-white/40 mt-0.5">
                                                            {c.type === 'PERCENTAGE' ? t('coupons:type.PERCENTAGE') : t('coupons:type.FIXED_AMOUNT')}
                                                            {c.type === 'PERCENTAGE' && c.maxDiscountAmount
                                                                ? ` · ${t('coupons:type.maxDiscount')} ${fmtCurrency(c.maxDiscountAmount)}`
                                                                : ''}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* Conditions */}
                                                <td className="px-4 py-4">
                                                    <p className="text-xs text-white/60">
                                                        Đơn tối thiểu:{' '}
                                                        <span className="font-semibold text-white">
                                                            {c.minOrderValue > 0 ? fmtCurrency(c.minOrderValue) : t('coupons:common.unlimited')}
                                                        </span>
                                                    </p>
                                                    <p className="text-[11px] text-white/40 mt-0.5">
                                                        {c.usagePerUser} lần / khách
                                                    </p>
                                                </td>

                                                {/* Dates */}
                                                <td className="px-4 py-4">
                                                    <p className="text-xs text-white/60">{fmtDate(c.startDate)}</p>
                                                    <p className="text-[11px] text-white/30 mt-0.5">đến {fmtDate(c.endDate)}</p>
                                                </td>

                                                {/* Usage bar */}
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <span className="text-sm font-bold text-white tabular-nums">
                                                            {c.usedCount}
                                                            <span className="text-white/30 font-normal">/{c.usageLimit}</span>
                                                        </span>
                                                        <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-colors ${usagePct >= 100 ? 'bg-red-500' : usagePct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                                                    }`}
                                                                style={{ width: `${usagePct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-4">
                                                    <AdminBadge
                                                        tone={getStatusBadgeTone(c.status)}
                                                        className="max-w-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                                                    >
                                                        <StatusIcon size={10} />
                                                        {statusLabel}
                                                    </AdminBadge>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-4 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <AdminRowIconButton
                                                            onClick={() => openEdit(c)}
                                                            title={t('coupons:form.titleEdit')}
                                                            tone="primary"
                                                        >
                                                            <Pencil size={14} />
                                                        </AdminRowIconButton>
                                                        <AdminRowIconButton
                                                            onClick={() => setDeleteTarget(c)}
                                                            title={t('coupons:delete.action')}
                                                            disabled={!c.isActive}
                                                            tone="danger"
                                                        >
                                                            <Trash2 size={14} />
                                                        </AdminRowIconButton>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </AdminSectionCard>

            {/* ── Pagination ── */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <AdminActionButton
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="text-white/50 hover:text-white"
                    >
                        ← Trước
                    </AdminActionButton>
                    <span className="text-xs text-white/40 px-2">
                        Trang {page} / {totalPages}
                    </span>
                    <AdminActionButton
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="text-white/50 hover:text-white"
                    >
                        Tiếp →
                    </AdminActionButton>
                </div>
            )}

            {/* ── Dialogs ── */}
            {dialogMode && (
                <CouponDialog
                    coupon={dialogMode === 'edit' ? selectedCoupon : null}
                    onClose={() => setDialogMode(null)}
                    onSaved={loadCoupons}
                    setToast={setToast}
                    t={t as (key: string, opts?: Record<string, unknown>) => string}
                />
            )}
            {deleteTarget && (
                <DeleteConfirmDialog
                    coupon={deleteTarget}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                    loading={deleting}
                    t={t as (key: string, opts?: Record<string, unknown>) => string}
                />
            )}
        </AdminPageShell>
    );
};
