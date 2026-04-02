import { vi } from 'vitest';
import type { AdminReturnReviewActions } from '@/admin/services/types';

type ReviewActionOverrides = Partial<AdminReturnReviewActions>;

const createAsyncHandler = <T extends (...args: any[]) => Promise<void>>() =>
  vi.fn<T>().mockResolvedValue(undefined as Awaited<ReturnType<T>>);

export const createMockReviewActions = (
  overrides: ReviewActionOverrides = {},
): AdminReturnReviewActions => ({
  acceptForRefund: overrides.acceptForRefund ?? createAsyncHandler<AdminReturnReviewActions['acceptForRefund']>(),
  approve: overrides.approve ?? createAsyncHandler<AdminReturnReviewActions['approve']>(),
  markInTransit: overrides.markInTransit ?? createAsyncHandler<AdminReturnReviewActions['markInTransit']>(),
  markReceived: overrides.markReceived ?? createAsyncHandler<AdminReturnReviewActions['markReceived']>(),
  reject: overrides.reject ?? createAsyncHandler<AdminReturnReviewActions['reject']>(),
  refund: overrides.refund ?? createAsyncHandler<AdminReturnReviewActions['refund']>(),
  setRefundFailed: overrides.setRefundFailed ?? createAsyncHandler<AdminReturnReviewActions['setRefundFailed']>(),
  setRefundManualReview: overrides.setRefundManualReview ?? createAsyncHandler<AdminReturnReviewActions['setRefundManualReview']>(),
  setRefundPending: overrides.setRefundPending ?? createAsyncHandler<AdminReturnReviewActions['setRefundPending']>(),
  setRefundProcessing: overrides.setRefundProcessing ?? createAsyncHandler<AdminReturnReviewActions['setRefundProcessing']>(),
});
