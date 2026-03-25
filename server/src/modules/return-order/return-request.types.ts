export const RETURN_REQUEST_STATUSES = [
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'RECEIVED',
  'REFUNDED',
] as const;

export type ReturnRequestStatus = (typeof RETURN_REQUEST_STATUSES)[number];

export const ACTIVE_RETURN_REQUEST_STATUSES: ReturnRequestStatus[] = [
  'REQUESTED',
  'APPROVED',
  'RECEIVED',
  'REFUNDED',
];

export const RETURN_REFUND_METHODS = ['ORIGINAL_PAYMENT', 'WALLET_CREDIT'] as const;

export type RefundMethod = (typeof RETURN_REFUND_METHODS)[number];

/** Valid state machine transitions for return requests. */
export const RETURN_REQUEST_TRANSITIONS: Record<ReturnRequestStatus, ReturnRequestStatus[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['RECEIVED'],
  REJECTED: [],
  RECEIVED: ['REFUNDED'],
  REFUNDED: [],
};
