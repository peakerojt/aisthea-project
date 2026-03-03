import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../../app';

jest.mock('../tracking.service', () => ({
  trackingService: {
    getPublicTracking: jest.fn(),
    getMyOrders: jest.fn(),
    getOrderTrackingById: jest.fn(),
    updateOrderStatus: jest.fn(),
  },
}));

import { trackingService } from '../tracking.service';

const app = createApp();
const sign = (payload: any) => jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');

describe('tracking routes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('public tracking success', async () => {
    (trackingService.getPublicTracking as jest.Mock).mockResolvedValue({ orderId: 1 });
    const res = await request(app).post('/api/tracking/public').send({ orderCode: 'OD1', contact: '0909' });
    expect(res.status).toBe(200);
  });

  it('public tracking fail', async () => {
    (trackingService.getPublicTracking as jest.Mock).mockRejectedValue(new Error('not found'));
    const res = await request(app).post('/api/tracking/public').send({ orderCode: 'OD1', contact: 'x' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('unauthorized access', async () => {
    const res = await request(app).get('/api/orders/my');
    expect(res.status).toBe(401);
  });

  it('forbidden access', async () => {
    (trackingService.getOrderTrackingById as jest.Mock).mockRejectedValue({ statusCode: 403, code: 'FORBIDDEN', message: 'forbidden' });
    const token = sign({ userId: 2, roles: ['Customer'] });
    const res = await request(app).get('/api/orders/10/tracking').set('Authorization', `Bearer ${token}`);
    expect([403, 500]).toContain(res.status);
  });

  it('invalid status transition', async () => {
    (trackingService.updateOrderStatus as jest.Mock).mockRejectedValue({ statusCode: 400, code: 'INVALID_STATUS_TRANSITION', message: 'invalid' });
    const token = sign({ userId: 1, roles: ['Admin'] });
    const res = await request(app)
      .patch('/api/admin/orders/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'DELIVERED' });
    expect([400, 500]).toContain(res.status);
  });

  it('admin update status success', async () => {
    (trackingService.updateOrderStatus as jest.Mock).mockResolvedValue({ orderId: 1, status: 'CONFIRMED' });
    const token = sign({ userId: 1, roles: ['Admin'] });
    const res = await request(app)
      .patch('/api/admin/orders/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(200);
  });
});
