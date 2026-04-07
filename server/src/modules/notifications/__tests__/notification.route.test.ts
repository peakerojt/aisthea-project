import express from 'express';
import request from 'supertest';

let currentUser = { userId: 901, roles: ['Support'] as string[] };
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

const listEmailJobsMock = jest.fn((_req, res) => res.json({ route: 'notification-list' }));
const retryEmailJobMock = jest.fn((_req, res) => res.json({ route: 'notification-retry' }));
const cleanupEmailJobsMock = jest.fn((_req, res) => res.json({ route: 'notification-cleanup' }));

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

jest.mock('../notification.controller', () => ({
  notificationController: {
    listEmailJobs: (req: unknown, res: unknown, _next: unknown) => listEmailJobsMock(req, res),
    retryEmailJob: (req: unknown, res: unknown, _next: unknown) => retryEmailJobMock(req, res),
    cleanupEmailJobs: (req: unknown, res: unknown, _next: unknown) =>
      cleanupEmailJobsMock(req, res),
  },
}));

import { clearPermissionCache } from '../../../middlewares/auth.middleware';
import notificationRoutes from '../notification.route';

describe('notification routes authorization', () => {
  const app = express();
  app.use(express.json());
  app.use(notificationRoutes);

  beforeEach(() => {
    jest.clearAllMocks();
    currentUser = { userId: 901, roles: ['Support'] };
    currentPermissions = [];
    clearPermissionCache(901);
  });

  it('allows queue reads with VIEW_ORDER', async () => {
    currentPermissions = ['VIEW_ORDER'];

    const response = await request(app)
      .get('/email-jobs')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'notification-list' });
    expect(listEmailJobsMock).toHaveBeenCalledTimes(1);
  });

  it('blocks manual retry without EDIT_ORDER', async () => {
    currentPermissions = ['VIEW_ORDER'];

    const response = await request(app)
      .post('/email-jobs/12/retry')
      .set('Authorization', 'Bearer test-token');

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        errorCode: 'PERMISSION_DENIED',
        required: 'EDIT_ORDER',
      }),
    );
    expect(retryEmailJobMock).not.toHaveBeenCalled();
  });

  it('allows cleanup with EDIT_ORDER', async () => {
    currentPermissions = ['EDIT_ORDER'];

    const response = await request(app)
      .post('/email-jobs/cleanup')
      .set('Authorization', 'Bearer test-token')
      .send({ olderThanDays: 30 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'notification-cleanup' });
    expect(cleanupEmailJobsMock).toHaveBeenCalledTimes(1);
  });
});
