import request from 'supertest';

const buildRouter = (register?: (router: any) => void) => {
  const express = require('express') as typeof import('express');
  const router = express.Router();
  register?.(router);
  return router;
};

const createJsonHandler = (
  route: string,
  options?: { status?: number; body?: Record<string, unknown> },
) =>
  jest.fn((_req, res) => {
    if (options?.status) {
      res.status(options.status);
    }

    return res.json(options?.body ?? { route });
  });

const returnController = {
  getOrderReturn: createJsonHandler('legacy-get-order-return'),
};

const trackingController = {
  adminUpdateOrderStatus: createJsonHandler('admin-update-order-status'),
};

jest.mock('../config/passport.config', () => ({
  configureGoogleStrategy: jest.fn(),
}));
jest.mock('passport', () => ({
  initialize: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));
jest.mock('../middlewares/security.middleware', () => ({
  applyCsrfProtection: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  applyHelmet: (_req: unknown, _res: unknown, next: () => void) => next(),
  applyPermissionsPolicy: (_req: unknown, _res: unknown, next: () => void) => next(),
  attachRateLimitIdentity: (_req: unknown, _res: unknown, next: () => void) => next(),
  createAdminRateLimiters: jest.fn(() => [(_req: unknown, _res: unknown, next: () => void) => next()]),
  globalRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../middlewares/locale.middleware', () => ({
  localeMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../middlewares/error.middleware', () => ({
  notFoundHandler: (_req: unknown, res: { status: (code: number) => { json: (body: unknown) => unknown } }) =>
    res.status(404).json({ route: 'not-found' }),
  errorHandler: (err: unknown, _req: unknown, res: { status: (code: number) => { json: (body: unknown) => unknown } }, _next: unknown) =>
    res.status(500).json({ route: 'error-handler', err: Boolean(err) }),
}));
jest.mock('../middlewares/response.middleware', () => ({
  responseNormalizer: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../middlewares/request-id.middleware', () => ({
  requestIdMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../middlewares/auth.middleware', () => ({
  authenticateToken: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { userId: 77, roles: ['Admin'] };
    next();
  },
}));
jest.mock('../lib/env', () => ({
  env: {
    clientUrl: 'http://localhost:3000',
    nodeEnv: 'test',
  },
}));
jest.mock('../lib/query-monitor', () => ({
  queryCountMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('../modules/auth/auth.routes', () => ({
  __esModule: true,
  default: buildRouter((router) => {
    router.get('/__auth', (_req: unknown, res: { json: (body: unknown) => unknown }) => res.json({ route: 'auth-module' }));
  }),
}));
jest.mock('../modules/products/product.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/products/importExport.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/categories/category.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/reviews/review.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/cart/cart.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/inventory/inventory.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/purchase-orders/purchase-order.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/coupons/coupon.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/users/user.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/dashboard/dashboard.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/analytics/analytics.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/weather/weather.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/outfit/outfit.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/chat/chat.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/tracking/tracking.route', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../modules/items/items.route', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../routes/role.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../routes/permission.routes', () => ({
  __esModule: true,
  default: buildRouter(),
}));
jest.mock('../controllers/legacy-returns.controller', () => returnController);
jest.mock('../modules/tracking/tracking.controller', () => ({
  trackingController,
}));
jest.mock('../modules/payments/payment.routes', () => ({
  vnpayModuleRoutes: buildRouter((router) => {
    router.get('/vnpay_return', (_req: unknown, res: { json: (body: unknown) => unknown }) => res.json({ route: 'vnpay-return-route' }));
  }),
  refundModuleRoutes: buildRouter((router) => {
    router.get('/:id/refunds', (_req: unknown, res: { json: (body: unknown) => unknown }) => res.json({ route: 'refund-history-route' }));
  }),
}));
jest.mock('../modules/order/order.route', () => ({
  __esModule: true,
  default: buildRouter((router) => {
    router.get('/:id', (_req: unknown, res: { json: (body: unknown) => unknown }) => res.json({ route: 'order-module-detail' }));
    router.patch('/:id/cancel', (_req: unknown, res: { json: (body: unknown) => unknown }) => res.json({ route: 'order-module-cancel' }));
  }),
}));
jest.mock('../modules/return-order/routes/routes', () => ({
  __esModule: true,
  default: buildRouter((router) => {
    router.post('/', (_req: unknown, res: { json: (body: unknown) => unknown }) =>
      res.json({ route: 'return-request-create' }),
    );
    router.get('/admin/list', (_req: unknown, res: { json: (body: unknown) => unknown }) => res.json({ route: 'return-request-admin-list' }));
    router.get('/:id', (_req: unknown, res: { json: (body: unknown) => unknown }) => res.json({ route: 'return-request-detail' }));
  }),
}));
jest.mock('../routes/order.routes', () => ({
  __esModule: true,
  default: buildRouter((router) => {
    router.get('/admin', (_req: unknown, res: { json: (body: unknown) => unknown }) => res.json({ route: 'legacy-order-admin' }));
  }),
}));

import { createApp } from '../app';

describe('app route coexistence', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unmounts legacy order return creation so write callers now receive a 404', async () => {
    const response = await request(app).post('/api/orders/15/return');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ route: 'not-found' });
  });

  it('keeps modern return-request creation mounted separately from legacy order-scoped creation', async () => {
    const response = await request(app).post('/api/return-requests');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'return-request-create' });
    expect(response.headers.deprecation).toBeUndefined();
  });

  it('keeps legacy order return detail mounted before order module catch-all', async () => {
    const response = await request(app).get('/api/orders/15/return');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'legacy-get-order-return' });
    expect(response.headers['x-aisthea-compatibility-surface']).toBe('legacy-order-return');
    expect(returnController.getOrderReturn).toHaveBeenCalledTimes(1);
  });

  it('unmounts legacy refund creation so write callers now receive a 404', async () => {
    const response = await request(app).post('/api/orders/15/refunds');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ route: 'not-found' });
  });

  it('keeps refund history module routes mounted under orders without being swallowed by order detail', async () => {
    const response = await request(app).get('/api/orders/15/refunds');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'refund-history-route' });
    expect(response.headers['x-aisthea-compatibility-surface']).toBe('legacy-order-refunds');
  });

  it('keeps order module detail route mounted after refund and return routes', async () => {
    const response = await request(app).get('/api/orders/15');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'order-module-detail' });
  });

  it('keeps new return request module mounted separately from legacy returns', async () => {
    const response = await request(app).get('/api/return-requests/admin/list');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'return-request-admin-list' });
  });

  it('unmounts legacy customer returns routes under /api/returns', async () => {
    const response = await request(app).get('/api/returns/my');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ route: 'not-found' });
  });

  it('unmounts legacy admin returns routes under /api/returns', async () => {
    const response = await request(app).get('/api/returns');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ route: 'not-found' });
  });

  it('unmounts legacy returns detail under /api/returns/:id', async () => {
    const response = await request(app).get('/api/returns/15');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ route: 'not-found' });
  });

  it('unmounts legacy return process under /api/returns/:id/process', async () => {
    const response = await request(app).patch('/api/returns/15/process');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ route: 'not-found' });
  });
});
