import { AppError } from '../../middlewares/error.middleware';
import { createPasswordResetToken } from '../password.service';

const findUserMock = jest.fn();
const findExistingResetCodeMock = jest.fn();
const deleteResetTokensMock = jest.fn();
const createResetTokenMock = jest.fn();
const upsertEmailJobMock = jest.fn();
const loggerErrorMock = jest.fn();
const transactionMock = jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
  callback({
    passwordResetToken: {
      deleteMany: deleteResetTokensMock,
      create: createResetTokenMock,
    },
    emailJob: {
      upsert: upsertEmailJobMock,
    },
  }),
);

jest.mock('../../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUserMock(...args),
    },
    passwordResetToken: {
      findFirst: (...args: unknown[]) => findExistingResetCodeMock(...args),
    },
    $transaction: (callback: (tx: unknown) => Promise<unknown>) => transactionMock(callback),
  },
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('createPasswordResetToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findExistingResetCodeMock.mockResolvedValue(null);
    deleteResetTokensMock.mockResolvedValue({ count: 1 });
    createResetTokenMock.mockResolvedValue({});
    upsertEmailJobMock.mockResolvedValue({
      emailJobId: 1,
      eventKey: 'reset-password:7:123456',
    });
    loggerErrorMock.mockReset();
  });

  it('returns success without creating a job when the email does not exist', async () => {
    findUserMock.mockResolvedValue(null);

    await expect(createPasswordResetToken('missing@example.com')).resolves.toBe(true);

    expect(transactionMock).not.toHaveBeenCalled();
    expect(upsertEmailJobMock).not.toHaveBeenCalled();
  });

  it('rejects Google-only accounts without enqueueing a reset email', async () => {
    findUserMock.mockResolvedValue({
      userId: 10,
      email: 'google@example.com',
      fullName: 'Google User',
      passwordHash: null,
      googleId: 'google-123',
    });

    await expect(createPasswordResetToken('google@example.com')).rejects.toBeInstanceOf(AppError);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('creates a reset token and enqueues a password reset email job', async () => {
    findUserMock.mockResolvedValue({
      userId: 7,
      email: 'user@example.com',
      fullName: 'Reset User',
      passwordHash: 'hashed-password',
      googleId: null,
    });

    await expect(createPasswordResetToken('user@example.com')).resolves.toBe(true);

    const createdToken = createResetTokenMock.mock.calls[0][0].data.token as string;

    expect(deleteResetTokensMock).toHaveBeenCalledWith({ where: { userId: 7 } });
    expect(createdToken).toMatch(/^\d{6}$/);
    expect(upsertEmailJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventKey: `reset-password:7:${createdToken}` },
        create: expect.objectContaining({
          eventType: 'AUTH_PASSWORD_RESET',
          recipient: 'user@example.com',
          payloadJson: JSON.stringify({
            userId: 7,
            fullName: 'Reset User',
            code: createdToken,
          }),
        }),
      }),
    );
  });

  it('throws an auth AppError when the reset email job cannot be enqueued', async () => {
    findUserMock.mockResolvedValue({
      userId: 7,
      email: 'user@example.com',
      fullName: 'Reset User',
      passwordHash: 'hashed-password',
      googleId: null,
    });
    upsertEmailJobMock.mockRejectedValue(new Error('queue offline'));

    await expect(createPasswordResetToken('user@example.com')).rejects.toMatchObject({
      statusCode: 503,
      errorCode: 'EMAIL_ENQUEUE_FAILED',
      messageKey: 'auth:errors.passwordResetEmailFailed',
    });

    expect(loggerErrorMock).toHaveBeenCalledWith(
      '[passwordService] Failed to enqueue password reset email',
      expect.objectContaining({
        userId: 7,
        email: 'user@example.com',
      }),
    );
  });
});
