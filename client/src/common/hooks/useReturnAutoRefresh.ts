import { useEffect, useRef } from 'react';
import {
  RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS,
  shouldRefreshOnVisibilityResume,
  shouldRunReturnPollingNow,
} from '@/common/utils/returnRefresh';

type UseReturnAutoRefreshOptions = {
  enabled: boolean;
  onRefresh: () => void | Promise<void>;
  intervalMs?: number;
};

export const useReturnAutoRefresh = ({
  enabled,
  onRefresh,
  intervalMs = RETURN_ACTIVE_SYNC_POLL_INTERVAL_MS,
}: UseReturnAutoRefreshOptions) => {
  const refreshRef = useRef(onRefresh);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const runRefresh = () => {
      if (!shouldRunReturnPollingNow(document)) {
        return;
      }

      lastRefreshAtRef.current = Date.now();
      void refreshRef.current();
    };

    const intervalId = window.setInterval(runRefresh, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, intervalMs]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (!shouldRefreshOnVisibilityResume({
        doc: document,
        lastRefreshAt: lastRefreshAtRef.current,
      })) {
        return;
      }

      lastRefreshAtRef.current = Date.now();
      void refreshRef.current();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);
};
