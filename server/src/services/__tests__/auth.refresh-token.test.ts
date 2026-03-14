import {
  getStoredRefreshTokenHash,
  persistRefreshToken,
  revokeStoredRefreshToken,
} from '../auth.service';
import { prisma } from '../../utils/prisma';

jest.mock('../../utils/prisma', () => ({
  prisma: {
    userLogin: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

describe('auth refresh token persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores hashed refresh token in LOCAL provider login', async () => {
    const upsertMock = prisma.userLogin.upsert as jest.Mock;
    upsertMock.mockResolvedValue({});

    await persistRefreshToken(42, 'plain-refresh-token');

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const payload = upsertMock.mock.calls[0][0];

    expect(payload.where.loginProvider_providerKey.loginProvider).toBe('LOCAL');
    expect(payload.where.loginProvider_providerKey.providerKey).toBe('local:42');
    expect(payload.update.refreshToken).toEqual(expect.any(String));
    expect(payload.update.refreshToken).not.toBe('plain-refresh-token');
    expect(payload.create.userId).toBe(42);
  });

  it('reads stored refresh token hash by LOCAL provider key', async () => {
    const findUniqueMock = prisma.userLogin.findUnique as jest.Mock;
    findUniqueMock.mockResolvedValue({ refreshToken: 'stored-hash' });

    const result = await getStoredRefreshTokenHash(99);

    expect(result).toBe('stored-hash');
    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          loginProvider_providerKey: {
            loginProvider: 'LOCAL',
            providerKey: 'local:99',
          },
        },
      }),
    );
  });

  it('revokes refresh token for LOCAL provider login', async () => {
    const upsertMock = prisma.userLogin.upsert as jest.Mock;
    upsertMock.mockResolvedValue({});

    await revokeStoredRefreshToken(7);

    expect(upsertMock).toHaveBeenCalledTimes(1);
    const payload = upsertMock.mock.calls[0][0];
    expect(payload.where.loginProvider_providerKey.providerKey).toBe('local:7');
    expect(payload.update.refreshToken).toBeNull();
    expect(payload.create.refreshToken).toBeNull();
  });
});
