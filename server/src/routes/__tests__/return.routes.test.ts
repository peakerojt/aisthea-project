import express from 'express';
import request from 'supertest';

const prismaMock = {
  orderReturn: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  },
};
const getReturnDetailMock = jest.fn();
const getMyReturnsMock = jest.fn();

const controllerMock = {
  getAdminReturns: jest.fn((_req, res) => res.json({ route: 'admin-list' })),
  patchProcessReturn: jest.fn((_req, res) => res.json({ route: 'process-return' })),
};

jest.mock('../../utils/prisma', () => ({
  prisma: prismaMock,
}));

jest.mock('../../controllers/return.controller', () => controllerMock);
jest.mock('../../modules/return-order/services/return-request.service', () => ({
  ReturnRequestService: jest.fn().mockImplementation(() => ({
    getMyReturns: (...args: unknown[]) => getMyReturnsMock(...args),
    getReturnDetail: (...args: unknown[]) => getReturnDetailMock(...args),
  })),
}));

jest.mock('../../middlewares/auth.middleware', () => ({
  authenticateToken: (req: any, _res: unknown, next: () => void) => {
    const userId = Number(req.header('x-user-id') || 0);
    const rolesHeader = String(req.header('x-user-roles') || '');
    const roles = rolesHeader
      .split(',')
      .map((value: string) => value.trim())
      .filter(Boolean);

    req.user = userId
      ? {
          userId,
          roles,
        }
      : undefined;

    next();
  },
}));

import returnRoutes from '../return.routes';

