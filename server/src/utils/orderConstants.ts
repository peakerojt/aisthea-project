// ─────────────────────────────────────────────────────────────────────────────
// Order Status State Machine
// ─────────────────────────────────────────────────────────────────────────────

export const ORDER_STATUS = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    SHIPPING: 'SHIPPING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
} as const;

export type OrderStatusValue = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

/**
 * Valid next-state transitions for each status.
 * Any transition not listed here is FORBIDDEN.
 *
 * PENDING    → PROCESSING | CANCELLED
 * PROCESSING → SHIPPING   | CANCELLED
 * SHIPPING   → COMPLETED
 * COMPLETED  → (terminal)
 * CANCELLED  → (terminal)
 */
export const VALID_TRANSITIONS: Record<string, string[]> = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.COMPLETED],
    [ORDER_STATUS.COMPLETED]: [],
    [ORDER_STATUS.CANCELLED]: [],
};

export const STATUS_LABELS: Record<string, string> = {
    [ORDER_STATUS.PENDING]: 'Chờ xác nhận',
    [ORDER_STATUS.PROCESSING]: 'Đang chuẩn bị hàng',
    [ORDER_STATUS.SHIPPING]: 'Đang giao hàng',
    [ORDER_STATUS.COMPLETED]: 'Giao thành công',
    [ORDER_STATUS.CANCELLED]: 'Đã hủy',
};
