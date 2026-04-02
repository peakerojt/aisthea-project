import express from 'express';
import request from 'supertest';

const controllerMock = {
  create: jest.fn((_req, res) => res.status(201).json({ route: 'create' })),
  myReturns: jest.fn((_req, res) => res.json({ route: 'my-returns' })),
  detail: jest.fn((_req, res) => res.json({ route: 'detail' })),
  adminList: jest.fn((_req, res) => res.json({ route: 'admin-list' })),
  approve: jest.fn((_req, res) => res.json({ route: 'approve' })),
  reject: jest.fn((_req, res) => res.json({ route: 'reject' })),
  markInTransit: jest.fn((_req, res) => res.json({ route: 'mark-in-transit' })),
  markReceived: jest.fn((_req, res) => res.json({ route: 'mark-received' })),
  acceptForRefund: jest.fn((_req, res) => res.json({ route: 'accept-for-refund' })),
  refund: jest.fn((_req, res) => res.json({ route: 'refund' })),
  updateRefundStatus: jest.fn((_req, res) => res.json({ route: 'refund-status' })),
};

jest.mock('../controllers/controller', () => ({
  ReturnRequestController: jest.fn().mockImplementation(() => controllerMock),
}));

jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticateToken: (req: any, _res: unknown, next: () => void) => {
    const userId = Number(req.header('x-user-id') || 0);
    const rolesHeader = String(req.header('x-user-roles') || req.header('x-user-role') || 'customer');
    const roles = rolesHeader
      .split(',')
      .map((value: string) => value.trim())
      .filter(Boolean);

    req.user = {
      userId,
      roles,
      role: roles[0] || 'customer',
    };

    next();
  },
}));

import returnRequestRoutes from '../routes/routes';

describe('return request routes', () => {
  const app = express();
  app.use(express.json());
  app.use(returnRequestRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps POST / wired to the module controller for customer roles', async () => {
    const response = await request(app)
      .post('/')
      .set('x-user-id', '101')
      .set('x-user-roles', 'customer')
      .send({ orderId: 1 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ route: 'create' });
    expect(controllerMock.create).toHaveBeenCalledTimes(1);
  });

  it('accepts support access on the modern create route via x-user-role fallback', async () => {
    const response = await request(app)
      .post('/')
      .set('x-user-id', '105')
      .set('x-user-role', 'support')
      .send({ orderId: 2 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ route: 'create' });
    expect(controllerMock.create).toHaveBeenCalledTimes(1);
  });

  it('blocks customer roles from the admin list route', async () => {
    const response = await request(app)
      .get('/admin/list')
      .set('x-user-id', '102')
      .set('x-user-roles', 'customer');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient access rights',
      },
    });
    expect(controllerMock.adminList).not.toHaveBeenCalled();
  });

  it('accepts x-user-role fallback for support access on admin routes', async () => {
    const response = await request(app)
      .get('/admin/list')
      .set('x-user-id', '104')
      .set('x-user-role', 'support');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'admin-list' });
    expect(controllerMock.adminList).toHaveBeenCalledTimes(1);
  });

  it('keeps GET /my owned by the module controller', async () => {
    const response = await request(app)
      .get('/my')
      .set('x-user-id', '106')
      .set('x-user-roles', 'customer');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'my-returns' });
    expect(controllerMock.myReturns).toHaveBeenCalledTimes(1);
  });

  it('keeps GET /:id owned by the module controller', async () => {
    const response = await request(app)
      .get('/77')
      .set('x-user-id', '107')
      .set('x-user-roles', 'customer');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'detail' });
    expect(controllerMock.detail).toHaveBeenCalledTimes(1);
  });

  it('keeps admin approve route owned by the module controller', async () => {
    const response = await request(app)
      .patch('/admin/55/approve')
      .set('x-user-id', '108')
      .set('x-user-roles', 'admin');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'approve' });
    expect(controllerMock.approve).toHaveBeenCalledTimes(1);
  });

  it('keeps admin reject route owned by the module controller', async () => {
    const response = await request(app)
      .patch('/admin/55/reject')
      .set('x-user-id', '109')
      .set('x-user-roles', 'admin')
      .send({ reason: 'Out of policy' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'reject' });
    expect(controllerMock.reject).toHaveBeenCalledTimes(1);
  });

  it('keeps admin mark-received route owned by the module controller', async () => {
    const response = await request(app)
      .patch('/admin/55/mark-received')
      .set('x-user-id', '110')
      .set('x-user-roles', 'support');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'mark-received' });
    expect(controllerMock.markReceived).toHaveBeenCalledTimes(1);
  });

  it('keeps admin mark-in-transit route owned by the module controller', async () => {
    const response = await request(app)
      .patch('/admin/55/mark-in-transit')
      .set('x-user-id', '112')
      .set('x-user-roles', 'support');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'mark-in-transit' });
    expect(controllerMock.markInTransit).toHaveBeenCalledTimes(1);
  });

  it('keeps admin accept-for-refund route owned by the module controller', async () => {
    const response = await request(app)
      .patch('/admin/55/accept-for-refund')
      .set('x-user-id', '111')
      .set('x-user-roles', 'support');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'accept-for-refund' });
    expect(controllerMock.acceptForRefund).toHaveBeenCalledTimes(1);
  });

  it('keeps admin refund route owned by the module controller', async () => {
    const response = await request(app)
      .patch('/admin/55/refund')
      .set('x-user-id', '103')
      .set('x-user-roles', 'admin')
      .send({ method: 'ORIGINAL_PAYMENT', idempotencyKey: 'refund-key-1234' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'refund' });
    expect(controllerMock.refund).toHaveBeenCalledTimes(1);
  });

  it('blocks support access on the admin refund route', async () => {
    const response = await request(app)
      .patch('/admin/55/refund')
      .set('x-user-id', '103')
      .set('x-user-roles', 'support')
      .send({ method: 'ORIGINAL_PAYMENT', idempotencyKey: 'refund-key-1234' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient access rights',
      },
    });
    expect(controllerMock.refund).not.toHaveBeenCalled();
  });

  it('keeps admin refund-status route owned by the module controller', async () => {
    const response = await request(app)
      .patch('/admin/55/refund-status')
      .set('x-user-id', '113')
      .set('x-user-roles', 'admin')
      .send({ refundStatus: 'PROCESSING' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'refund-status' });
    expect(controllerMock.updateRefundStatus).toHaveBeenCalledTimes(1);
  });

  it('blocks support access on the admin refund-status route', async () => {
    const response = await request(app)
      .patch('/admin/55/refund-status')
      .set('x-user-id', '113')
      .set('x-user-roles', 'support')
      .send({ refundStatus: 'PROCESSING' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient access rights',
      },
    });
    expect(controllerMock.updateRefundStatus).not.toHaveBeenCalled();
  });

  it('rate limits create requests after the tenth request in the burst window', async () => {
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await request(app)
        .post('/')
        .set('x-user-id', '999')
        .set('x-user-roles', 'customer')
        .send({ orderId: attempt });

      expect(response.status).toBe(201);
    }

    const response = await request(app)
      .post('/')
      .set('x-user-id', '999')
      .set('x-user-roles', 'customer')
      .send({ orderId: 11 });

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      bucket: 'CUSTOMER_MUTATION',
      phase: 'burst',
    });
    expect(controllerMock.create).toHaveBeenCalledTimes(10);
  });
});
