// ─────────────────────────────────────────────────────────────────────────────
// Order Status Finite State Machine — Single Source of Truth (Client)
// Mirror of server/src/config/orderStatus.config.ts
// All frontend components MUST import from here — no magic strings.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical status values (PascalCase) matching the database.
 */
export const ORDER_STATUS = {
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    SHIPPING: 'Shipping',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    RETURNED: 'Returned',
} as const;

export type OrderStatusValue = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/**
 * Valid state transitions (FSM).
 */
export const FSM_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.RETURNED],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: [],
    [ORDER_STATUS.RETURNED]: [],
};

/**
 * UI metadata for each status — drives badges, timeline dots, action buttons.
 */
export interface StatusMeta {
    label: string;
    /** Lucide icon name */
    icon: string;
    /** Tailwind badge border + bg */
    badgeClass: string;
    /** Tailwind text color */
    textClass: string;
    /** Tailwind filled dot bg */
    dotClass: string;
    /** Tailwind glow/shadow */
    glowClass: string;
    /** Action button bg (for "go to this status" buttons) */
    actionClass: string;
    /** Whether it is a terminal state */
    isTerminal: boolean;
    /** Whether transitioning to this state requires a note/reason */
    requiresNote: boolean;
}

export const ORDER_STATUS_META: Record<OrderStatusValue, StatusMeta> = {
    [ORDER_STATUS.PENDING]: {
        label: 'Chờ xác nhận',
        icon: 'ShoppingBag',
        badgeClass: 'border-amber-500/30 bg-amber-500/10',
        textClass: 'text-amber-400',
        dotClass: 'bg-amber-400 animate-pulse',
        glowClass: 'shadow-amber-500/20',
        actionClass: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30',
        isTerminal: false,
        requiresNote: false,
    },
    [ORDER_STATUS.PROCESSING]: {
        label: 'Đang chuẩn bị hàng',
        icon: 'Package',
        badgeClass: 'border-sky-500/30 bg-sky-500/10',
        textClass: 'text-sky-400',
        dotClass: 'bg-sky-400',
        glowClass: 'shadow-sky-500/20',
        actionClass: 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/30',
        isTerminal: false,
        requiresNote: false,
    },
    [ORDER_STATUS.SHIPPING]: {
        label: 'Đang giao hàng',
        icon: 'Truck',
        badgeClass: 'border-cyan-500/30 bg-cyan-500/10',
        textClass: 'text-cyan-400',
        dotClass: 'bg-cyan-400',
        glowClass: 'shadow-cyan-500/20',
        actionClass: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/30',
        isTerminal: false,
        requiresNote: false,
    },
    [ORDER_STATUS.DELIVERED]: {
        label: 'Giao thành công',
        icon: 'CheckCircle2',
        badgeClass: 'border-emerald-500/30 bg-emerald-500/10',
        textClass: 'text-emerald-400',
        dotClass: 'bg-emerald-400',
        glowClass: 'shadow-emerald-500/20',
        actionClass: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30',
        isTerminal: true,
        requiresNote: false,
    },
    [ORDER_STATUS.CANCELLED]: {
        label: 'Đã hủy',
        icon: 'XCircle',
        badgeClass: 'border-red-500/30 bg-red-500/10',
        textClass: 'text-red-400',
        dotClass: 'bg-red-400',
        glowClass: 'shadow-red-500/20',
        actionClass: 'bg-red-600 hover:bg-red-500 shadow-red-900/30',
        isTerminal: true,
        requiresNote: true, // requires "Lý do hủy"
    },
    [ORDER_STATUS.RETURNED]: {
        label: 'Hoàn trả',
        icon: 'RotateCcw',
        badgeClass: 'border-orange-500/30 bg-orange-500/10',
        textClass: 'text-orange-400',
        dotClass: 'bg-orange-400',
        glowClass: 'shadow-orange-500/20',
        actionClass: 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/30',
        isTerminal: true,
        requiresNote: true, // requires reason for return
    },
};

/** Next action button labels (action verb for transitioning TO a state) */
export const STATUS_ACTION_LABELS: Record<OrderStatusValue, string> = {
    [ORDER_STATUS.PENDING]: 'Chờ xác nhận',
    [ORDER_STATUS.PROCESSING]: 'Xác nhận đơn hàng',
    [ORDER_STATUS.SHIPPING]: 'Bắt đầu giao hàng',
    [ORDER_STATUS.DELIVERED]: 'Xác nhận đã giao',
    [ORDER_STATUS.CANCELLED]: 'Hủy đơn hàng',
    [ORDER_STATUS.RETURNED]: 'Xác nhận hoàn trả',
};

/**
 * Returns the valid next statuses from a given current status.
 */
export function getValidNextStatuses(currentStatus: string): OrderStatusValue[] {
    return FSM_TRANSITIONS[currentStatus as OrderStatusValue] ?? [];
}

/**
 * Returns UI metadata for a given status (safe — falls back to PENDING meta).
 */
export function getStatusMeta(status: string | null | undefined): StatusMeta {
    return ORDER_STATUS_META[status as OrderStatusValue] ?? ORDER_STATUS_META[ORDER_STATUS.PENDING];
}

/**
 * Normalizes any casing variant to the canonical PascalCase value.
 * e.g. "PENDING" | "pending" → "Pending"
 */
export function normalizeStatus(raw: string | null | undefined): OrderStatusValue | null {
    if (!raw) return null;
    const found = Object.values(ORDER_STATUS).find(
        (v) => v.toLowerCase() === raw.toLowerCase()
    );
    return (found as OrderStatusValue) ?? null;
}
