// ─────────────────────────────────────────────────────────────────────────────
// Order Status Finite State Machine — Single Source of Truth (Server)
// Used by: controllers/order.controller.ts, utils/orderConstants.ts (deprecated)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical status values stored in the database (PascalCase).
 * All backend logic MUST use these values directly.
 */
export const ORDER_STATUS = {
    PENDING: 'Pending',
    PAID: 'Paid',
    PROCESSING: 'Processing',
    SHIPPING: 'Shipping',
    DELIVERED: 'Delivered',
    RETURN_REQUESTED: 'Return_Requested',
    CANCELLED: 'Cancelled',
    RETURNED: 'Returned',
} as const;

export type OrderStatusValue = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/**
 * FSM: Valid state transitions.
 * Any transition not listed is FORBIDDEN — throw 400.
 *
 * Pending          → Processing | Paid | Cancelled
 * Paid             → Processing | Cancelled
 * Processing       → Shipping | Cancelled
 * Shipping         → Delivered | Returned | Return_Requested
 * Delivered        → Returned | Return_Requested
 * Return_Requested → Returned
 * Cancelled        → (terminal)
 * Returned         → (terminal)
 */
export const FSM_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PAID]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.RETURNED, ORDER_STATUS.RETURN_REQUESTED],
    [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.RETURNED, ORDER_STATUS.RETURN_REQUESTED],
    [ORDER_STATUS.RETURN_REQUESTED]: [ORDER_STATUS.RETURNED],
    [ORDER_STATUS.CANCELLED]: [],
    [ORDER_STATUS.RETURNED]: [],
};

// STATUS_LABELS (Vietnamese UI strings) have been removed.
// The Frontend is the single owner of all translations via react-i18next.
// Use enums.orderStatus.{status} in the FE locale files instead.

/**
 * Helper: returns the valid next statuses from a current status.
 */
export function getValidNextStatuses(currentStatus: string): OrderStatusValue[] {
    return FSM_TRANSITIONS[currentStatus as OrderStatusValue] ?? [];
}

/**
 * Helper: checks whether a transition is valid.
 */
export function isValidTransition(from: string, to: string): boolean {
    const allowed = FSM_TRANSITIONS[from as OrderStatusValue];
    return Array.isArray(allowed) && allowed.includes(to as OrderStatusValue);
}

/**
 * Terminal states — no further transitions allowed.
 */
export const TERMINAL_STATUSES: OrderStatusValue[] = [
    ORDER_STATUS.DELIVERED,
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.RETURNED,
];

/**
 * Statuses that should trigger inventory restoration.
 */
export const INVENTORY_RESTORE_STATUSES: OrderStatusValue[] = [
    ORDER_STATUS.CANCELLED,
    ORDER_STATUS.RETURN_REQUESTED,
    ORDER_STATUS.RETURNED,
];

