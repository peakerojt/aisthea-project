const findAdminPageMock = jest.fn();
const retryFailedJobMock = jest.fn();
const cleanupTerminalJobsMock = jest.fn();

jest.mock('../email-job.repository', () => ({
  TERMINAL_EMAIL_JOB_STATUSES: ['SENT', 'FAILED'],
  emailJobRepository: {
    findAdminPage: (...args: unknown[]) => findAdminPageMock(...args),
    retryFailedJob: (...args: unknown[]) => retryFailedJobMock(...args),
    cleanupTerminalJobs: (...args: unknown[]) => cleanupTerminalJobsMock(...args),
  },
}));

import { notificationController } from '../notification.controller';

const createResponse = () => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  return response;
};

describe('notificationController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists email jobs with pagination filters', async () => {
    const req = {
      query: {
        page: 2,
        pageSize: 10,
        statuses: ['FAILED'],
        eventType: 'ORDER_PLACED',
        recipient: 'user@example.com',
        search: 'order-placed',
      },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    findAdminPageMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      pageSize: 10,
      totalPages: 0,
      summary: { total: 0, byStatus: {}, byEventType: {} },
    });

    await notificationController.listEmailJobs(req, res as any, next);

    expect(findAdminPageMock).toHaveBeenCalledWith(req.query);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        page: 2,
        pageSize: 10,
      }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 409 when retry is requested for a non-failed job', async () => {
    const req = {
      params: { emailJobId: '51' },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    retryFailedJobMock.mockResolvedValue({
      ok: false,
      reason: 'NOT_RETRYABLE',
      currentStatus: 'PENDING',
    });

    await notificationController.retryEmailJob(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      errorCode: 'EMAIL_JOB_NOT_RETRYABLE',
      message: 'Only failed email jobs can be retried.',
      currentStatus: 'PENDING',
    });
  });

  it('cleans up old terminal jobs with defaults when statuses are omitted', async () => {
    const req = {
      body: {
        olderThanDays: 14,
      },
    } as any;
    const res = createResponse();
    const next = jest.fn();

    cleanupTerminalJobsMock.mockResolvedValue(7);

    await notificationController.cleanupEmailJobs(req, res as any, next);

    expect(cleanupTerminalJobsMock).toHaveBeenCalledWith({
      olderThan: expect.any(Date),
      statuses: ['SENT', 'FAILED'],
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        deletedCount: 7,
        olderThanDays: 14,
        statuses: ['SENT', 'FAILED'],
      },
    });
    expect(next).not.toHaveBeenCalled();
  });
});

