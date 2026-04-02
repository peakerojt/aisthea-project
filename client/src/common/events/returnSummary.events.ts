export const RETURN_SUMMARY_CHANGED_EVENT = 'returns:summary-changed';

export type ReturnSummaryChangedDetail = {
  orderId?: number;
  returnRequestId?: number | null;
};

export const dispatchReturnSummaryChanged = (detail: ReturnSummaryChangedDetail) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<ReturnSummaryChangedDetail>(RETURN_SUMMARY_CHANGED_EVENT, {
      detail,
    }),
  );
};
