export type ReturnReason =
  | 'DEFECTIVE'
  | 'WRONG_ITEM'
  | 'SIZE_ISSUE'
  | 'CHANGED_MIND'
  | 'PRE_DELIVERY_CANCELLATION'
  | 'OTHER';

export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RECEIVED'
  | 'REFUNDED';

export type ReturnStatusBucket = ReturnStatus;

export type ReturnWorkflowStatus =
  | 'REQUESTED'
  | 'SUBMITTED'
  | 'PENDING_PAYMENT_CONFIRMATION'
  | 'PENDING_ADMIN_REVIEW'
  | 'APPROVED'
  | 'IN_RETURN_TRANSIT'
  | 'REJECTED'
  | 'RECEIVED'
  | 'RECEIVED_AND_INSPECTING'
  | 'ACCEPTED_FOR_REFUND'
  | 'REFUNDED'
  | 'CLOSED';

export type LegacyReturnWorkflowStatus = 'PENDING_APPROVAL' | 'COMPLETED';
export type LegacyReturnStatus = LegacyReturnWorkflowStatus;
export type RawReturnStatus = ReturnStatus | LegacyReturnWorkflowStatus | string;
export type RawReturnWorkflowStatus = ReturnWorkflowStatus | LegacyReturnWorkflowStatus | string;

export interface ReturnEconomicsSummary {
  totalGrossAmount: string | number;
  totalDiscountAmount: string | number;
  totalNetPaidAmount: string | number;
  totalRequestedRefundAmount: string | number;
  hasSnapshotBreakdown: boolean;
}

export type RefundMethod = 'ORIGINAL_PAYMENT' | 'WALLET_CREDIT';
export type RefundTransactionMethod = RefundMethod | 'BANK_TRANSFER' | string;
export type RefundWorkflowStatus =
  | 'NOT_APPLICABLE'
  | 'LOCKED_UNTIL_PAYMENT_CONFIRMED'
  | 'PENDING'
  | 'PROCESSING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'FAILED'
  | 'MANUAL_REVIEW';

export interface ReturnBankInfo {
  available: boolean;
  bankAccountId: number | null;
  bankName: string | null;
  bankCode?: string | null;
  accountNumber?: string | null;
  accountNumberMasked: string | null;
  accountHolder: string | null;
  qrImageUrl: string | null;
  inputMethod: string | null;
  updatedAt: string | Date | null;
  source?: string | null;
}

export interface ReturnRefundPayoutProof {
  refundPayoutProofId: number;
  refundTransactionId?: number | null;
  fileUrl: string;
  fileName?: string | null;
  mimeType?: string | null;
  note?: string | null;
  createdAt: string;
  uploadedBy?: {
    userId?: number;
    fullName?: string | null;
  } | null;
}

export interface ReturnRefundBenefit {
  refundBenefitId: number;
  benefitType: 'FREESHIP' | 'PERCENTAGE' | string;
  percentValue?: number | null;
  maxDiscountAmount?: number | null;
  minOrderValue?: number | null;
  status?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  issuedAt?: string | null;
  usedAt?: string | null;
  summary: string;
  couponId?: number | null;
  couponSource?: string | null;
}

export interface OrderReturn {
  returnId: number;
  orderId: number;
  userId: number | null;
  reason: string;
  proofImages: string[];
  status: RawReturnStatus;
  statusBucket?: ReturnStatusBucket;
  workflowStatus?: RawReturnWorkflowStatus;
  refundStatus?: RefundWorkflowStatus;
  adminNote: string | null;
  financeNote?: string | null;
  financeNoteUpdatedAt?: string | null;
  financeNoteUpdatedBy?: {
    userId?: number;
    fullName?: string | null;
  } | null;
  bankInfo?: ReturnBankInfo | null;
  bankInfoRequestedAt?: string | null;
  bankInfoSubmittedAt?: string | null;
  refundCompletedAt?: string | null;
  refundBenefit?: ReturnRefundBenefit | null;
  totalRefundAmount?: string | number | null;
  refundableCapAmount?: string | number | null;
  createdAt: string;
  updatedAt: string;
  items?: ReturnRequestItem[];
  economicsSummary?: ReturnEconomicsSummary;
  refundTransactions?: ReturnRefundTransaction[];
  refundPayoutProofs?: ReturnRefundPayoutProof[];
  order?: {
    orderNumber: string;
    totalAmount: string;
    customerName: string;
    customerPhone: string;
  };
  user?: {
    userId: number;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  } | null;
}

