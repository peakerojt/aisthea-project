const findPendingMock = jest.fn();
const claimMock = jest.fn();
const markSentMock = jest.fn();
const markRetryOrFailMock = jest.fn();
const requeueStuckProcessingJobsMock = jest.fn();
const getQueueSummaryMock = jest.fn();
const dispatchEmailJobMock = jest.fn();
const serializeMailErrorMock = jest.fn();
const loggerDebugMock = jest.fn();
const loggerWarnMock = jest.fn();
const loggerInfoMock = jest.fn();

jest.mock('../email-job.repository', () => ({
  EMAIL_JOB_STATUS: {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    FAILED: 'FAILED',
  },
  emailJobRepository: {
    findPending: (...args: unknown[]) => findPendingMock(...args),
    claim: (...args: unknown[]) => claimMock(...args),
    markSent: (...args: unknown[]) => markSentMock(...args),
    markRetryOrFail: (...args: unknown[]) => markRetryOrFailMock(...args),
    requeueStuckProcessingJobs: (...args: unknown[]) => requeueStuckProcessingJobsMock(...args),
    getQueueSummary: (...args: unknown[]) => getQueueSummaryMock(...args),
  },
}));

jest.mock('../email-dispatcher.service', () => ({
  emailDispatcher: {
    dispatchEmailJob: (...args: unknown[]) => dispatchEmailJobMock(...args),
  },
}));

jest.mock('../email.providers', () => ({
  serializeMailError: (...args: unknown[]) => serializeMailErrorMock(...args),
}));

jest.mock('../../../lib/logger', () => ({
  logger: {
    debug: (...args: unknown[]) => loggerDebugMock(...args),
    warn: (...args: unknown[]) => loggerWarnMock(...args),
    info: (...args: unknown[]) => loggerInfoMock(...args),
  },
}));

import { processPendingEmailJobs } from '../email-worker';

describe('processPendingEmailJobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    serializeMailErrorMock.mockImplementation((error: Error) => ({ message: error.message }));
    requeueStuckProcessingJobsMock.mockResolvedValue(0);
    getQueueSummaryMock.mockResolvedValue({ total: 0, byStatus: {}, byEventType: {} });
  });

  it('claims and sends pending jobs successfully', async () => {
    findPendingMock.mockResolvedValue([
      {
        emailJobId: 11,
        eventType: 'AUTH_VERIFICATION',
        recipient: 'user@example.com',
        payloadJson: '{"code":"123456"}',
        attempts: 0,
      },
    ]);
    claimMock.mockResolvedValue(true);
    dispatchEmailJobMock.mockResolvedValue({ provider: 'resend', messageId: 'msg_123' });

    await processPendingEmailJobs(5);

    expect(requeueStuckProcessingJobsMock).toHaveBeenCalledTimes(1);
    expect(findPendingMock).toHaveBeenCalledWith(5);
    expect(claimMock).toHaveBeenCalledWith(11);
    expect(markSentMock).toHaveBeenCalledWith(11, { provider: 'resend', messageId: 'msg_123' });
    expect(markRetryOrFailMock).not.toHaveBeenCalled();
    expect(getQueueSummaryMock).toHaveBeenCalledWith(['PENDING', 'PROCESSING', 'FAILED']);
    expect(loggerInfoMock).toHaveBeenCalledWith(
      '[emailWorker] Batch summary',
      expect.objectContaining({
        polledJobs: 1,
        byEventType: {
          AUTH_VERIFICATION: {
            sent: 1,
            failed: 0,
          },
        },
      }),
    );
  });

  it('marks failed jobs for retry when dispatch throws', async () => {
    const pendingJob = {
      emailJobId: 12,
      eventType: 'AUTH_PASSWORD_RESET',
      recipient: 'user@example.com',
      payloadJson: '{"code":"654321"}',
      attempts: 1,
    };

    findPendingMock.mockResolvedValue([pendingJob]);
    claimMock.mockResolvedValue(true);
    dispatchEmailJobMock.mockRejectedValue(new Error('provider offline'));

    await processPendingEmailJobs(5);

    expect(markRetryOrFailMock).toHaveBeenCalledWith(pendingJob, 'provider offline');
    expect(markSentMock).not.toHaveBeenCalled();
  });

  it('requeues stale processing jobs before polling pending work', async () => {
    requeueStuckProcessingJobsMock.mockResolvedValue(2);
    findPendingMock.mockResolvedValue([]);
    getQueueSummaryMock.mockResolvedValue({
      total: 2,
      byStatus: { PENDING: 2 },
      byEventType: { ORDER_PLACED: 2 },
    });

    await processPendingEmailJobs(3, { staleProcessingMs: 1_234 });

    expect(requeueStuckProcessingJobsMock).toHaveBeenCalledWith(expect.any(Date));
    expect(findPendingMock).toHaveBeenCalledWith(3);
    expect(loggerWarnMock).toHaveBeenCalledWith(
      '[emailWorker] Requeued stale processing jobs',
      expect.objectContaining({
        reclaimedJobs: 2,
        staleProcessingMs: 1_234,
      }),
    );
    expect(loggerInfoMock).toHaveBeenCalledWith(
      '[emailWorker] Batch summary',
      expect.objectContaining({
        reclaimedJobs: 2,
        queueSummary: {
          total: 2,
          byStatus: { PENDING: 2 },
          byEventType: { ORDER_PLACED: 2 },
        },
      }),
    );
  });
});
