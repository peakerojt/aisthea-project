import express from 'express';
import request from 'supertest';

const authController = {
  csrfToken: jest.fn((_req, res) => res.json({ route: 'csrf-token' })),
  register: jest.fn((_req, res) => res.status(201).json({ route: 'register' })),
  login: jest.fn((_req, res) => res.json({ route: 'login' })),
  verifyEmail: jest.fn((_req, res) => res.json({ route: 'verify-email' })),
  resendVerification: jest.fn((_req, res) => res.json({ route: 'resend-verification' })),
  forgotPassword: jest.fn((_req, res) => res.json({ route: 'forgot-password' })),
  passwordResetInit: jest.fn((_req, res) => res.json({ route: 'reset-password' })),
  resetPassword: jest.fn((_req, res) => res.json({ route: 'reset-password-post' })),
  refresh: jest.fn((_req, res) => res.json({ route: 'refresh' })),
  getSession: jest.fn((_req, res) => res.json({ route: 'session' })),
  logout: jest.fn((_req, res) => res.json({ route: 'logout' })),
  googleCallback: jest.fn((_req, res) => res.json({ route: 'google-callback' })),
};

jest.mock('../auth.controller', () => ({ authController }));
jest.mock('../../../middlewares/validate.middleware', () => ({
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../../../middlewares/security.middleware', () => ({
  authRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('passport', () => ({
  authenticate: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

import authRoutes from '../auth.routes';

describe('auth module routes', () => {
  const app = express();
  app.use(express.json());
  app.use(authRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('serves csrf token route through the module controller', async () => {
    const response = await request(app).get('/csrf-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'csrf-token' });
    expect(authController.csrfToken).toHaveBeenCalledTimes(1);
  });

  it('serves refresh route through the module controller', async () => {
    const response = await request(app).post('/refresh');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'refresh' });
    expect(authController.refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps google callback wired to the module controller', async () => {
    const response = await request(app).get('/google/callback');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'google-callback' });
    expect(authController.googleCallback).toHaveBeenCalledTimes(1);
  });
});
