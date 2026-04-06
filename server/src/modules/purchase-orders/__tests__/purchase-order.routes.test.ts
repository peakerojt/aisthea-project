import express from 'express';
import request from 'supertest';

let currentUser = { userId: 401, roles: ['Support'] as string[] };
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

const listPurchaseOrdersMock = jest.fn((_req, res) => res.json({ route: 'po-list' }));
const createPurchaseOrderMock = jest.fn((_req, res) => res.status(201).json({ route: 'po-create' }));
const receivePurchaseOrderMock = jest.fn((_req, res) => res.json({ route: 'po-receive' }));
const cancelPurchaseOrderMock = jest.fn((_req, res) => res.json({ route: 'po-cancel' }));
const getPurchaseOrderByIdMock = jest.fn((_req, res) => res.json({ route: 'po-detail' }));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((_token, _secret, callback) => callback(null, currentUser)),
}));

jest.mock('../../../lib/prisma', () => ({
  prisma: {
    userRole: {
      findMany: jest.fn(async () => buildPermissionRows(currentPermissions)),
    },
  },
}));

jest.mock('../purchase-order.controller', () => ({
  listPurchaseOrders: listPurchaseOrdersMock,
  createPurchaseOrder: createPurchaseOrderMock,
  receivePurchaseOrder: receivePurchaseOrderMock,
  cancelPurchaseOrder: cancelPurchaseOrderMock,
  getPurchaseOrderById: getPurchaseOrderByIdMock,
}));

import { clearPermissionCache } from '../../../middlewares/auth.middleware';
import purchaseOrderRoutes from '../purchase-order.routes';

describe('purchase-order routes authorization', () => {
  const app = express();
  app.use(express.json());
  app.use(purchaseOrderRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = { userId: 401, roles: ['Support'] };
    currentPermissions = [];
    clearPermissionCache(401);
  });

  it('allows staff to load purchase orders with VIEW_INVENTORY', async () => {
    currentPermissions = ['VIEW_INVENTORY'];

    const response = await request(app)
      .get('/')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'po-list' });
    expect(listPurchaseOrdersMock).toHaveBeenCalledTimes(1);
  });

  it('blocks staff purchase-order writes without EDIT_INVENTORY', async () => {
    currentPermissions = ['VIEW_INVENTORY'];

    const response = await request(app)
      .post('/')
      .set('Authorization', 'Bearer test-token')
      .send({ supplier: 'NCC A', items: [] });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        errorCode: 'PERMISSION_DENIED',
        required: 'EDIT_INVENTORY',
      }),
    );
    expect(createPurchaseOrderMock).not.toHaveBeenCalled();
  });

  it('allows staff purchase-order writes with EDIT_INVENTORY', async () => {
    currentPermissions = ['EDIT_INVENTORY'];

    const response = await request(app)
      .post('/')
      .set('Authorization', 'Bearer test-token')
      .send({ supplier: 'NCC A', items: [] });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ route: 'po-create' });
    expect(createPurchaseOrderMock).toHaveBeenCalledTimes(1);
  });

  it('keeps admin users fully allowed on purchase-order reads', async () => {
    currentUser = { userId: 1, roles: ['Super Admin'] };
    clearPermissionCache(1);

    const response = await request(app)
      .get('/9')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'po-detail' });
    expect(getPurchaseOrderByIdMock).toHaveBeenCalledTimes(1);
  });
});
