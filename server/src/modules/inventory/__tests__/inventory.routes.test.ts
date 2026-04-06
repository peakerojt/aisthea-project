import express from 'express';
import request from 'supertest';

let currentUser = { userId: 301, roles: ['Support'] as string[] };
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

const getInventoryMock = jest.fn((_req, res) => res.json({ route: 'inventory-list' }));
const bulkUpdateStockMock = jest.fn((_req, res) => res.json({ route: 'inventory-update' }));
const getLowStockAlertsMock = jest.fn((_req, res) => res.json({ route: 'inventory-alerts' }));
const getInventoryLogsMock = jest.fn((_req, res) => res.json({ route: 'inventory-logs' }));
const getInventorySummaryMock = jest.fn((_req, res) => res.json({ route: 'inventory-summary' }));
const getStockMovementsMock = jest.fn((_req, res) => res.json({ route: 'inventory-movements' }));

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

jest.mock('../../../controllers/inventory.controller', () => ({
  getInventory: getInventoryMock,
  bulkUpdateStock: bulkUpdateStockMock,
  getLowStockAlerts: getLowStockAlertsMock,
  getInventoryLogs: getInventoryLogsMock,
  getInventorySummary: getInventorySummaryMock,
  getStockMovements: getStockMovementsMock,
}));

import { clearPermissionCache } from '../../../middlewares/auth.middleware';
import inventoryRoutes from '../inventory.routes';

describe('inventory routes authorization', () => {
  const app = express();
  app.use(express.json());
  app.use(inventoryRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = { userId: 301, roles: ['Support'] };
    currentPermissions = [];
    clearPermissionCache(301);
  });

  it('allows staff inventory reads with VIEW_INVENTORY', async () => {
    currentPermissions = ['VIEW_INVENTORY'];

    const response = await request(app)
      .get('/')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'inventory-list' });
    expect(getInventoryMock).toHaveBeenCalledTimes(1);
  });

  it('also allows staff inventory reads with EDIT_INVENTORY', async () => {
    currentPermissions = ['EDIT_INVENTORY'];

    const response = await request(app)
      .get('/summary')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'inventory-summary' });
    expect(getInventorySummaryMock).toHaveBeenCalledTimes(1);
  });

  it('blocks staff inventory writes without EDIT_INVENTORY', async () => {
    currentPermissions = ['VIEW_INVENTORY'];

    const response = await request(app)
      .patch('/update')
      .set('Authorization', 'Bearer test-token')
      .send([{ variantId: 1, quantity: 5 }]);

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        errorCode: 'PERMISSION_DENIED',
        required: 'EDIT_INVENTORY',
      }),
    );
    expect(bulkUpdateStockMock).not.toHaveBeenCalled();
  });

  it('allows staff inventory writes with EDIT_INVENTORY', async () => {
    currentPermissions = ['EDIT_INVENTORY'];

    const response = await request(app)
      .patch('/update')
      .set('Authorization', 'Bearer test-token')
      .send([{ variantId: 1, quantity: 5 }]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'inventory-update' });
    expect(bulkUpdateStockMock).toHaveBeenCalledTimes(1);
  });

  it('keeps admin users fully allowed on inventory routes', async () => {
    currentUser = { userId: 1, roles: ['Admin'] };
    clearPermissionCache(1);

    const response = await request(app)
      .get('/alerts')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'inventory-alerts' });
    expect(getLowStockAlertsMock).toHaveBeenCalledTimes(1);
  });
});