export interface ReturnListResponse {
  returns: OrderReturn[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export type ReturnServiceEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  code?: string;
};

export interface ReturnRequestItem {
  returnRequestItemId?: number;
  orderItemId: number;
  quantity: number;
  unitPrice?: string | number | null;
  requestedRefundAmount?: string | number | null;
  orderItemGrossAmount?: string | number | null;
  orderItemAllocatedDiscountAmount?: string | number | null;
  orderItemNetPaidAmount?: string | number | null;
  reason?: ReturnReason | null;
  reasonText?: string | null;
  attachments?: ReturnRequestAttachment[];
  orderItem?: {
    orderItemId: number;
    productName?: string | null;
    variantName?: string | null;
    unitPrice?: string | number | null;
    quantity?: number;
    thumbnailUrl?: string | null;
    imageUrl?: string | null;
    product?: {
      thumbnailUrl?: string | null;
      imageUrl?: string | null;
      images?: Array<{
        imageUrl?: string | null;
        thumbnailUrl?: string | null;
      }>;
    } | null;
  };
}

export interface ReturnRequestAttachment {
  attachmentId?: number;
  returnRequestItemId?: number | null;
  fileUrl: string;
}

export interface ReturnRequestStatusLog {
  logId: number;
  fromStatus?: RawReturnWorkflowStatus | null;
  toStatus: RawReturnWorkflowStatus;
  fromWorkflowStatus?: RawReturnWorkflowStatus | null;
  toWorkflowStatus?: RawReturnWorkflowStatus;
  comment?: string | null;
  createdAt: string;
  changedByUser?: {
    userId?: number;
    fullName?: string | null;
  } | null;
}

export interface ReturnRefundTransaction {
  transactionId?: number;
  refundTransactionId?: number;
  amount: number;
  method: RefundTransactionMethod;
  status: string;
  transactionRef?: string;
}

export interface ReturnRequest {
  returnRequestId: number;
  orderId: number;
  userId: number | null;
  reason: ReturnReason;
  status: RawReturnStatus;
  statusBucket?: ReturnStatusBucket;
  workflowStatus?: RawReturnWorkflowStatus;
  refundStatus?: RefundWorkflowStatus;
  financeNote?: string | null;
  financeNoteUpdatedAt?: string | null;
  financeNoteUpdatedBy?: {
    userId?: number;
    fullName?: string | null;
  } | null;
  bankInfo?: ReturnBankInfo | null;
  bankInfoRequestedAt?: string | null;
  bankInfoSubmittedAt?: string | null;
  refundCompletedAt?: string | null;
  refundBenefit?: ReturnRefundBenefit | null;
  note?: string | null;
  totalRefundAmount: string | number;
  refundableCapAmount?: string | number | null;
  createdAt: string;
  updatedAt?: string;
  items?: ReturnRequestItem[];
  economicsSummary?: ReturnEconomicsSummary;
}

export interface ReturnRequestDetail extends ReturnRequest {
  attachments?: ReturnRequestAttachment[];
  statusLogs?: ReturnRequestStatusLog[];
  refundTransactions?: ReturnRefundTransaction[];
  refundPayoutProofs?: ReturnRefundPayoutProof[];
}

export interface MyReturnListResponse {
  data: ReturnRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MyReturnSummary {
  returnRequestId: number;
  orderId: number;
  statusBucket?: ReturnStatusBucket;
  workflowStatus?: RawReturnWorkflowStatus;
  refundStatus?: RefundWorkflowStatus;
  totalRefundAmount?: string | number | null;
  refundableCapAmount?: string | number | null;
  updatedAt?: string | null;
  financeNote?: string | null;
  financeNoteUpdatedAt?: string | null;
  financeNoteUpdatedBy?: {
    userId?: number;
    fullName?: string | null;
  } | null;
  economicsSummary?: ReturnEconomicsSummary;
}

export interface CreateReturnPayload {
  orderId: number;
  reason?: ReturnReason;
  note?: string;
  requestNote?: string;
  items: Array<{
    orderItemId: number;
    quantity: number;
    reason?: ReturnReason;
    reasonCode?: ReturnReason;
    reasonText?: string;
    attachments?: Array<string | { url: string; type?: string }>;
  }>;
  attachments?: Array<string | { url: string; type?: string }>;
}

export interface CompleteBankRefundPayload {
  amount: number;
  transactionRef?: string;
  financeNote?: string;
  proofImageUrls: string[];
  selectedBankAccountId?: number;
}
