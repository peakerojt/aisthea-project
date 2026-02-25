import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../../app';

import * as repo from '../order.repository';

jest.mock('../order.repository');

const mockedRepo = repo as jest.Mocked<typeof repo>;

const signToken = (payload: any) => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

describe('Order endpoints integration (router/controller/auth)', () => {
  const app = createApp();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/orders/:id', () => {
    it('returns 401 when no token', async () => {
      const res = await request(app).get('/api/orders/1');
      expect(res.status).toBe(401);
    });

    it('returns 404 when not found', async () => {
      mockedRepo.findOrderByIdWithRelations.mockResolvedValueOnce(null as any);
      const token = signToken({ userId: 1, roles: ['Customer'] });

      const res = await request(app)
        .get('/api/orders/999')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ success: false, code: 'NOT_FOUND' });
    });

    it('returns 403 when forbidden', async () => {
      mockedRepo.findOrderByIdWithRelations.mockResolvedValueOnce({
        orderId: 10,
        orderNumber: 'OD20260001',
        userId: 2,
        status: 'Pending',
        paymentMethod: 'COD',
        paymentStatus: 'Unpaid',
        createdAt: new Date(),
        customerName: 'A',
        customerPhone: '090',
        shippingAddressDetail: '123',
        shippingWard: null,
        shippingDistrict: 'D',
        shippingCity: 'C',
        totalAmount: 100,
        note: null,
        user: { email: 'x@example.com' },
        items: [],
        payments: [],
        statusHistory: [],
      } as any);

      const token = signToken({ userId: 1, roles: ['Customer'] });

      const res = await request(app)
        .get('/api/orders/10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ success: false, code: 'FORBIDDEN' });
    });

    it('returns 200 with success true', async () => {
      mockedRepo.findOrderByIdWithRelations.mockResolvedValueOnce({
        orderId: 10,
        orderNumber: 'OD20260001',
        userId: 1,
        status: 'Confirmed',
        paymentMethod: 'COD',
        paymentStatus: 'Unpaid',
        createdAt: new Date('2026-02-24T08:00:00.000Z'),
        customerName: 'A',
        customerPhone: '090',
        shippingAddressDetail: '123',
        shippingWard: 'W',
        shippingDistrict: 'D',
        shippingCity: 'C',
        totalAmount: 408000,
        note: 'note',
        user: { email: 'a@gmail.com' },
        items: [
          {
            sku: 'SKU-RED-M',
            productName: 'Ao thun',
            variantName: 'Do / M',
            unitPrice: 199000,
            quantity: 2,
            variant: null,
          },
        ],
        payments: [],
        statusHistory: [
          { status: 'Pending', changedAt: new Date('2026-02-24T08:00:00.000Z') },
          { status: 'Confirmed', changedAt: new Date('2026-02-24T08:10:00.000Z') },
        ],
      } as any);

      const token = signToken({ userId: 1, roles: ['Customer'] });

      const res = await request(app)
        .get('/api/orders/10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        id: '10',
        orderCode: 'OD20260001',
        status: 'confirmed',
        customer: { name: 'A', phone: '090', email: 'a@gmail.com' },
      });
      expect(Array.isArray(res.body.data.timeline)).toBe(true);
    });
  });

  describe('PATCH /api/orders/:id/cancel', () => {
    it('returns 400 when status cannot be cancelled', async () => {
      mockedRepo.findOrderByIdWithRelations.mockResolvedValueOnce({
        orderId: 10,
        orderNumber: 'OD20260001',
        userId: 1,
        status: 'Shipping',
        paymentMethod: 'COD',
        paymentStatus: 'Unpaid',
        createdAt: new Date(),
        customerName: 'A',
        customerPhone: '090',
        shippingAddressDetail: '123',
        shippingWard: null,
        shippingDistrict: 'D',
        shippingCity: 'C',
        totalAmount: 100,
        note: null,
        user: { email: 'x@example.com' },
        items: [],
        payments: [],
        statusHistory: [],
      } as any);

      const token = signToken({ userId: 1, roles: ['Customer'] });

      const res = await request(app)
        .patch('/api/orders/10/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ success: false, code: 'ORDER_CANNOT_BE_CANCELLED' });
    });

    it('returns 200 and updated order', async () => {
      mockedRepo.findOrderByIdWithRelations.mockResolvedValueOnce({
        orderId: 10,
        orderNumber: 'OD20260001',
        userId: 1,
        status: 'Pending',
        paymentMethod: 'COD',
        paymentStatus: 'Unpaid',
        createdAt: new Date(),
        customerName: 'A',
        customerPhone: '090',
        shippingAddressDetail: '123',
        shippingWard: null,
        shippingDistrict: 'D',
        shippingCity: 'C',
        totalAmount: 100,
        note: null,
        user: { email: 'x@example.com' },
        items: [],
        payments: [],
        statusHistory: [],
      } as any);

      mockedRepo.updateOrderStatus.mockResolvedValueOnce({
        orderId: 10,
        orderNumber: 'OD20260001',
        userId: 1,
        status: 'Cancelled',
        paymentMethod: 'COD',
        paymentStatus: 'Unpaid',
        createdAt: new Date(),
        customerName: 'A',
        customerPhone: '090',
        shippingAddressDetail: '123',
        shippingWard: null,
        shippingDistrict: 'D',
        shippingCity: 'C',
        totalAmount: 100,
        note: null,
        user: { email: 'x@example.com' },
        items: [],
        payments: [],
        statusHistory: [],
      } as any);

      mockedRepo.appendOrderStatusHistory.mockResolvedValueOnce({} as any);

      const token = signToken({ userId: 1, roles: ['Customer'] });

      const res = await request(app)
        .patch('/api/orders/10/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('cancelled');
    });
  });
});

