const getAllRolesMock = jest.fn();
const getAllPermissionsMock = jest.fn();
const getPermissionsListMock = jest.fn();
const updateRolePermissionsMock = jest.fn();
const loggerMock = {
  error: jest.fn(),
};

jest.mock('../../services/permission.service', () => ({
  getAllRoles: (...args: unknown[]) => getAllRolesMock(...args),
  getAllPermissions: (...args: unknown[]) => getAllPermissionsMock(...args),
  getPermissionsList: (...args: unknown[]) => getPermissionsListMock(...args),
  updateRolePermissions: (...args: unknown[]) => updateRolePermissionsMock(...args),
}));

jest.mock('../../lib/logger', () => ({
  logger: loggerMock,
}));

import {
  listPermissionsFlat,
  listPermissionsGrouped,
  listRoles,
  setRolePermissions,
} from '../role.controller';

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('role.controller', () => {
  beforeEach(() => {
    getAllRolesMock.mockReset();
    getAllPermissionsMock.mockReset();
    getPermissionsListMock.mockReset();
    updateRolePermissionsMock.mockReset();
    loggerMock.error.mockReset();
  });

  it('maps roles into the API response contract', async () => {
    getAllRolesMock.mockResolvedValueOnce([
      {
        roleId: 1,
        roleName: 'Super Admin',
        rolePermissions: [{ permissionId: 10 }, { permissionId: 11 }],
      },
      {
        roleId: 2,
        roleName: 'Admin',
        rolePermissions: [{ permissionId: 12 }],
      },
      {
        roleId: 3,
        roleName: 'Support',
        rolePermissions: [],
      },
    ]);

    const res = createResponse();

    await listRoles({} as any, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        {
          roleId: 1,
          roleName: 'Super Admin',
          displayName: 'Super Admin',
          isProtected: true,
          assignable: false,
          permissionIds: [10, 11],
        },
        {
          roleId: 2,
          roleName: 'Admin',
          displayName: 'Admin',
          isProtected: false,
          assignable: true,
          permissionIds: [12],
        },
        {
          roleId: 3,
          roleName: 'Support',
          displayName: 'Staff',
          isProtected: false,
          assignable: true,
          permissionIds: [],
        },
      ],
    });
  });

  it('returns FETCH_ROLES_FAILED when listing roles crashes', async () => {
    const error = new Error('roles query failed');
    getAllRolesMock.mockRejectedValueOnce(error);
    const res = createResponse();

    await listRoles({} as any, res);

    expect(loggerMock.error).toHaveBeenCalledWith('[roleController] listRoles failed', { error });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'FETCH_ROLES_FAILED',
    });
  });

  it('returns grouped permissions successfully', async () => {
    getAllPermissionsMock.mockResolvedValueOnce([
      { module: 'orders', permissions: [{ permissionId: 1, action: 'read' }] },
    ]);
    const res = createResponse();

    await listPermissionsGrouped({} as any, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ module: 'orders', permissions: [{ permissionId: 1, action: 'read' }] }],
    });
  });

  it('returns FETCH_PERMISSIONS_FAILED when grouped permissions crash', async () => {
    const error = new Error('permissions grouped failed');
    getAllPermissionsMock.mockRejectedValueOnce(error);
    const res = createResponse();

    await listPermissionsGrouped({} as any, res);

    expect(loggerMock.error).toHaveBeenCalledWith(
      '[roleController] listPermissionsGrouped failed',
      { error },
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'FETCH_PERMISSIONS_FAILED',
    });
  });

  it('returns flat permissions successfully', async () => {
    getPermissionsListMock.mockResolvedValueOnce([
      { permissionId: 1, permissionName: 'orders.read' },
    ]);
    const res = createResponse();

    await listPermissionsFlat({} as any, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [{ permissionId: 1, permissionName: 'orders.read' }],
    });
  });

  it('returns INVALID_ROLE_ID when the role id cannot be parsed', async () => {
    const req: any = {
      params: { id: 'abc' },
      body: { permissionIds: [1, 2] },
    };
    const res = createResponse();

    await setRolePermissions(req, res);

    expect(updateRolePermissionsMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'INVALID_ROLE_ID',
    });
  });

  it('returns INVALID_PERMISSION_IDS when permissionIds is not an array', async () => {
    const req: any = {
      params: { id: '2' },
      body: { permissionIds: '1,2' },
    };
    const res = createResponse();

    await setRolePermissions(req, res);

    expect(updateRolePermissionsMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'INVALID_PERMISSION_IDS',
    });
  });

  it('returns success when role permissions are updated', async () => {
    updateRolePermissionsMock.mockResolvedValueOnce({
      roleId: 2,
      permissionIds: [3, 4],
    });
    const req: any = {
      params: { id: '2' },
      body: { permissionIds: [3, 4] },
    };
    const res = createResponse();

    await setRolePermissions(req, res);

    expect(updateRolePermissionsMock).toHaveBeenCalledWith(2, [3, 4]);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      code: 'PERMISSIONS_UPDATED',
      data: {
        roleId: 2,
        permissionIds: [3, 4],
      },
    });
  });

  it('preserves SUPER_ADMIN_PROTECTED as a 403 contract', async () => {
    updateRolePermissionsMock.mockRejectedValueOnce(new Error('SUPER_ADMIN_PROTECTED'));
    const req: any = {
      params: { id: '1' },
      body: { permissionIds: [3, 4] },
    };
    const res = createResponse();

    await setRolePermissions(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'SUPER_ADMIN_PROTECTED',
    });
  });

  it('preserves ROLE_NOT_FOUND as a 404 contract', async () => {
    updateRolePermissionsMock.mockRejectedValueOnce(new Error('ROLE_NOT_FOUND'));
    const req: any = {
      params: { id: '9' },
      body: { permissionIds: [3, 4] },
    };
    const res = createResponse();

    await setRolePermissions(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'ROLE_NOT_FOUND',
    });
  });
});
