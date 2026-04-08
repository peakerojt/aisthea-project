export const AUTH_EMAIL_EVENT_TYPE = {
  VERIFICATION: 'AUTH_VERIFICATION',
  PASSWORD_RESET: 'AUTH_PASSWORD_RESET',
} as const;

export const ORDER_EMAIL_EVENT_TYPE = {
  ORDER_PLACED: 'ORDER_PLACED',
  ORDER_STATUS_UPDATED: 'ORDER_STATUS_UPDATED',
} as const;

export const REFUND_EMAIL_EVENT_TYPE = {
  REFUND_ACCEPTED_BANK_INFO_REQUIRED: 'REFUND_ACCEPTED_BANK_INFO_REQUIRED',
  REFUND_ACCEPTED_AWAITING_PAYOUT: 'REFUND_ACCEPTED_AWAITING_PAYOUT',
  REFUND_COMPLETED_BENEFIT_ISSUED: 'REFUND_COMPLETED_BENEFIT_ISSUED',
} as const;

export type AuthEmailEventType =
  (typeof AUTH_EMAIL_EVENT_TYPE)[keyof typeof AUTH_EMAIL_EVENT_TYPE];
export type OrderEmailEventType =
  (typeof ORDER_EMAIL_EVENT_TYPE)[keyof typeof ORDER_EMAIL_EVENT_TYPE];
export type RefundEmailEventType =
  (typeof REFUND_EMAIL_EVENT_TYPE)[keyof typeof REFUND_EMAIL_EVENT_TYPE];
export type EmailEventType = AuthEmailEventType | OrderEmailEventType | RefundEmailEventType;

export type VerificationEmailPayload = {
  userId: number;
  fullName: string;
  code: string;
  locale?: string | null;
};

export type PasswordResetEmailPayload = {
  userId: number;
  fullName: string;
  code: string;
  locale?: string | null;
};

export type AuthEmailPayloadByType = {
  [AUTH_EMAIL_EVENT_TYPE.VERIFICATION]: VerificationEmailPayload;
  [AUTH_EMAIL_EVENT_TYPE.PASSWORD_RESET]: PasswordResetEmailPayload;
};

export type OrderPlacedEmailPayload = {
  orderId: number;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  paymentMethod: string | null;
  createdAt: string | null;
  orderUrl: string;
  locale?: string | null;
};

export type OrderStatusEmailPayload = {
  orderId: number;
  orderNumber: string;
  customerName: string;
  status: string;
  previousStatus: string | null;
  note: string | null;
  trackingUrl: string;
  locale?: string | null;
};

export type OrderEmailPayloadByType = {
  [ORDER_EMAIL_EVENT_TYPE.ORDER_PLACED]: OrderPlacedEmailPayload;
  [ORDER_EMAIL_EVENT_TYPE.ORDER_STATUS_UPDATED]: OrderStatusEmailPayload;
};

export type RefundAcceptedBankInfoRequiredEmailPayload = {
  returnRequestId: number;
  customerName: string;
  orderNumber: string;
  profileBankLink: string;
  locale?: string | null;
};

export type RefundAcceptedAwaitingPayoutEmailPayload = {
  returnRequestId: number;
  customerName: string;
  orderNumber: string;
  locale?: string | null;
};

export type RefundCompletedBenefitIssuedEmailPayload = {
  returnRequestId: number;
  customerName: string;
  orderNumber: string;
  refundAmount: number;
  refundDate: string;
  voucherSummary: string | null;
  profileLink: string;
  locale?: string | null;
};

export type RefundEmailPayloadByType = {
  [REFUND_EMAIL_EVENT_TYPE.REFUND_ACCEPTED_BANK_INFO_REQUIRED]:
    RefundAcceptedBankInfoRequiredEmailPayload;
  [REFUND_EMAIL_EVENT_TYPE.REFUND_ACCEPTED_AWAITING_PAYOUT]:
    RefundAcceptedAwaitingPayoutEmailPayload;
  [REFUND_EMAIL_EVENT_TYPE.REFUND_COMPLETED_BENEFIT_ISSUED]:
    RefundCompletedBenefitIssuedEmailPayload;
};

export type EmailPayloadByType =
  AuthEmailPayloadByType & OrderEmailPayloadByType & RefundEmailPayloadByType;

export type MailRequest = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type EmailDispatchResult = {
  provider: string;
  messageId?: string;
};
