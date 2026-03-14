// ─────────────────────────────────────────────────────────────────────────────
// Response Keys — Single Source of Truth for BE error codes & success messages
//
// Rules:
//   • ERROR_CODES  → sent as `errorCode` in error responses (4xx / 5xx)
//   • SUCCESS_MESSAGES → sent as `messageKey` in success responses (2xx)
//   • Values are SCREAMING_SNAKE_CASE strings matching FE translation keys
//     in client/src/i18n/locales/vi/errors.json and messages.json
// ─────────────────────────────────────────────────────────────────────────────

export const ERROR_CODES = {
    // ── Generic ──────────────────────────────────────────────────────────────
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    INVALID_BODY: 'INVALID_BODY',

    // ── Order ─────────────────────────────────────────────────────────────────
    INVALID_ORDER_ID: 'INVALID_ORDER_ID',
    ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
    STATUS_REQUIRED: 'STATUS_REQUIRED',
    INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
    CART_EMPTY: 'CART_EMPTY',

    // ── User / Auth ───────────────────────────────────────────────────────────
    INVALID_USER_ID: 'INVALID_USER_ID',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    CANNOT_BAN_SELF: 'CANNOT_BAN_SELF',
    CANNOT_BAN_ADMIN: 'CANNOT_BAN_ADMIN',
    UPDATE_STATUS_FAILED: 'UPDATE_STATUS_FAILED',
    FETCH_USERS_FAILED: 'FETCH_USERS_FAILED',

    // ── Role / Permission ─────────────────────────────────────────────────────
    INVALID_ROLE_ID: 'INVALID_ROLE_ID',
    ROLE_NOT_FOUND: 'ROLE_NOT_FOUND',
    UPDATE_ROLE_FAILED: 'UPDATE_ROLE_FAILED',
    FETCH_ROLES_FAILED: 'FETCH_ROLES_FAILED',
    FETCH_PERMISSIONS_FAILED: 'FETCH_PERMISSIONS_FAILED',
    INVALID_PERMISSION_IDS: 'INVALID_PERMISSION_IDS',
    UPDATE_PERMISSIONS_FAILED: 'UPDATE_PERMISSIONS_FAILED',
    SUPER_ADMIN_PROTECTED: 'SUPER_ADMIN_PROTECTED',

    // ── Return / Refund ───────────────────────────────────────────────────────
    INVALID_RETURN_ID: 'INVALID_RETURN_ID',
    REASON_REQUIRED: 'REASON_REQUIRED',
    INVALID_PROOF_IMAGES: 'INVALID_PROOF_IMAGES',
    ADMIN_REQUIRED: 'ADMIN_REQUIRED',
    INVALID_ACTION: 'INVALID_ACTION',
    ORDER_NOT_DELIVERED: 'ORDER_NOT_DELIVERED',
    RETURN_WINDOW_EXPIRED: 'RETURN_WINDOW_EXPIRED',
    RETURN_ALREADY_EXISTS: 'RETURN_ALREADY_EXISTS',
    ORDER_NOT_PAID: 'ORDER_NOT_PAID',
    OVER_REFUND: 'OVER_REFUND',
    GATEWAY_FAILED: 'GATEWAY_FAILED',
    INVALID_AMOUNT: 'INVALID_AMOUNT',
    MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
    FETCH_REFUND_HISTORY_FAILED: 'FETCH_REFUND_HISTORY_FAILED',

    // ── Confirm Receipt ───────────────────────────────────────────────────────
    ORDER_NOT_SHIPPING: 'ORDER_NOT_SHIPPING',       // Order must be in Shipping state
    NOT_ORDER_OWNER: 'NOT_ORDER_OWNER',              // Requesting user does not own this order

    // ── Review ────────────────────────────────────────────────────────────────
    ORDER_ITEM_NOT_FOUND: 'ORDER_ITEM_NOT_FOUND',               // orderItemId invalid / not owned by user
    REVIEW_ALREADY_EXISTS: 'REVIEW_ALREADY_EXISTS',             // Duplicate review for same orderItemId
    ITEM_NOT_FROM_DELIVERED_ORDER: 'ITEM_NOT_FROM_DELIVERED_ORDER', // Item's order is not Delivered
    RATING_REQUIRED: 'RATING_REQUIRED',                         // Rating must be 1-5

    // ── Product ──────────────────────────────────────────────────────────────
    INVALID_PRODUCT_ID: 'INVALID_PRODUCT_ID',
    PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
    MISSING_PRODUCT_FIELDS: 'MISSING_PRODUCT_FIELDS',
    VARIANTS_REQUIRED: 'VARIANTS_REQUIRED',
    SLUG_ALREADY_EXISTS: 'SLUG_ALREADY_EXISTS',
    SLUG_OR_SKU_EXISTS: 'SLUG_OR_SKU_EXISTS',
    VARIANT_NOT_FOUND: 'VARIANT_NOT_FOUND',
    INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ─────────────────────────────────────────────────────────────────────────────

export const SUCCESS_MESSAGES = {
    ORDER_STATUS_UPDATED: 'ORDER_STATUS_UPDATED',
    ORDER_CREATED: 'ORDER_CREATED',
    PRODUCT_CREATED: 'PRODUCT_CREATED',
    PRODUCT_UPDATED: 'PRODUCT_UPDATED',
    RETURN_APPROVED: 'RETURN_APPROVED',
    RETURN_REJECTED: 'RETURN_REJECTED',
    REFUND_COMPLETED: 'REFUND_COMPLETED',
    REFUND_INITIATED: 'REFUND_INITIATED',
    STATUS_UPDATED: 'STATUS_UPDATED',
    ROLE_UPDATED: 'ROLE_UPDATED',
    PERMISSIONS_UPDATED: 'PERMISSIONS_UPDATED',
    RECEIPT_CONFIRMED: 'RECEIPT_CONFIRMED',
    REVIEW_CREATED: 'REVIEW_CREATED',
} as const;

export type SuccessMessage = (typeof SUCCESS_MESSAGES)[keyof typeof SUCCESS_MESSAGES];
