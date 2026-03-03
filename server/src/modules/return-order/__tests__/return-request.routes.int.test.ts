import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../../app';

const serviceMock = {
  createReturnRequest: jest.fn(),
  getMyReturns: jest.fn(),
  getReturnDetail: jest.fn(),
  getAdminReturns: jest.fn(),
  approveReturnRequest: jest.fn(),
  rejectReturnRequest: jest.fn(),
  markReturnReceived: jest.fn(),
  refundReturnRequest: jest.fn(),
};

jest.mock('../services/return-request.service', () => ({
  ReturnRequestService: jest.fn(() => serviceMock),
  ServiceError: class ServiceError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status = 400) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));

jest.mock('../../../generated/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn().mockResolvedValue({ status: 'Active' }),
    },
  })),
}));

const signToken = (payload: any) => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

describe('return routes integration', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('unauthorized access', async () => {
    const res = await request(app).get('/api/returns/my');
    expect(res.status).toBe(401);
  });

  it('create -> approve -> received -> refund flow', async () => {
    const customerToken = signToken({ userId: 10, roles: ['Customer'] });
    const adminToken = signToken({ userId: 1, roles: ['Admin'] });

    serviceMock.createReturnRequest.mockResolvedValueOnce({ returnRequestId: 100, status: 'REQUESTED' });
    serviceMock.approveReturnRequest.mockResolvedValueOnce({ returnRequestId: 100, status: 'APPROVED' });
    serviceMock.markReturnReceived.mockResolvedValueOnce({ returnRequestId: 100, status: 'RECEIVED' });
    serviceMock.refundReturnRequest.mockResolvedValueOnce({ transactionId: 88, status: 'COMPLETED' });

    const createRes = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        orderId: 1,
        reason: 'DEFECTIVE',
        items: [{ orderItemId: 2, quantity: 1 }],
      });
    expect(createRes.status).toBe(201);

    const approveRes = await request(app)
      .patch('/api/returns/admin/100/approve')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);

    const receivedRes = await request(app)
      .patch('/api/returns/admin/100/mark-received')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(receivedRes.status).toBe(200);

    const refundRes = await request(app)
      .patch('/api/returns/admin/100/refund')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ method: 'ORIGINAL_PAYMENT', idempotencyKey: 'abc-12345678' });
    expect(refundRes.status).toBe(200);
  });

  it('create -> reject flow', async () => {
    const adminToken = signToken({ userId: 1, roles: ['Admin'] });
    serviceMock.rejectReturnRequest.mockResolvedValueOnce({ returnRequestId: 101, status: 'REJECTED' });

    const res = await request(app)
      .patch('/api/returns/admin/101/reject')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'invalid proof' });

    expect(res.status).toBe(200);
    expect(serviceMock.rejectReturnRequest).toHaveBeenCalled();
  });

  it('invalid transition returns error', async () => {
    const adminToken = signToken({ userId: 1, roles: ['Admin'] });
    serviceMock.approveReturnRequest.mockRejectedValueOnce({
      code: 'INVALID_STATE_TRANSITION',
      message: 'bad transition',
      status: 400,
    });

    const res = await request(app)
      .patch('/api/returns/admin/101/approve')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
  });

  it('idempotent refund returns same transaction', async () => {
    const adminToken = signToken({ userId: 1, roles: ['Admin'] });
    serviceMock.refundReturnRequest.mockResolvedValue({ transactionId: 777, idempotencyKey: 'same-k' });

    const p1 = await request(app)
      .patch('/api/returns/admin/100/refund')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ method: 'ORIGINAL_PAYMENT', idempotencyKey: 'same-key-1234' });

    const p2 = await request(app)
      .patch('/api/returns/admin/100/refund')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ method: 'ORIGINAL_PAYMENT', idempotencyKey: 'same-key-1234' });

    expect(p1.status).toBe(200);
    expect(p2.status).toBe(200);
  });
});
