import type { ReturnRequestDetail } from '@/common/services/return.types';

export interface AdminReturnReviewActions {
  acceptForRefund: (returnId: number) => Promise<void>;
  approve: (returnId: number) => Promise<void>;
  markInTransit: (returnId: number) => Promise<void>;
  markReceived: (returnId: number) => Promise<void>;
  reject: (returnId: number, note: string) => Promise<void>;
  refund: (returnId: number) => Promise<void>;
  setRefundFailed: (returnId: number, note: string) => Promise<void>;
  setRefundManualReview: (returnId: number, note: string) => Promise<void>;
  setRefundPending: (returnId: number) => Promise<void>;
  setRefundProcessing: (returnId: number) => Promise<void>;
}

export type AdminReturnRecord = ReturnRequestDetail & {
  order?: {
    orderId?: number;
    orderNumber?: string;
    totalAmount?: string;
    customerName?: string;
    customerPhone?: string;
  };
  user?: {
    userId?: number;
    fullName?: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;
};

export type AdminReturnListPayload = {
  data: AdminReturnRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
