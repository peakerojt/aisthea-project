import express from 'express';
import request from 'supertest';

let currentUser = { userId: 201, roles: ['Support'] as string[] };
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

const userController = {
  getProfile: jest.fn((_req, res) => res.json({ route: 'profile' })),
  updateProfile: jest.fn((_req, res) => res.json({ route: 'update-profile' })),
  uploadAvatar: jest.fn((_req, res) => res.json({ route: 'upload-avatar' })),
  deleteAvatar: jest.fn((_req, res) => res.json({ route: 'delete-avatar' })),
  getAddresses: jest.fn((_req, res) => res.json({ route: 'addresses' })),
  createAddress: jest.fn((_req, res) => res.status(201).json({ route: 'create-address' })),
  updateAddress: jest.fn((_req, res) => res.json({ route: 'update-address' })),
  deleteAddress: jest.fn((_req, res) => res.json({ route: 'delete-address' })),
  setDefaultAddress: jest.fn((_req, res) => res.json({ route: 'default-address' })),
  getBankAccounts: jest.fn((_req, res) => res.json({ route: 'bank-accounts' })),
  createBankAccount: jest.fn((_req, res) => res.status(201).json({ route: 'create-bank-account' })),
  updateBankAccount: jest.fn((_req, res) => res.json({ route: 'update-bank-account' })),
  deleteBankAccount: jest.fn((_req, res) => res.json({ route: 'delete-bank-account' })),
  setDefaultBankAccount: jest.fn((_req, res) => res.json({ route: 'default-bank-account' })),
  uploadBankQrImage: jest.fn((_req, res) => res.json({ route: 'upload-bank-qr' })),
  getRefundBenefits: jest.fn((_req, res) => res.json({ route: 'refund-benefits' })),
  getRecentOrders: jest.fn((_req, res) => res.json({ route: 'recent-orders' })),
  getAllUsers: jest.fn((_req, res) => res.json({ route: 'list-users' })),
  updateUserStatus: jest.fn((_req, res) => res.json({ route: 'status' })),
  updateUserRole: jest.fn((_req, res) => res.json({ route: 'role' })),
};

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

jest.mock('../user.controller', () => ({ userController }));

jest.mock('../../../middlewares/security.middleware', () => ({
  createAdminRateLimiters: () => [(_req: unknown, _res: unknown, next: () => void) => next()],
  createCustomerMutationRateLimiters: () => [(_req: unknown, _res: unknown, next: () => void) => next()],
}));

jest.mock('../../../middlewares/validate.middleware', () => ({
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('../../../middlewares/upload.middleware', () => ({
  upload: {
    single: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  },
}));

import { clearPermissionCache } from '../../../middlewares/auth.middleware';
import userRoutes from '../user.routes';

describe('user admin routes authorization', () => {
  const app = express();
  app.use(express.json());
  app.use(userRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = { userId: 201, roles: ['Support'] };
    currentPermissions = [];
    clearPermissionCache(201);
  });

  it('allows staff to load customer management data with VIEW_CUSTOMER', async () => {
    currentPermissions = ['VIEW_CUSTOMER'];

    const response = await request(app)
      .get('/')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'list-users' });
    expect(userController.getAllUsers).toHaveBeenCalledTimes(1);
  });

  it('blocks staff from loading customer management data without VIEW_CUSTOMER', async () => {
    const response = await request(app)
      .get('/')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        errorCode: 'PERMISSION_DENIED',
        required: 'VIEW_CUSTOMER',
      }),
    );
  });

  it('allows staff to update customer status with EDIT_CUSTOMER', async () => {
    currentPermissions = ['EDIT_CUSTOMER'];

    const response = await request(app)
      .patch('/9/status')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'status' });
    expect(userController.updateUserStatus).toHaveBeenCalledTimes(1);
  });

  it('keeps role reassignment admin-only even for staff with customer edit access', async () => {
    currentPermissions = ['EDIT_CUSTOMER'];

    const response = await request(app)
      .patch('/9/role')
      .set('Authorization', 'Bearer test-token')
      .send({ roleId: 2 });

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        errorCode: 'FORBIDDEN_ROLE',
      }),
    );
    expect(userController.updateUserRole).not.toHaveBeenCalled();
  });

  it('keeps admin users fully allowed on role mutations', async () => {
    currentUser = { userId: 1, roles: ['Admin'] };
    clearPermissionCache(1);

    const response = await request(app)
      .patch('/9/role')
      .set('Authorization', 'Bearer test-token')
      .send({ roleId: 2 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'role' });
    expect(userController.updateUserRole).toHaveBeenCalledTimes(1);
  });
});
