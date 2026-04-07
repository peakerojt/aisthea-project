import { logger } from '../../lib/logger';
import { createVerificationToken } from '../verification.service';

const deleteManyMock = jest.fn();
const createMock = jest.fn();
const upsertEmailJobMock = jest.fn();
const transactionMock = jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
  callback({
    emailVerificationToken: {
      deleteMany: deleteManyMock,
      create: createMock,
    },
    emailJob: {
      upsert: upsertEmailJobMock,
    },
  }),
);

jest.mock('../../utils/prisma', () => ({
  prisma: {
    $transaction: (callback: (tx: unknown) => Promise<unknown>) => transactionMock(callback),
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('createVerificationToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deleteManyMock.mockResolvedValue({ count: 0 });
    createMock.mockResolvedValue({});
    upsertEmailJobMock.mockResolvedValue({
      emailJobId: 1,
      eventKey: 'verify-email:12:123456',
    });
  });

  it('stores a token and enqueues a verification email job before resolving', async () => {
    const token = await createVerificationToken(12, 'user@example.com', 'Test User');

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { userId: 12 } });
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 12,
          token: expect.stringMatching(/^\d{6}$/),
          expiresAt: expect.any(Date),
        }),
      }),
    );
    expect(upsertEmailJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventKey: `verify-email:12:${token}` },
        create: expect.objectContaining({
          eventKey: `verify-email:12:${token}`,
          eventType: 'AUTH_VERIFICATION',
          recipient: 'user@example.com',
          payloadJson: JSON.stringify({
            userId: 12,
            fullName: 'Test User',
            code: token,
          }),
        }),
      }),
    );
    expect(token).toMatch(/^\d{6}$/);
  });

  it('throws an auth AppError when the email job cannot be enqueued', async () => {
    upsertEmailJobMock.mockRejectedValue(new Error('queue offline'));

    await expect(createVerificationToken(99, 'fail@example.com', 'Broken Mail')).rejects.toMatchObject({
      statusCode: 503,
      errorCode: 'EMAIL_ENQUEUE_FAILED',
      messageKey: 'auth:errors.verificationEmailFailed',
    });

    expect(logger.error).toHaveBeenCalledWith(
      '[verificationService] Failed to enqueue verification email',
      expect.objectContaining({
        userId: 99,
        email: 'fail@example.com',
      }),
    );
  });
});
