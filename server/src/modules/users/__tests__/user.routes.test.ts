import express from 'express';
import request from 'supertest';

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
  uploadBankQrImage: jest.fn((_req, res) => res.json({ route: 'upload-bank-qr-image' })),
  getRefundBenefits: jest.fn((_req, res) => res.json({ route: 'refund-benefits' })),
  getRecentOrders: jest.fn((_req, res) => res.json({ route: 'recent-orders' })),
  getAllUsers: jest.fn((_req, res) => res.json({ route: 'list-users' })),
  updateUserStatus: jest.fn((_req, res) => res.json({ route: 'status' })),
  updateUserRole: jest.fn((_req, res) => res.json({ route: 'role' })),
};

jest.mock('../user.controller', () => ({ userController }));
jest.mock('../../../middlewares/auth.middleware', () => ({
  authenticateToken: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { userId: 7, roles: ['Admin'] };
    next();
  },
  checkRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../../../middlewares/validate.middleware', () => ({
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock('../../../middlewares/upload.middleware', () => ({
  upload: {
    single: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  },
}));
jest.mock('../../../middlewares/security.middleware', () => ({
  createAdminRateLimiters: () => [(_req: unknown, _res: unknown, next: () => void) => next()],
  createCustomerMutationRateLimiters: () => [(_req: unknown, _res: unknown, next: () => void) => next()],
}));

import userRoutes from '../user.routes';

describe('user module routes', () => {
  const app = express();
  app.use(express.json());
  app.use(userRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps profile route owned by the user module controller', async () => {
    const response = await request(app).get('/profile');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'profile' });
    expect(userController.getProfile).toHaveBeenCalledTimes(1);
  });

  it('keeps avatar uploads on the module controller', async () => {
    const response = await request(app).post('/avatar');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'upload-avatar' });
    expect(userController.uploadAvatar).toHaveBeenCalledTimes(1);
  });

  it('keeps admin listing route on the module controller', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'list-users' });
    expect(userController.getAllUsers).toHaveBeenCalledTimes(1);
  });

  it('keeps role updates on the module controller', async () => {
    const response = await request(app).patch('/9/role').send({ roleId: 2 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'role' });
    expect(userController.updateUserRole).toHaveBeenCalledTimes(1);
  });
});
