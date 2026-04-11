jest.mock('../../i18n', () => ({
  t: jest.fn((_locale: string, key: string) => `translated:${key}`),
}));

jest.mock('../locale.middleware', () => ({
  resolveRequestLocale: jest.fn(() => 'vi'),
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

import { AppErrorWithData, errorHandler } from '../error.middleware';

describe('errorHandler', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('serializes public data for AppErrorWithData responses', () => {
    process.env.NODE_ENV = 'production';
    const error = new AppErrorWithData(
      409,
      'EMAIL_PENDING_VERIFICATION',
      'auth:errors.emailPendingVerification',
      {
        email: 'pending@example.com',
        requiresVerification: true,
      },
      undefined,
      { internalOnly: true },
    );

    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const req = {
      traceId: 'trace-1',
      originalUrl: '/api/auth/register',
      method: 'POST',
    } as any;
    const res = { status } as any;

    errorHandler(error, req, res, jest.fn());

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      success: false,
      statusCode: 409,
      errorCode: 'EMAIL_PENDING_VERIFICATION',
      code: 'EMAIL_PENDING_VERIFICATION',
      messageKey: 'auth:errors.emailPendingVerification',
      data: {
        email: 'pending@example.com',
        requiresVerification: true,
      },
      message: 'translated:auth:errors.emailPendingVerification',
    });
  });
});
