import { normalizeReturnStatus } from '@/common/utils/returnStatus';

const ADMIN_RETURN_STATUS_FALLBACKS: Partial<Record<string, string>> = {
    REQUESTED: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Đã từ chối',
    RECEIVED: 'Đã nhận hàng',
    REFUNDED: 'Đã hoàn tiền',
};

export const formatAdminReturnDateTime = (iso?: string | null) => {
    if (!iso) return '—';

    try {
        return new Date(iso).toLocaleString('vi-VN');
    } catch {
        return String(iso);
    }
};

export const formatAdminReturnMoneyVND = (value: string | number | null | undefined) => {
    const numericValue = typeof value === 'string' ? Number(value) : value ?? 0;
    if (!Number.isFinite(numericValue)) return String(value ?? '');
    return new Intl.NumberFormat('vi-VN').format(numericValue) + ' ₫';
};

export const getAdminReturnStatusLabel = (
    status: string,
    t: (key: string, options?: Record<string, unknown>) => string,
) => {
    const normalizedStatus = normalizeReturnStatus(status);
    const labelKey = `status.${normalizedStatus}`;
    const translated = t(labelKey);

    if (translated !== labelKey) return translated;
    if (ADMIN_RETURN_STATUS_FALLBACKS[normalizedStatus]) return ADMIN_RETURN_STATUS_FALLBACKS[normalizedStatus];
    return normalizedStatus;
};

export const getAdminReturnStatusBadgeTone = (status: string) => {
    const normalizedStatus = normalizeReturnStatus(status);

    if (normalizedStatus === 'REQUESTED') return 'warning' as const;
    if (normalizedStatus === 'APPROVED') return 'info' as const;
    if (normalizedStatus === 'REJECTED') return 'danger' as const;
    if (normalizedStatus === 'RECEIVED') return 'info' as const;
    if (normalizedStatus === 'REFUNDED') return 'success' as const;
    return 'default' as const;
};
