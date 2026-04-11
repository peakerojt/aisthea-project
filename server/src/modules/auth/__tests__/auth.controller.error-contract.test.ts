import { authController } from '../auth.controller';
import { AppError, AppErrorWithData } from '../../../middlewares/error.middleware';

const registerUser = jest.fn();
const loginUser = jest.fn();

jest.mock('../../../services/auth.service', () => ({
  registerUser: (...args: unknown[]) => registerUser(...args),
  loginUser: (...args: unknown[]) => loginUser(...args),
  persistRefreshToken: jest.fn(),
  getStoredRefreshTokenHash: jest.fn(),
  revokeStoredRefreshToken: jest.fn(),
}));

jest.mock('../../../services/verification.service', () => ({
  verifyEmailToken: jest.fn(),
  resendVerificationEmail: jest.fn(),
}));

jest.mock('../../../lib/env', () => ({
  env: {
    nodeEnv: 'test',
    clientUrl: 'http://localhost:3000',
    jwtSecret: 'jwt-secret',
    refreshSecret: 'refresh-secret',
    jwtExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
}));

jest.mock('../../../lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../../middlewares/security.middleware', () => ({
  setCsrfCookie: jest.fn(() => 'csrf-token'),
}));

describe('auth.controller error contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards register AppError without string matching', async () => {
    const err = new AppError(409, 'EMAIL_EXISTS', 'auth:errors.emailExists');
    registerUser.mockRejectedValue(err);

    const req: any = { body: { email: 'demo@example.com', password: 'Secret123!', fullName: 'Demo' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await authController.register(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('forwards register AppErrorWithData without custom branching in the controller', async () => {
    const err = new AppErrorWithData(
      409,
      'EMAIL_PENDING_VERIFICATION',
      'auth:errors.emailPendingVerification',
      {
        email: 'pending@example.com',
        requiresVerification: true,
      },
    );
    registerUser.mockRejectedValue(err);

    const req: any = { body: { email: 'pending@example.com', password: 'Secret123!', fullName: 'Demo' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await authController.register(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('forwards login AppError without string matching', async () => {
    const err = new AppError(401, 'INVALID_CREDENTIALS', 'auth:errors.invalidCredentials');
    loginUser.mockRejectedValue(err);

    const req: any = { body: { email: 'demo@example.com', password: 'wrong' } };
    const res: any = {
      cookie: jest.fn(),
      json: jest.fn(),
    };
    const next = jest.fn();

    await authController.login(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
