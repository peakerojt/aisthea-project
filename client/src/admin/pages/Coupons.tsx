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

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    TicketPercent,
    Plus,
    Search,
    RefreshCw,
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
    fetchCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    type Coupon,
    type CouponType,
    type CreateCouponPayload,
} from '@/common/services/coupon.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(value: number): string {
    return value.toLocaleString('vi-VN') + '₫';
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

const STATUS_CLASS_MAP: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    EXPIRED: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
    DEPLETED: 'bg-red-500/15 text-red-400 border-red-500/25',
    UPCOMING: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    INACTIVE: 'bg-white/5 text-white/30 border-white/10',
};

// ─── Toast ────────────────────────────────────────────────────────────────────

const Toast: React.FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({
    message,
    type,
    onClose,
}) => (
    <div
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium animate-fade-in-up ${type === 'success'
            ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300'
            : 'bg-red-950 border-red-500/30 text-red-300'
            }`}
    >
        {type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
        ) : (
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
        )}
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
            <X size={16} />
        </button>
    </div>
);

// ─── Coupon Form Dialog ───────────────────────────────────────────────────────

interface FormErrors {
    [key: string]: string;
}

interface CouponDialogProps {
    coupon: Coupon | null; // null = create mode
    onClose: () => void;
    onSaved: () => void;
    setToast: (t: { message: string; type: 'success' | 'error' } | null) => void;
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

    const validate = (): boolean => {
        const e: FormErrors = {};
        if (!code.trim()) e.code = t('coupons:validation.codeRequired');
        if (!value || isNaN(Number(value)) || Number(value) <= 0) e.value = t('coupons:validation.valuePositive');
        if (type === 'PERCENTAGE' && (Number(value) > 100)) e.value = t('coupons:validation.valueMaxPercent');
        if (!startDate) e.startDate = t('coupons:validation.startRequired');
        if (!endDate) e.endDate = t('coupons:validation.endRequired');
        if (startDate && endDate && new Date(endDate) <= new Date(startDate))
            e.endDate = t('coupons:validation.endAfterStart');
        if (!usageLimit || isNaN(Number(usageLimit)) || Number(usageLimit) < 1)
            e.usageLimit = t('coupons:validation.limitMin');
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload: CreateCouponPayload = {
                code: code.toUpperCase().trim(),
                type,
                value: Number(value),
                maxDiscountAmount: type === 'PERCENTAGE' && maxDiscountAmount ? Number(maxDiscountAmount) : null,
                minOrderValue: Number(minOrderValue) || 0,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
                usageLimit: Number(usageLimit),
                usagePerUser: Number(usagePerUser) || 1,
                isActive,
            };

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
        `w-full bg-white/[0.04] border rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 transition-all ${errors[field]
            ? 'border-red-500/50 focus:ring-red-500/30'
            : 'border-white/[0.10] focus:ring-primary/40 focus:border-primary/50'
        }`;

    const labelClass = 'block text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1.5';

    return (
        <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-[#0f0f0f] border border-white/[0.10] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] sticky top-0 bg-[#0f0f0f] z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                                <TicketPercent size={18} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-white">
                                    {isEdit ? t('coupons:form.titleEdit') : t('coupons:form.titleCreate')}
                                </h2>
                                <p className="text-[11px] text-white/40">
                                    {isEdit ? t('coupons:form.subtitleEdit', { code: coupon.code }) : t('coupons:form.subtitleCreate')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5">
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
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/[0.10] text-white/50 hover:text-white hover:border-white/25 hover:bg-white/[0.07] transition-all text-xs font-semibold whitespace-nowrap"
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
                                    type="number"
                                    min={1}
                                    max={type === 'PERCENTAGE' ? 100 : undefined}
                                    step={type === 'PERCENTAGE' ? 1 : 1000}
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    className={inputClass('value')}
                                    placeholder={type === 'PERCENTAGE' ? 'VD: 20' : 'VD: 50000'}
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
                                    type="number"
                                    min={0}
                                    step={1000}
                                    value={maxDiscountAmount}
                                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                                    className="w-full bg-white/[0.04] border border-blue-500/20 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all"
                                    placeholder="VD: 50000 (để trống = không giới hạn)"
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
                                    type="number"
                                    min={0}
                                    step={10000}
                                    value={minOrderValue}
                                    onChange={(e) => setMinOrderValue(e.target.value)}
                                    className={inputClass('minOrderValue')}
                                    placeholder="0 = không điều kiện"
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
                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all ${isActive
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
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/[0.06] bg-black/20">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-white/40 hover:text-white border border-white/10 hover:border-white/25 rounded-lg transition-all"
                        >
                            {t('common:actions.cancel')}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                            {saving ? t('coupons:form.saving') : isEdit ? t('coupons:form.update') : t('coupons:form.create')}
                        </button>
                    </div>
                </div>
            </div>
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
    <>
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={onCancel} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#0f0f0f] border border-white/[0.10] rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                        <Trash2 size={18} className="text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">{t('coupons:delete.title')}</h3>
                        <p className="text-[11px] text-white/40">{t('coupons:delete.subtitle')}</p>
                    </div>
                </div>
                <p className="text-sm text-white/60 mb-5">
                    Bạn có chắc muốn vô hiệu hóa mã{' '}
                    <code className="font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {coupon.code}
                    </code>
                    ? Khách hàng sẽ không thể dùng mã này nữa.
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-xs font-semibold text-white/40 hover:text-white border border-white/10 hover:border-white/25 rounded-lg transition-all"
                    >
                        {t('common:actions.cancel')}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={13} className="animate-spin" /> : null}
                        {loading ? t('coupons:delete.processing') : t('coupons:delete.action')}
                    </button>
                </div>
            </div>
        </div>
    </>
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
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(timer);
    }, [search]);

    const loadCoupons = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const resp = await fetchCoupons({
                page,
                search: debouncedSearch || undefined,
                isActive:
                    statusFilter === 'ACTIVE' || statusFilter === 'INACTIVE'
                        ? statusFilter === 'ACTIVE'
                        : undefined,
            });
            let filtered = resp.coupons;

            // Client-side status filter (for computed statuses like EXPIRED/DEPLETED)
            if (statusFilter !== 'ALL' && statusFilter !== 'ACTIVE' && statusFilter !== 'INACTIVE') {
                filtered = filtered.filter((c) => c.status === statusFilter);
            }

            setCoupons(filtered);
            setTotalPages(resp.pagination.totalPages);
            setTotal(resp.pagination.total);
        } catch (err: unknown) {
            const error = err as { message?: string };
            setError(error.message ?? t('coupons:feedback.loadError'));
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, statusFilter, t]);

    useEffect(() => {
        loadCoupons();
    }, [loadCoupons]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter]);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 4500);
        return () => clearTimeout(timer);
    }, [toast]);

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

    // Summary counts
    const activeCnt = coupons.filter((c) => c.status === 'ACTIVE').length;
    const expiredCnt = coupons.filter((c) => c.status === 'EXPIRED').length;
    const depletedCnt = coupons.filter((c) => c.status === 'DEPLETED').length;

    const statsBar = [
        { labelKey: 'coupons:stats.total', value: total, Icon: Tag, color: 'bg-white/5 text-white/60', border: 'border-white/[0.06]' },
        { labelKey: 'coupons:stats.active', value: activeCnt, Icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-500/10' },
        { labelKey: 'coupons:stats.expired', value: expiredCnt, Icon: Clock, color: 'bg-zinc-500/10 text-zinc-400', border: 'border-zinc-500/10' },
        { labelKey: 'coupons:stats.depleted', value: depletedCnt, Icon: Ban, color: 'bg-red-500/10 text-red-400', border: 'border-red-500/10' },
    ];

    return (
        <div
            className="min-h-full p-8 max-w-[1600px] mx-auto flex flex-col gap-6"
            style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes scale-in { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
        .animate-fade-in-up { animation: fade-in-up 0.2s ease-out both; }
        .animate-scale-in { animation: scale-in 0.18s ease-out both; }
      `}</style>

            {/* ── Header ── */}
            <header className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                            <TicketPercent size={20} className="text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">{t('coupons:page.title')}</h1>
                    </div>
                    <p className="text-xs text-white/40 uppercase tracking-[0.15em] ml-[3.5rem]">
                        {t('coupons:page.subtitle')}
                    </p>
                </div>
                <button
                    onClick={() => { setSelectedCoupon(null); setDialogMode('create'); }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-primary/20"
                >
                    <Plus size={15} />
                    {t('coupons:page.create')}
                </button>
            </header>

            {/* ── Stats Bar ── */}
            <div className="grid grid-cols-4 gap-4">
                {statsBar.map(({ labelKey, value, Icon, color, border }) => (
                    <div key={labelKey} className={`bg-[#111] border ${border} rounded-xl px-5 py-4 flex items-center gap-4`}>
                        <div className={`p-2.5 rounded-lg ${color.split(' ')[0]}`}>
                            <Icon size={18} className={color.split(' ')[1]} />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{t(labelKey)}</p>
                            <p className={`text-2xl font-black ${color.split(' ')[1]}`}>{loading ? '–' : value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filter Bar ── */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                    <input
                        type="text"
                        placeholder={t('coupons:filters.searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#111] border border-white/[0.08] rounded-lg pl-9 pr-8 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/60 transition-colors"
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

                {/* Status filter pills */}
                <div className="flex gap-1.5 flex-wrap">
                    {statFilters.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setStatusFilter(f.key)}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${statusFilter === f.key
                                ? 'bg-primary/15 border-primary/40 text-primary'
                                : 'bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={loadCoupons}
                    disabled={loading}
                    className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-white/50 hover:text-white border border-white/[0.08] hover:border-white/20 rounded-lg transition-all"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    {t('coupons:filters.refresh')}
                </button>
            </div>

            {/* ── Table ── */}
            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden flex-1">
                {error ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <AlertTriangle size={40} className="text-red-400 mb-4" />
                        <p className="text-white/60 font-medium mb-6">{error}</p>
                        <button
                            onClick={loadCoupons}
                            className="text-xs font-bold uppercase tracking-wider text-primary border border-primary/30 px-4 py-2 rounded-lg hover:bg-primary/10 transition-all"
                        >
                            {t('coupons:feedback.retry')}
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/[0.025] border-b border-white/[0.06]">
                                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">{t('coupons:table.code')}</th>
                                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">{t('coupons:table.type')}</th>
                                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">{t('coupons:table.condition')}</th>
                                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">{t('coupons:table.period')}</th>
                                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 text-center">{t('coupons:table.usage')}</th>
                                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">{t('coupons:table.status')}</th>
                                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 text-center w-24">{t('coupons:table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
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
                                        const statusClassName = STATUS_CLASS_MAP[c.status] ?? STATUS_CLASS_MAP.INACTIVE;
                                        const usagePct = c.usageLimit > 0 ? Math.min(100, (c.usedCount / c.usageLimit) * 100) : 0;

                                        return (
                                            <tr
                                                key={c.couponId}
                                                className="border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors"
                                            >
                                                {/* Code */}
                                                <td className="px-5 py-4">
                                                    <code className="font-mono font-bold text-sm text-white bg-white/5 border border-white/[0.08] px-2.5 py-1 rounded-lg tracking-wider">
                                                        {c.code}
                                                    </code>
                                                </td>

                                                {/* Type + Value */}
                                                <td className="px-5 py-4">
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
                                                <td className="px-5 py-4">
                                                    <p className="text-xs text-white/60">
                                                        Đơn tối thiểu:{' '}
                                                        <span className="font-semibold text-white">
                                                            {c.minOrderValue > 0 ? fmtCurrency(c.minOrderValue) : 'Không giới hạn'}
                                                        </span>
                                                    </p>
                                                    <p className="text-[11px] text-white/40 mt-0.5">
                                                        {c.usagePerUser} lần / khách
                                                    </p>
                                                </td>

                                                {/* Dates */}
                                                <td className="px-5 py-4">
                                                    <p className="text-xs text-white/60">{fmtDate(c.startDate)}</p>
                                                    <p className="text-[11px] text-white/30 mt-0.5">đến {fmtDate(c.endDate)}</p>
                                                </td>

                                                {/* Usage bar */}
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <span className="text-sm font-bold text-white tabular-nums">
                                                            {c.usedCount}
                                                            <span className="text-white/30 font-normal">/{c.usageLimit}</span>
                                                        </span>
                                                        <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${usagePct >= 100 ? 'bg-red-500' : usagePct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                                                    }`}
                                                                style={{ width: `${usagePct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="px-5 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusClassName}`}
                                                    >
                                                        <StatusIcon size={10} />
                                                        {statusLabel}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            onClick={() => openEdit(c)}
                                                            title={t('coupons:form.titleEdit')}
                                                            className="p-1.5 rounded-lg text-white/25 hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteTarget(c)}
                                                            title={t('coupons:delete.action')}
                                                            disabled={!c.isActive}
                                                            className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
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
            </div>

            {/* ── Pagination ── */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 text-xs font-semibold text-white/50 hover:text-white border border-white/10 hover:border-white/25 rounded-lg transition-all disabled:opacity-20"
                    >
                        ← Trước
                    </button>
                    <span className="text-xs text-white/40 px-2">
                        Trang {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 text-xs font-semibold text-white/50 hover:text-white border border-white/10 hover:border-white/25 rounded-lg transition-all disabled:opacity-20"
                    >
                        Tiếp →
                    </button>
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

            {/* ── Toast ── */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};
