const findUniqueUserMock = jest.fn();
const roleFindUniqueMock = jest.fn();
const roleCreateMock = jest.fn();
const userCreateMock = jest.fn();
const userRoleCreateMock = jest.fn();
const transactionMock = jest.fn();
const createVerificationTokenMock = jest.fn();
const hashMock = jest.fn();

jest.mock('../../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueUserMock(...args),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

jest.mock('../verification.service', () => ({
  createVerificationToken: (...args: unknown[]) => createVerificationTokenMock(...args),
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: (...args: unknown[]) => hashMock(...args),
    compare: jest.fn(),
  },
}));

import { registerUser } from '../auth.service';

describe('registerUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hashMock.mockResolvedValue('hashed-password');
    roleFindUniqueMock.mockResolvedValue({ roleId: 2, roleName: 'Customer' });
    roleCreateMock.mockResolvedValue({ roleId: 2, roleName: 'Customer' });
    userCreateMock.mockResolvedValue({
      userId: 10,
      email: 'fresh@example.com',
      fullName: 'Fresh User',
    });
    userRoleCreateMock.mockResolvedValue({});
    createVerificationTokenMock.mockResolvedValue('123456');
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        user: {
          create: (...args: unknown[]) => userCreateMock(...args),
        },
        role: {
          findUnique: (...args: unknown[]) => roleFindUniqueMock(...args),
          create: (...args: unknown[]) => roleCreateMock(...args),
        },
        userRole: {
          create: (...args: unknown[]) => userRoleCreateMock(...args),
        },
      }),
    );
  });

  it('throws EMAIL_PENDING_VERIFICATION for existing pending users', async () => {
    findUniqueUserMock.mockResolvedValue({
      userId: 11,
      email: 'pending@example.com',
      status: 'Pending',
    });

    await expect(
      registerUser({
        email: 'pending@example.com',
        password: 'Secret123!',
        fullName: 'Pending User',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'EMAIL_PENDING_VERIFICATION',
      data: {
        email: 'pending@example.com',
        requiresVerification: true,
      },
    });

    expect(transactionMock).not.toHaveBeenCalled();
    expect(createVerificationTokenMock).not.toHaveBeenCalled();
  });

  it('throws EMAIL_EXISTS for existing active users', async () => {
    findUniqueUserMock.mockResolvedValue({
      userId: 12,
      email: 'active@example.com',
      status: 'Active',
    });

    await expect(
      registerUser({
        email: 'active@example.com',
        password: 'Secret123!',
        fullName: 'Active User',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'EMAIL_EXISTS',
    });

    expect(transactionMock).not.toHaveBeenCalled();
    expect(createVerificationTokenMock).not.toHaveBeenCalled();
  });

  it('creates a pending user, assigns the default role, and sends verification', async () => {
    findUniqueUserMock.mockResolvedValue(null);

    const result = await registerUser({
      email: 'fresh@example.com',
      password: 'Secret123!',
      fullName: 'Fresh User',
    });

    expect(hashMock).toHaveBeenCalledWith('Secret123!', 10);
    expect(userCreateMock).toHaveBeenCalledWith({
      data: {
        email: 'fresh@example.com',
        passwordHash: 'hashed-password',
        fullName: 'Fresh User',
        status: 'Pending',
      },
    });
    expect(roleFindUniqueMock).toHaveBeenCalledWith({
      where: { roleName: 'Customer' },
    });
    expect(userRoleCreateMock).toHaveBeenCalledWith({
      data: {
        userId: 10,
        roleId: 2,
      },
    });
    expect(createVerificationTokenMock).toHaveBeenCalledWith(10, 'fresh@example.com', 'Fresh User');
    expect(result).toEqual({
      userId: 10,
      email: 'fresh@example.com',
      fullName: 'Fresh User',
      requiresVerification: true,
    });
  });
});
