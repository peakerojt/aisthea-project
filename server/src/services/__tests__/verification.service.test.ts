import { AppError } from '../../middlewares/error.middleware';
import { logger } from '../../lib/logger';
import { prisma } from '../../utils/prisma';
import { sendVerificationEmail } from '../email.service';
import { createVerificationToken } from '../verification.service';

jest.mock('../../utils/prisma', () => ({
  prisma: {
    emailVerificationToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../email.service', () => ({
  sendVerificationEmail: jest.fn(),
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
  });

  it('stores a token and sends the verification email before resolving', async () => {
    const deleteManyMock = prisma.emailVerificationToken.deleteMany as jest.Mock;
    const createMock = prisma.emailVerificationToken.create as jest.Mock;
    const sendMailMock = sendVerificationEmail as jest.Mock;

    deleteManyMock.mockResolvedValue({ count: 0 });
    createMock.mockResolvedValue({});
    sendMailMock.mockResolvedValue(true);

    const token = await createVerificationToken(12, 'user@example.com', 'Test User');

    expect(deleteManyMock).toHaveBeenCalledWith({ where: { userId: 12 } });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 12,
          token: expect.stringMatching(/^\d{6}$/),
          expiresAt: expect.any(Date),
        }),
      }),
    );
    expect(sendMailMock).toHaveBeenCalledWith('user@example.com', token, 'Test User');
    expect(token).toMatch(/^\d{6}$/);
  });

  it('throws an AppError when the email provider rejects the send', async () => {
    const deleteManyMock = prisma.emailVerificationToken.deleteMany as jest.Mock;
    const createMock = prisma.emailVerificationToken.create as jest.Mock;
    const sendMailMock = sendVerificationEmail as jest.Mock;

    deleteManyMock.mockResolvedValue({ count: 0 });
    createMock.mockResolvedValue({});
    sendMailMock.mockRejectedValue(new Error('SMTP offline'));

    await expect(createVerificationToken(99, 'fail@example.com', 'Broken Mail')).rejects.toMatchObject({
      statusCode: 503,
      errorCode: 'EMAIL_SEND_FAILED',
      messageKey: 'auth:errors.verificationEmailFailed',
    });

    expect(logger.error).toHaveBeenCalledWith(
      '[verificationService] Failed to send verification email',
      expect.objectContaining({
        userId: 99,
        email: 'fail@example.com',
      }),
    );
  });
});
