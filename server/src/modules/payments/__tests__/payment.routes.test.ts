import express from 'express';
import request from 'supertest';

const vnpayController = {
  createPaymentUrl: jest.fn((_req, res) => res.status(201).json({ route: 'create-payment-url' })),
  vnpayReturn: jest.fn((_req, res) => res.json({ route: 'vnpay-return' })),
  vnpayIpn: jest.fn((_req, res) => res.json({ route: 'vnpay-ipn' })),
};

const refundController = {
  postInitiateRefund: jest.fn((_req, res) => res.status(201).json({ route: 'post-initiate-refund' })),
  getOrderRefunds: jest.fn((_req, res) => res.json({ route: 'get-order-refunds' })),
};

jest.mock('../../../controllers/vnpay.controller', () => vnpayController);
jest.mock('../../../controllers/refund.controller', () => refundController);
jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticateToken: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { userId: 11, roles: ['Admin'] };
    next();
  },
}));

import { refundModuleRoutes, vnpayModuleRoutes } from '../payment.routes';

describe('payment module routes', () => {
  const vnpayApp = express();
  vnpayApp.use(express.json());
  vnpayApp.use(vnpayModuleRoutes);

  const refundApp = express();
  refundApp.use(express.json());
  refundApp.use(refundModuleRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps create payment url routed through the VNPay controller', async () => {
    const response = await request(vnpayApp).post('/create_payment_url').send({ orderId: 10 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ route: 'create-payment-url' });
    expect(vnpayController.createPaymentUrl).toHaveBeenCalledTimes(1);
  });

  it('keeps vnpay return routed through the VNPay controller', async () => {
    const response = await request(vnpayApp).get('/vnpay_return');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'vnpay-return' });
    expect(vnpayController.vnpayReturn).toHaveBeenCalledTimes(1);
  });

  it('keeps vnpay ipn routed through the VNPay controller', async () => {
    const response = await request(vnpayApp).get('/vnpay_ipn');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'vnpay-ipn' });
    expect(vnpayController.vnpayIpn).toHaveBeenCalledTimes(1);
  });

  it('keeps initiate refund routed through the refund controller', async () => {
    const response = await request(refundApp).post('/42/refunds').send({ amount: 50000 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ route: 'post-initiate-refund' });
    expect(refundController.postInitiateRefund).toHaveBeenCalledTimes(1);
  });

  it('keeps refund history routed through the refund controller', async () => {
    const response = await request(refundApp).get('/42/refunds');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'get-order-refunds' });
    expect(refundController.getOrderRefunds).toHaveBeenCalledTimes(1);
  });
});
