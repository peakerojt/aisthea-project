import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../../app';
import { initI18n } from '../../../i18n';
import { AppError } from '../../../middlewares/error.middleware';

// ─── Mock the entire tracking service layer ───────────────────────────────────
jest.mock('../tracking.service', () => ({
  trackingService: {
    getPublicTracking: jest.fn(),
    getOrderTrackingById: jest.fn(),
    updateOrderStatus: jest.fn(),
  },
}));

import { trackingService } from '../tracking.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sign = (payload: object) =>
  jwt.sign(payload, process.env.JWT_SECRET || 'test-secret');

const customerToken = sign({ userId: 1, roles: ['Customer'] });
const adminToken = sign({ userId: 99, roles: ['Admin'] });

const MOCK_ORDER = { orderId: 1, orderCode: 'ORD-TEST-0001' };

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe('Tracking i18n — Integration Tests', () => {
  const app = createApp();

  beforeAll(async () => {
    await initI18n();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  POST /api/tracking/public — Public Tracking                            │
  // └─────────────────────────────────────────────────────────────────────────┘
  describe('POST /api/tracking/public', () => {
    it('[EN] returns English success message with x-lang: en', async () => {
      (trackingService.getPublicTracking as jest.Mock).mockResolvedValue(MOCK_ORDER);

      const res = await request(app)
        .post('/api/tracking/public')
        .set('x-lang', 'en')
        .send({ orderCode: 'ORD-TEST-0001', contact: '0901234567' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.messageKey).toBe('tracking:success.getPublicTracking');
      expect(res.body.message).toContain('successfully');
      expect(res.body.data).toBeDefined();
    });

    it('[VI] returns Vietnamese success message with x-lang: vi', async () => {
      (trackingService.getPublicTracking as jest.Mock).mockResolvedValue(MOCK_ORDER);

      const res = await request(app)
        .post('/api/tracking/public')
        .set('x-lang', 'vi')
        .send({ orderCode: 'ORD-TEST-0001', contact: '0901234567' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.messageKey).toBe('tracking:success.getPublicTracking');
      expect(res.body.message).toContain('thành công');
    });

    it('[FALLBACK] falls back to EN for unsupported locale (jp)', async () => {
      (trackingService.getPublicTracking as jest.Mock).mockResolvedValue(MOCK_ORDER);

      const res = await request(app)
        .post('/api/tracking/public')
        .set('x-lang', 'jp')
        .send({ orderCode: 'ORD-TEST-0001', contact: '0901234567' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('successfully');
    });

    it('[FALLBACK] falls back to EN when no locale header is provided', async () => {
      (trackingService.getPublicTracking as jest.Mock).mockResolvedValue(MOCK_ORDER);

      const res = await request(app)
        .post('/api/tracking/public')
        .send({ orderCode: 'ORD-TEST-0001', contact: '0901234567' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('successfully');
    });

    it('[FALLBACK] uses x-lang over accept-language', async () => {
      (trackingService.getPublicTracking as jest.Mock).mockResolvedValue(MOCK_ORDER);

      const res = await request(app)
        .post('/api/tracking/public')
        .set('x-lang', 'vi')
        .set('accept-language', 'en-US,en;q=0.9')
        .send({ orderCode: 'ORD-TEST-0001', contact: '0901234567' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('thành công');
    });

    it('[ERROR-EN] returns localized 404 "not found" in English', async () => {
      (trackingService.getPublicTracking as jest.Mock).mockRejectedValue(
        new AppError(404, 'TRACKING_NOT_FOUND', 'tracking:errors.notFound'),
      );

      const res = await request(app)
        .post('/api/tracking/public')
        .set('x-lang', 'en')
        .send({ orderCode: 'ORD-MISSING', contact: '0000000000' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('TRACKING_NOT_FOUND');
      expect(res.body.messageKey).toBe('tracking:errors.notFound');
      expect(res.body.message).toContain('tracking info');
    });

    it('[ERROR-VI] returns localized 404 "not found" in Vietnamese', async () => {
      (trackingService.getPublicTracking as jest.Mock).mockRejectedValue(
        new AppError(404, 'TRACKING_NOT_FOUND', 'tracking:errors.notFound'),
      );

      const res = await request(app)
        .post('/api/tracking/public')
        .set('x-lang', 'vi')
        .send({ orderCode: 'ORD-MISSING', contact: '0000000000' });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('tra cứu');
    });

    it('[VALIDATION] validation error returns 422 with structured details', async () => {
      const res = await request(app)
        .post('/api/tracking/public')
        .set('x-lang', 'en')
        .send({ orderCode: 'ab' }); // too short, missing contact

      expect(res.status).toBe(422);
      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
      expect(res.body.messageKey).toBe('common:errors.validation');
      expect(res.body.details).toBeDefined();
    });
  });

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  GET /api/orders/:id/tracking — Order Tracking Detail                  │
  // └─────────────────────────────────────────────────────────────────────────┘
  describe('GET /api/orders/:id/tracking', () => {
    it('[EN] returns localized tracking detail in English', async () => {
      (trackingService.getOrderTrackingById as jest.Mock).mockResolvedValue(MOCK_ORDER);

      const res = await request(app)
        .get('/api/orders/1/tracking')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-lang', 'en');

      expect(res.status).toBe(200);
      expect(res.body.messageKey).toBe('tracking:success.getOrderTracking');
      expect(res.body.message).toContain('successfully');
    });

    it('[VI] returns localized tracking detail in Vietnamese', async () => {
      (trackingService.getOrderTrackingById as jest.Mock).mockResolvedValue(MOCK_ORDER);

      const res = await request(app)
        .get('/api/orders/1/tracking')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-lang', 'vi');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('thành công');
    });

    it('[ERROR-EN] returns 403 forbidden message in English for unauthorized access', async () => {
      (trackingService.getOrderTrackingById as jest.Mock).mockRejectedValue(
        new AppError(403, 'FORBIDDEN', 'tracking:errors.forbidden'),
      );

      const res = await request(app)
        .get('/api/orders/10/tracking')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-lang', 'en');

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('FORBIDDEN');
      expect(res.body.message).toContain('permission');
    });

    it('[ERROR-VI] returns 403 forbidden message in Vietnamese', async () => {
      (trackingService.getOrderTrackingById as jest.Mock).mockRejectedValue(
        new AppError(403, 'FORBIDDEN', 'tracking:errors.forbidden'),
      );

      const res = await request(app)
        .get('/api/orders/10/tracking')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-lang', 'vi');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('quyền');
    });

    it('[INVALID-ID] returns 400 for non-numeric order id', async () => {
      const res = await request(app)
        .get('/api/orders/abc/tracking')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-lang', 'en');

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('INVALID_ORDER_ID');
    });
  });

  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │  PATCH /api/admin/orders/:id/status — Admin Status Update               │
  // └─────────────────────────────────────────────────────────────────────────┘
  describe('PATCH /api/admin/orders/:id/status', () => {
    it('[EN] returns localized success with interpolated status in English', async () => {
      (trackingService.updateOrderStatus as jest.Mock).mockResolvedValue(MOCK_ORDER);

      const res = await request(app)
        .patch('/api/admin/orders/1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-lang', 'en')
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.messageKey).toBe('tracking:success.updateStatus');
      expect(res.body.message).toContain('CONFIRMED');
    });

    it('[VI] returns localized success with interpolated status in Vietnamese', async () => {
      (trackingService.updateOrderStatus as jest.Mock).mockResolvedValue(MOCK_ORDER);

      const res = await request(app)
        .patch('/api/admin/orders/1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-lang', 'vi')
        .send({ status: 'SHIPPED' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('thành công');
      expect(res.body.message).toContain('SHIPPED');
    });

    it('[ERROR-EN] returns localized invalid transition error in English with params', async () => {
      (trackingService.updateOrderStatus as jest.Mock).mockRejectedValue(
        new AppError(
          400,
          'INVALID_STATUS_TRANSITION',
          'tracking:errors.invalidStatusTransition',
          { from: 'DELIVERED', to: 'PENDING' },
        ),
      );

      const res = await request(app)
        .patch('/api/admin/orders/1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-lang', 'en')
        .send({ status: 'PENDING' });

      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('INVALID_STATUS_TRANSITION');
      expect(res.body.message).toContain('DELIVERED');
      expect(res.body.message).toContain('PENDING');
    });

    it('[ERROR-VI] returns localized invalid transition error in Vietnamese with params', async () => {
      (trackingService.updateOrderStatus as jest.Mock).mockRejectedValue(
        new AppError(
          400,
          'INVALID_STATUS_TRANSITION',
          'tracking:errors.invalidStatusTransition',
          { from: 'DELIVERED', to: 'PENDING' },
        ),
      );

      const res = await request(app)
        .patch('/api/admin/orders/1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-lang', 'vi')
        .send({ status: 'PENDING' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('DELIVERED');
      expect(res.body.message).toContain('PENDING');
      expect(res.body.message).toContain('trạng thái');
    });

    it('[FORBIDDEN] non-admin user receives 403 in Vietnamese', async () => {
      const res = await request(app)
        .patch('/api/admin/orders/1/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-lang', 'vi')
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(403);
      expect(res.body.errorCode).toBe('FORBIDDEN');
      expect(res.body.message).toContain('admin');
    });
  });
});
