import express from 'express';
import request from 'supertest';

let currentUser = { userId: 101, roles: ['Support'] as string[] };
let currentPermissions: string[] = [];

const buildPermissionRows = (permissionCodes: string[]) => [
  {
    role: {
      rolePermissions: permissionCodes.map((code) => ({
        permission: { code },
      })),
    },
  },
];

const getAllOrdersMock = jest.fn((_req, res) => res.json({ route: 'admin-orders' }));
const getAdminOrderTabCountsMock = jest.fn((_req, res) => res.json({ route: 'admin-order-tab-counts' }));
const getAdminOrderDetailMock = jest.fn((_req, res) => res.json({ route: 'admin-order-detail' }));
const updateOrderStatusMock = jest.fn((_req, res) => res.json({ route: 'update-order-status' }));
const uploadDeliveryProofImagesMock = jest.fn((_req, res) => res.status(201).json({ route: 'upload-delivery-proof' }));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((_token, _secret, callback) => callback(null, currentUser)),
}));

jest.mock('../../lib/prisma', () => ({
  prisma: {
    userRole: {
      findMany: jest.fn(async () => buildPermissionRows(currentPermissions)),
    },
  },
}));

jest.mock('../../controllers/order.controller', () => ({
  getMyOrders: jest.fn(),
  getMyOrderDetail: jest.fn(),
  createOrder: jest.fn(),
  quoteOrder: jest.fn(),
  getAllOrders: getAllOrdersMock,
  getAdminOrderTabCounts: getAdminOrderTabCountsMock,
  getAdminOrderDetail: getAdminOrderDetailMock,
  updateOrderStatus: updateOrderStatusMock,
  confirmReceipt: jest.fn(),
  uploadDeliveryProofImages: uploadDeliveryProofImagesMock,
  uploadReturnProofImages: jest.fn(),
}));

jest.mock('../../middlewares/validate.middleware', () => ({
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('../../middlewares/upload.middleware', () => ({
  upload: {
    array: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  },
}));

import { clearPermissionCache } from '../../middlewares/auth.middleware';
import orderRoutes from '../order.routes';

describe('legacy order admin routes authorization', () => {
  const app = express();
  app.use(express.json());
  app.use(orderRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = { userId: 101, roles: ['Support'] };
    currentPermissions = [];
    clearPermissionCache(101);
  });

  it('allows staff to load admin orders when VIEW_ORDER is assigned', async () => {
    currentPermissions = ['VIEW_ORDER'];

    const response = await request(app)
      .get('/admin')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'admin-orders' });
    expect(getAllOrdersMock).toHaveBeenCalledTimes(1);
  });

  it('blocks staff from loading admin orders without VIEW_ORDER', async () => {
    const response = await request(app)
      .get('/admin')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        errorCode: 'PERMISSION_DENIED',
        required: 'VIEW_ORDER',
      }),
    );
    expect(getAllOrdersMock).not.toHaveBeenCalled();
  });

  it('allows staff to load aggregated order tab counts when VIEW_ORDER is assigned', async () => {
    currentPermissions = ['VIEW_ORDER'];

    const response = await request(app)
      .get('/admin/tab-counts?search=ORD&startDate=2026-01-01&endDate=2026-01-31')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'admin-order-tab-counts' });
    expect(getAdminOrderTabCountsMock).toHaveBeenCalledTimes(1);
  });

  it('allows staff to update order status when EDIT_ORDER is assigned', async () => {
    currentPermissions = ['EDIT_ORDER'];

    const response = await request(app)
      .patch('/55/status')
      .set('Authorization', 'Bearer test-token')
      .send({ status: 'Shipping' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'update-order-status' });
    expect(updateOrderStatusMock).toHaveBeenCalledTimes(1);
  });

  it('blocks staff order mutations without EDIT_ORDER', async () => {
    currentPermissions = ['VIEW_ORDER'];

    const response = await request(app)
      .patch('/55/status')
      .set('Authorization', 'Bearer test-token')
      .send({ status: 'Shipping' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        errorCode: 'PERMISSION_DENIED',
        required: 'EDIT_ORDER',
      }),
    );
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
  });

  it('keeps admin users fully allowed without explicit permission rows', async () => {
    currentUser = { userId: 1, roles: ['Admin'] };
    clearPermissionCache(1);

    const response = await request(app)
      .get('/admin/42')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'admin-order-detail' });
    expect(getAdminOrderDetailMock).toHaveBeenCalledTimes(1);
  });
});
