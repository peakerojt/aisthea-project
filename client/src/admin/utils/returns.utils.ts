import type { RefundWorkflowStatus } from '@/common/services/return.types';
import { canonicalizeWorkflowStatusFallback } from '@/common/utils/returnStatus';

const ADMIN_RETURN_STATUS_FALLBACKS: Partial<Record<string, string>> = {
    SUBMITTED: 'Chờ duyệt',
    REQUESTED: 'Chờ duyệt',
    PENDING_PAYMENT_CONFIRMATION: 'Chờ xác nhận thanh toán',
    PENDING_ADMIN_REVIEW: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    IN_RETURN_TRANSIT: 'Đang hoàn về kho',
    REJECTED: 'Đã từ chối',
    RECEIVED: 'Đã nhận hàng',
    RECEIVED_AND_INSPECTING: 'Đang kiểm tra',
    ACCEPTED_FOR_REFUND: 'Chấp nhận hoàn tiền',
    CLOSED: 'Đã đóng',
    REFUNDED: 'Đã hoàn tiền',
};

const ADMIN_REFUND_STATUS_FALLBACKS: Record<RefundWorkflowStatus, string> = {
    NOT_APPLICABLE: 'Chưa mở hoàn tiền',
    LOCKED_UNTIL_PAYMENT_CONFIRMED: 'Khóa tới khi xác nhận thanh toán',
    PENDING: 'Chờ hoàn tiền',
    PROCESSING: 'Đang hoàn tiền',
    PARTIALLY_REFUNDED: 'Hoàn tiền một phần',
    REFUNDED: 'Đã hoàn tiền',
    FAILED: 'Hoàn tiền thất bại',
    MANUAL_REVIEW: 'Cần kiểm tra thủ công',
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

const normalizeAdminWorkflowStatus = (status?: string | null) =>
    canonicalizeWorkflowStatusFallback(status);

export const getAdminReturnStatusLabel = (
    status: string,
    t: (key: string, options?: Record<string, unknown>) => string,
) => {
    const normalizedStatus = normalizeAdminWorkflowStatus(status);
    const labelKey = `status.${normalizedStatus}`;
    const translated = t(labelKey);

    if (translated !== labelKey) return translated;
    if (ADMIN_RETURN_STATUS_FALLBACKS[normalizedStatus]) return ADMIN_RETURN_STATUS_FALLBACKS[normalizedStatus];
    return normalizedStatus;
};

export const getAdminReturnStatusBadgeTone = (status: string) => {
    const normalizedStatus = normalizeAdminWorkflowStatus(status);

    if (['REQUESTED', 'PENDING_PAYMENT_CONFIRMATION', 'PENDING_ADMIN_REVIEW', 'SUBMITTED'].includes(normalizedStatus)) {
        return 'warning' as const;
    }
    if (['APPROVED', 'IN_RETURN_TRANSIT', 'RECEIVED', 'RECEIVED_AND_INSPECTING', 'ACCEPTED_FOR_REFUND'].includes(normalizedStatus)) {
        return 'info' as const;
    }
    if (normalizedStatus === 'REJECTED') return 'danger' as const;
    if (['REFUNDED', 'CLOSED'].includes(normalizedStatus)) return 'success' as const;
    return 'default' as const;
};

export const getAdminRefundStatusLabel = (
    refundStatus: RefundWorkflowStatus,
    t: (key: string, options?: Record<string, unknown>) => string,
) => {
    const labelKey = `refundStatus.${refundStatus}`;
    const translated = t(labelKey);

    if (translated !== labelKey) return translated;
    return ADMIN_REFUND_STATUS_FALLBACKS[refundStatus] ?? refundStatus;
};

export const getAdminRefundStatusBadgeTone = (refundStatus: RefundWorkflowStatus) => {
    if (refundStatus === 'NOT_APPLICABLE') return 'default' as const;
    if (refundStatus === 'LOCKED_UNTIL_PAYMENT_CONFIRMED') return 'warning' as const;
    if (refundStatus === 'PENDING' || refundStatus === 'PROCESSING') return 'info' as const;
    if (refundStatus === 'PARTIALLY_REFUNDED') return 'info' as const;
    if (refundStatus === 'REFUNDED') return 'success' as const;
    if (refundStatus === 'FAILED' || refundStatus === 'MANUAL_REVIEW') return 'danger' as const;
    return 'default' as const;
};
