import express from 'express';
import request from 'supertest';

const controllerMock = {
  listPermissionsGrouped: jest.fn((_req, res) => res.json({ route: 'list-permissions-grouped' })),
  listPermissionsFlat: jest.fn((_req, res) => res.json({ route: 'list-permissions-flat' })),
};

jest.mock('../../controllers/role.controller', () => ({
  listRoles: jest.fn(),
  setRolePermissions: jest.fn(),
  listPermissionsGrouped: controllerMock.listPermissionsGrouped,
  listPermissionsFlat: controllerMock.listPermissionsFlat,
}));

jest.mock('../../middlewares/auth.middleware', () => ({
  authenticateToken: (req: any, _res: unknown, next: () => void) => {
    const userId = Number(req.header('x-user-id') || 0);
    req.user = userId ? { userId, roles: ['Admin'] } : undefined;
    next();
  },
}));

import permissionRoutes from '../permission.routes';

describe('permission routes', () => {
  const app = express();
  app.use(express.json());
  app.use(permissionRoutes);

  beforeEach(() => {
    controllerMock.listPermissionsGrouped.mockClear();
    controllerMock.listPermissionsFlat.mockClear();
  });

  it('wires GET / to listPermissionsGrouped after auth middleware', async () => {
    const response = await request(app)
      .get('/')
      .set('x-user-id', '1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'list-permissions-grouped' });
    expect(controllerMock.listPermissionsGrouped).toHaveBeenCalledTimes(1);
  });

  it('wires GET /list to listPermissionsFlat after auth middleware', async () => {
    const response = await request(app)
      .get('/list')
      .set('x-user-id', '1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'list-permissions-flat' });
    expect(controllerMock.listPermissionsFlat).toHaveBeenCalledTimes(1);
  });
});
