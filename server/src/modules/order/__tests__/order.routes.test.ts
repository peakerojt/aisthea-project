import express from 'express';
import request from 'supertest';

const orderController = {
  getOrderById: jest.fn((_req, res) => res.json({ route: 'get-order-by-id' })),
  cancelOrder: jest.fn((_req, res) => res.json({ route: 'cancel-order' })),
};

jest.mock('../order.controller', () => orderController);
jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticateToken: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { userId: 21, roles: ['Customer'] };
    next();
  },
}));
jest.mock('../../../middlewares/validate.middleware', () => ({
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import orderRoutes from '../order.route';

describe('order module routes', () => {
  const app = express();
  app.use(express.json());
  app.use(orderRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps order detail routed through the order controller', async () => {
    const response = await request(app).get('/42');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'get-order-by-id' });
    expect(orderController.getOrderById).toHaveBeenCalledTimes(1);
  });

  it('keeps order cancellation routed through the order controller', async () => {
    const response = await request(app).patch('/42/cancel');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'cancel-order' });
    expect(orderController.cancelOrder).toHaveBeenCalledTimes(1);
  });
});
