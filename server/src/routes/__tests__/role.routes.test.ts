import express from 'express';
import request from 'supertest';

const controllerMock = {
  listRoles: jest.fn((_req, res) => res.json({ route: 'list-roles' })),
  setRolePermissions: jest.fn((_req, res) => res.json({ route: 'set-role-permissions' })),
};

jest.mock('../../controllers/role.controller', () => ({
  listRoles: controllerMock.listRoles,
  setRolePermissions: controllerMock.setRolePermissions,
  listPermissionsGrouped: jest.fn(),
  listPermissionsFlat: jest.fn(),
}));

jest.mock('../../middlewares/auth.middleware', () => ({
  authenticateToken: (req: any, _res: unknown, next: () => void) => {
    const userId = Number(req.header('x-user-id') || 0);
    req.user = userId ? { userId, roles: ['Admin'] } : undefined;
    next();
  },
}));

import roleRoutes from '../role.routes';

describe('role routes', () => {
  const app = express();
  app.use(express.json());
  app.use(roleRoutes);

  beforeEach(() => {
    controllerMock.listRoles.mockClear();
    controllerMock.setRolePermissions.mockClear();
  });

  it('wires GET / to listRoles after auth middleware', async () => {
    const response = await request(app)
      .get('/')
      .set('x-user-id', '1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'list-roles' });
    expect(controllerMock.listRoles).toHaveBeenCalledTimes(1);
  });

  it('wires PUT /:id/permissions to setRolePermissions after auth middleware', async () => {
    const response = await request(app)
      .put('/5/permissions')
      .set('x-user-id', '1')
      .send({ permissionIds: [1, 2, 3] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'set-role-permissions' });
    expect(controllerMock.setRolePermissions).toHaveBeenCalledTimes(1);
  });
});