describe('legacy return routes', () => {
  const app = express();
  app.use(express.json());
  app.use(returnRoutes);

  beforeEach(() => {
    prismaMock.orderReturn.findMany.mockReset();
    prismaMock.orderReturn.count.mockReset();
    prismaMock.orderReturn.findUnique.mockReset();
    getMyReturnsMock.mockReset();
    getReturnDetailMock.mockReset();
    controllerMock.getAdminReturns.mockClear();
    controllerMock.patchProcessReturn.mockClear();
  });

  it('returns unauthorized for /my when no authenticated user is present', async () => {
    const response = await request(app).get('/my');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Unauthorized',
    });
    expect(prismaMock.orderReturn.findMany).not.toHaveBeenCalled();
  });

  it('returns paginated customer returns with parsed proofImages', async () => {
    prismaMock.orderReturn.findMany.mockResolvedValueOnce([
      {
        returnId: 1,
        userId: 7,
        proofImages: '["https://example.com/proof-1.jpg"]',
        order: { orderNumber: 'ORD-1', totalAmount: 120000 },
      },
      {
        returnId: 2,
        userId: 7,
        proofImages: 'not-json',
        order: { orderNumber: 'ORD-2', totalAmount: 150000 },
      },
    ]);
    prismaMock.orderReturn.count.mockResolvedValueOnce(2);

    const response = await request(app)
      .get('/my?page=2&limit=1')
      .set('x-user-id', '7');

    expect(prismaMock.orderReturn.findMany).toHaveBeenCalledWith({
      where: { userId: 7 },
      orderBy: { createdAt: 'desc' },
      skip: 1,
      take: 1,
      include: {
        order: { select: { orderNumber: true, totalAmount: true } },
      },
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        returns: [
          {
            returnId: 1,
            userId: 7,
            proofImages: ['https://example.com/proof-1.jpg'],
            order: { orderNumber: 'ORD-1', totalAmount: 120000 },
          },
          {
            returnId: 2,
            userId: 7,
            proofImages: [],
            order: { orderNumber: 'ORD-2', totalAmount: 150000 },
          },
        ],
        pagination: {
          page: 2,
          pageSize: 1,
          total: 2,
          totalPages: 2,
        },
      },
    });
    expect(getMyReturnsMock).not.toHaveBeenCalled();
  });

  it('falls back to return-request customer list when the legacy list is empty', async () => {
    prismaMock.orderReturn.findMany.mockResolvedValueOnce([]);
    prismaMock.orderReturn.count.mockResolvedValueOnce(0);
    getMyReturnsMock.mockResolvedValueOnce({
      data: [
        {
          returnRequestId: 101,
          orderId: 500,
          userId: 7,
          reason: 'DEFECTIVE',
          status: 'REQUESTED',
          note: 'Need support review',
          createdAt: '2026-03-20T09:00:00.000Z',
          updatedAt: '2026-03-21T10:00:00.000Z',
          attachments: [{ fileUrl: 'https://example.com/proof-101.jpg' }],
          order: {
            orderNumber: 'ORD-500',
            totalAmount: '250000',
          },
        },
      ],
      total: 1,
      page: 2,
      limit: 1,
      totalPages: 1,
    });

    const response = await request(app)
      .get('/my?page=2&limit=1')
      .set('x-user-id', '7');

    expect(getMyReturnsMock).toHaveBeenCalledWith(7, 2, 1);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        returns: [
          {
            returnId: 101,
            orderId: 500,
            userId: 7,
            reason: 'DEFECTIVE',
            proofImages: ['https://example.com/proof-101.jpg'],
            status: 'REQUESTED',
            adminNote: 'Need support review',
            createdAt: '2026-03-20T09:00:00.000Z',
            updatedAt: '2026-03-21T10:00:00.000Z',
            order: {
              orderNumber: 'ORD-500',
              totalAmount: '250000',
              customerName: '',
              customerPhone: '',
            },
            user: null,
          },
        ],
        pagination: {
          page: 2,
          pageSize: 1,
          total: 1,
          totalPages: 1,
        },
      },
    });
  });

  it('blocks customers from reading another user return detail', async () => {
    prismaMock.orderReturn.findUnique.mockResolvedValueOnce({
      returnId: 44,
      userId: 99,
      proofImages: '[]',
      order: { orderNumber: 'ORD-44', totalAmount: 100000, customerName: 'A', customerPhone: '1' },
      user: { userId: 99, fullName: 'Owner', email: 'owner@example.com', avatarUrl: null },
    });

    const response = await request(app)
      .get('/44')
      .set('x-user-id', '7')
      .set('x-user-roles', 'Customer');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Forbidden',
    });
  });

  it('returns detail with parsed proofImages for admin roles', async () => {
    prismaMock.orderReturn.findUnique.mockResolvedValueOnce({
      returnId: 45,
      userId: 99,
      proofImages: '["https://example.com/proof-45.jpg"]',
      order: { orderNumber: 'ORD-45', totalAmount: 100000, customerName: 'A', customerPhone: '1' },
      user: { userId: 99, fullName: 'Owner', email: 'owner@example.com', avatarUrl: null },
    });

    const response = await request(app)
      .get('/45')
      .set('x-user-id', '1')
      .set('x-user-roles', 'Admin');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        returnId: 45,
        userId: 99,
        proofImages: ['https://example.com/proof-45.jpg'],
        order: { orderNumber: 'ORD-45', totalAmount: 100000, customerName: 'A', customerPhone: '1' },
        user: { userId: 99, fullName: 'Owner', email: 'owner@example.com', avatarUrl: null },
      },
    });
  });

  it('falls back to return-request detail when the legacy record is missing', async () => {
    prismaMock.orderReturn.findUnique.mockResolvedValueOnce(null);
    getReturnDetailMock.mockResolvedValueOnce({
      returnRequestId: 46,
      orderId: 46,
      userId: 99,
      reason: 'WRONG_ITEM',
      status: 'REQUESTED',
      note: 'Original note',
      createdAt: '2026-03-20T09:00:00.000Z',
      updatedAt: '2026-03-21T10:00:00.000Z',
      attachments: [{ fileUrl: 'https://example.com/proof-46.jpg' }],
      statusLogs: [
        { comment: 'Customer created return request' },
        { comment: 'Support reviewed evidence' },
      ],
      order: {
        orderNumber: 'ORD-46',
        totalAmount: '100000',
        customerName: 'A',
        customerPhone: '1',
      },
      user: {
        userId: 99,
        fullName: 'Owner',
        email: 'owner@example.com',
        avatarUrl: null,
      },
    });

    const response = await request(app)
      .get('/46')
      .set('x-user-id', '1')
      .set('x-user-roles', 'Admin');

    expect(getReturnDetailMock).toHaveBeenCalledWith(46);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        returnId: 46,
        orderId: 46,
        userId: 99,
        reason: 'WRONG_ITEM',
        proofImages: ['https://example.com/proof-46.jpg'],
        status: 'REQUESTED',
        adminNote: 'Support reviewed evidence',
        createdAt: '2026-03-20T09:00:00.000Z',
        updatedAt: '2026-03-21T10:00:00.000Z',
        order: {
          orderNumber: 'ORD-46',
          totalAmount: '100000',
          customerName: 'A',
          customerPhone: '1',
        },
        user: {
          userId: 99,
          fullName: 'Owner',
          email: 'owner@example.com',
          avatarUrl: null,
        },
      },
    });
  });

  it('returns not found when both legacy and return-request detail lookups miss', async () => {
    prismaMock.orderReturn.findUnique.mockResolvedValueOnce(null);
    getReturnDetailMock.mockResolvedValueOnce(null);

    const response = await request(app)
      .get('/47')
      .set('x-user-id', '1')
      .set('x-user-roles', 'Admin');

    expect(getReturnDetailMock).toHaveBeenCalledWith(47);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Return not found',
    });
  });

  it('keeps admin list and process routes wired to the legacy controller', async () => {
    const listResponse = await request(app)
      .get('/')
      .set('x-user-id', '1')
      .set('x-user-roles', 'Admin');
    const processResponse = await request(app)
      .patch('/55/process')
      .set('x-user-id', '1')
      .set('x-user-roles', 'Admin')
      .send({ action: 'APPROVE' });

    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toEqual({ route: 'admin-list' });
    expect(processResponse.status).toBe(200);
    expect(processResponse.body).toEqual({ route: 'process-return' });
    expect(controllerMock.getAdminReturns).toHaveBeenCalledTimes(1);
    expect(controllerMock.patchProcessReturn).toHaveBeenCalledTimes(1);
  });
});
