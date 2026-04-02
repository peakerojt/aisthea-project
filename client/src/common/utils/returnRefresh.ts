export const RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS = 30_000;
export const RETURN_VISIBILITY_RESUME_DEBOUNCE_MS = 1_500;

const ACTIVE_REFUND_SYNC_STATUSES = new Set([
  'PENDING',
  'PROCESSING',
  'MANUAL_REVIEW',
  'LOCKED_UNTIL_PAYMENT_CONFIRMED',
]);

export const shouldAutoRefreshRefundState = (refundStatus?: string | null) =>
  ACTIVE_REFUND_SYNC_STATUSES.has(
    String(refundStatus ?? '')
      .trim()
      .replace(/[\s-]+/g, '_')
      .toUpperCase(),
  );

export const shouldRunReturnPollingNow = (
  doc?: Pick<Document, 'visibilityState'> | null,
) => (doc?.visibilityState ?? 'visible') !== 'hidden';

export const shouldRefreshOnVisibilityResume = ({
  doc,
  lastRefreshAt,
  now = Date.now(),
  minGapMs = RETURN_VISIBILITY_RESUME_DEBOUNCE_MS,
}: {
  doc?: Pick<Document, 'visibilityState'> | null;
  lastRefreshAt?: number | null;
  now?: number;
  minGapMs?: number;
}) =>
  shouldRunReturnPollingNow(doc) &&
  (!lastRefreshAt || now - lastRefreshAt >= minGapMs);
