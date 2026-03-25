import express from 'express';
import request from 'supertest';

const trackingController = {
  publicTracking: jest.fn((_req, res) => res.json({ route: 'public-tracking' })),
  publicTrackingGet: jest.fn((_req, res) => res.json({ route: 'public-tracking-get' })),
  getOrderTracking: jest.fn((_req, res) => res.json({ route: 'get-order-tracking' })),
};

jest.mock('../tracking.controller', () => ({
  trackingController,
}));

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticateToken: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { userId: 9, roles: ['Customer'] };
    next();
  },
}));

import trackingRoutes from '../tracking.route';

describe('tracking routes', () => {
  const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use(trackingRoutes);
    return app;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps public tracking POST owned by the tracking controller', async () => {
    const response = await request(createApp())
      .post('/tracking/public')
      .send({ orderCode: 'ORD-1', contact: '0901234567' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'public-tracking' });
    expect(trackingController.publicTracking).toHaveBeenCalledTimes(1);
  });

  it('keeps public tracking GET owned by the tracking controller', async () => {
    const response = await request(createApp())
      .get('/tracking/lookup')
      .query({ orderCode: 'ORD-1', contact: '0901234567' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'public-tracking-get' });
    expect(trackingController.publicTrackingGet).toHaveBeenCalledTimes(1);
  });

  it('keeps authenticated order tracking owned by the tracking controller', async () => {
    const response = await request(createApp()).get('/orders/15/tracking');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'get-order-tracking' });
    expect(trackingController.getOrderTracking).toHaveBeenCalledTimes(1);
  });
});
