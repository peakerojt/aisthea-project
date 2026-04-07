import { logger } from '../../lib/logger';
import { emailDispatcher } from './email-dispatcher.service';
import { EMAIL_JOB_STATUS, emailJobRepository } from './email-job.repository';
import { serializeMailError } from './email.providers';

const DEFAULT_POLL_INTERVAL_MS = 10_000;
const DEFAULT_BATCH_LIMIT = 10;
const DEFAULT_STALE_PROCESSING_MS = 5 * 60_000;
const DEFAULT_FAILED_BACKLOG_ALERT_THRESHOLD = 10;

let activeRun: Promise<void> | null = null;
let stopRequested = false;

type ProcessPendingEmailJobsOptions = {
  staleProcessingMs?: number;
};

const summarizeBatchCounts = (
  entries: Array<{ eventType: string; sent: number; failed: number }>,
) => {
  return entries.reduce<Record<string, { sent: number; failed: number }>>((summary, entry) => {
    summary[entry.eventType] = {
      sent: entry.sent,
      failed: entry.failed,
    };
    return summary;
  }, {});
};

const sumEventCount = (
  entries: Record<string, { sent: number; failed: number }>,
  field: 'sent' | 'failed',
) => Object.values(entries).reduce((sum, entry) => sum + entry[field], 0);

export const processPendingEmailJobs = async (
  limit = DEFAULT_BATCH_LIMIT,
  options?: ProcessPendingEmailJobsOptions,
) => {
  if (activeRun) {
    return activeRun;
  }

  activeRun = (async () => {
    const staleProcessingMs = options?.staleProcessingMs ?? DEFAULT_STALE_PROCESSING_MS;
    const staleBefore = new Date(Date.now() - staleProcessingMs);
    const failedBacklogAlertThreshold = Number.parseInt(
      process.env.EMAIL_WORKER_FAILED_ALERT_THRESHOLD ?? '',
      10,
    );
    const resolvedFailedBacklogAlertThreshold =
      Number.isFinite(failedBacklogAlertThreshold) && failedBacklogAlertThreshold > 0
        ? failedBacklogAlertThreshold
        : DEFAULT_FAILED_BACKLOG_ALERT_THRESHOLD;
    const reclaimedJobs = await emailJobRepository.requeueStuckProcessingJobs(staleBefore);

    if (reclaimedJobs > 0) {
      logger.warn('[emailWorker] Requeued stale processing jobs', {
        reclaimedJobs,
        staleProcessingMs,
        staleBefore: staleBefore.toISOString(),
      });
    }

    const pendingJobs = await emailJobRepository.findPending(limit);
    const perEventCounts = new Map<string, { sent: number; failed: number }>();

    for (const job of pendingJobs) {
      if (stopRequested) {
        break;
      }

      const claimed = await emailJobRepository.claim(job.emailJobId);
      if (!claimed) {
        continue;
      }

      const eventCounts = perEventCounts.get(job.eventType) ?? { sent: 0, failed: 0 };

      try {
        const startedAt = Date.now();
        const dispatchResult = await emailDispatcher.dispatchEmailJob(job);
        await emailJobRepository.markSent(job.emailJobId, dispatchResult);
        eventCounts.sent += 1;
        perEventCounts.set(job.eventType, eventCounts);

        logger.debug('[emailWorker] Email job sent', {
          emailJobId: job.emailJobId,
          eventType: job.eventType,
          recipient: job.recipient,
          provider: dispatchResult.provider,
          messageId: dispatchResult.messageId,
          durationMs: Date.now() - startedAt,
        });
      } catch (error) {
        const serializedError = serializeMailError(error);
        await emailJobRepository.markRetryOrFail(
          job,
          typeof serializedError.message === 'string'
            ? serializedError.message
            : JSON.stringify(serializedError),
        );
        eventCounts.failed += 1;
        perEventCounts.set(job.eventType, eventCounts);

        logger.warn('[emailWorker] Email job failed', {
          emailJobId: job.emailJobId,
          eventType: job.eventType,
          recipient: job.recipient,
          attempts: job.attempts + 1,
          mailError: serializedError,
        });
      }
    }

    const queueSummary = await emailJobRepository.getQueueSummary([
      EMAIL_JOB_STATUS.PENDING,
      EMAIL_JOB_STATUS.PROCESSING,
      EMAIL_JOB_STATUS.FAILED,
    ]);
    const batchSummary = summarizeBatchCounts(
      Array.from(perEventCounts.entries()).map(([eventType, counts]) => ({
        eventType,
        ...counts,
      })),
    );
    const failedBacklogCount = queueSummary.byStatus[EMAIL_JOB_STATUS.FAILED] ?? 0;
    const processingBacklogCount = queueSummary.byStatus[EMAIL_JOB_STATUS.PROCESSING] ?? 0;
    const pendingBacklogCount = queueSummary.byStatus[EMAIL_JOB_STATUS.PENDING] ?? 0;
    const batchFailedCount = sumEventCount(batchSummary, 'failed');

    if (pendingJobs.length > 0 || reclaimedJobs > 0 || queueSummary.total > 0) {
      logger.info('[emailWorker] Batch summary', {
        polledJobs: pendingJobs.length,
        reclaimedJobs,
        queueSummary,
        byEventType: batchSummary,
      });
    }

    if (queueSummary.total > 0) {
      logger.info('[emailWorker] Queue backlog snapshot', {
        pending: pendingBacklogCount,
        processing: processingBacklogCount,
        failed: failedBacklogCount,
        byEventType: queueSummary.byEventType,
      });
    }

    if (
      failedBacklogCount >= resolvedFailedBacklogAlertThreshold
      || batchFailedCount >= resolvedFailedBacklogAlertThreshold
    ) {
      logger.error('[emailWorker] Failed queue backlog alert', {
        threshold: resolvedFailedBacklogAlertThreshold,
        batchFailedCount,
        failedBacklogCount,
        byEventType: queueSummary.byEventType,
      });
    }
  })();

  try {
    await activeRun;
  } finally {
    activeRun = null;
  }
};

export const startEmailJobWorker = (options?: {
  intervalMs?: number;
  batchLimit?: number;
  staleProcessingMs?: number;
}) => {
  if (process.env.NODE_ENV === 'test') {
    return async () => undefined;
  }

  const intervalMs = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const batchLimit = options?.batchLimit ?? DEFAULT_BATCH_LIMIT;
  const staleProcessingMs = options?.staleProcessingMs ?? DEFAULT_STALE_PROCESSING_MS;

  stopRequested = false;

  void processPendingEmailJobs(batchLimit, { staleProcessingMs });

  const timer = setInterval(() => {
    void processPendingEmailJobs(batchLimit, { staleProcessingMs });
  }, intervalMs);

  timer.unref?.();

  return async () => {
    stopRequested = true;
    clearInterval(timer);

    if (activeRun) {
      await activeRun;
    }
  };
};
