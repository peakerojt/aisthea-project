
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { RegisterInput, LoginInput } from '../utils/schemas/auth.schema';
import { createVerificationToken } from './verification.service';
import { logger } from '../lib/logger';
import bcrypt from 'bcryptjs';
import { AppError, AppErrorWithData } from '../middlewares/error.middleware';

const LOCAL_LOGIN_PROVIDER = 'LOCAL';

const getLocalProviderKey = (userId: number) => `local:${userId}`;

export const registerUser = async (input: RegisterInput) => {
    const { email, password, fullName } = input;

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        if (existingUser.status === 'Pending') {
            throw new AppErrorWithData(
                409,
                'EMAIL_PENDING_VERIFICATION',
                'auth:errors.emailPendingVerification',
                {
                    email: existingUser.email,
                    requiresVerification: true,
                },
            );
        }

        throw new AppError(409, 'EMAIL_EXISTS', 'auth:errors.emailExists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Transaction to create user and assign default role
    const result = await prisma.$transaction(async (tx) => {
        // 1. Create User with Pending status (requires email verification)
        const user = await tx.user.create({
            data: {
                email,
                passwordHash,
                fullName,
                status: 'Pending',
            },
        });

        // 2. Find or Create Default Role (Customer)
        let role = await tx.role.findUnique({
            where: { roleName: 'Customer' },
        });

        if (!role) {
            role = await tx.role.create({
                data: { roleName: 'Customer' },
            });
        }

        // 3. Assign Role
        await tx.userRole.create({
            data: {
                userId: user.userId,
                roleId: role.roleId,
            },
        });

        return user;
    });

    // Create verification token and send email
    await createVerificationToken(result.userId, result.email, result.fullName);

    return {
        userId: result.userId,
        email: result.email,
        fullName: result.fullName,
        requiresVerification: true,
    };
};

export const loginUser = async (input: LoginInput) => {
    const { email, password } = input;

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            userRoles: {
                include: {
                    role: {
                        include: {
                            rolePermissions: {
                                include: { permission: { select: { code: true } } },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!user || !user.passwordHash) {
        logger.warn('Login failed: Invalid credentials', { email });
        throw new AppError(401, 'INVALID_CREDENTIALS', 'auth:errors.invalidCredentials');
    }

    if (user.status === 'Pending') {
        logger.warn('Login failed: Unverified email', { email });
        throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'auth:errors.emailNotVerified');
    }

    if (user.status === 'Banned') {
        logger.warn('Login failed: Account banned', { email, userId: user.userId });
        throw new AppError(403, 'ACCOUNT_BANNED', 'auth:errors.accountBanned');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
        logger.warn('Login failed: Invalid credentials', { email });
        throw new AppError(401, 'INVALID_CREDENTIALS', 'auth:errors.invalidCredentials');
    }

    const roles = user.userRoles.map(ur => ur.role.roleName);
    const permissions = [
        ...new Set(
            user.userRoles.flatMap((ur) =>
                ur.role.rolePermissions.map((rp) => rp.permission.code)
            )
        ),
    ];

    const JWT_SECRET = process.env.JWT_SECRET;
    const REFRESH_SECRET = process.env.REFRESH_SECRET;

    if (!JWT_SECRET || !REFRESH_SECRET) {
        throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'common:errors.internalServer');
    }

    const accessToken = jwt.sign(
        { userId: user.userId, email: user.email, roles },
        JWT_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { userId: user.userId },
        REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    // Persist hashed refresh token for rotation / revocation
    await persistRefreshToken(user.userId, refreshToken);

    logger.info('User login successful', { userId: user.userId, email: user.email, roles });

    return {
        user: {
            userId: user.userId,
            email: user.email,
            fullName: user.fullName,
            roles,
            permissions,
        },
        accessToken,
        refreshToken,
    };
};

/**
 * Store hashed refresh token on the user record for reuse detection/revocation.
 */
export const persistRefreshToken = async (userId: number, refreshToken: string) => {
    const hashed = await bcrypt.hash(refreshToken, 10);
    await prisma.userLogin.upsert({
        where: {
            loginProvider_providerKey: {
                loginProvider: LOCAL_LOGIN_PROVIDER,
                providerKey: getLocalProviderKey(userId),
            },
        },
        update: {
            refreshToken: hashed,
            tokenExpiry: null,
            accessToken: null,
        },
        create: {
            loginProvider: LOCAL_LOGIN_PROVIDER,
            providerKey: getLocalProviderKey(userId),
            userId,
            refreshToken: hashed,
            tokenExpiry: null,
            accessToken: null,
            providerDisplayName: 'Local',
        },
    });
};

export const getStoredRefreshTokenHash = async (userId: number): Promise<string | null> => {
    const login = await prisma.userLogin.findUnique({
        where: {
            loginProvider_providerKey: {
                loginProvider: LOCAL_LOGIN_PROVIDER,
                providerKey: getLocalProviderKey(userId),
            },
        },
        select: { refreshToken: true },
    });

    return login?.refreshToken ?? null;
};

export const revokeStoredRefreshToken = async (userId: number) => {
    await prisma.userLogin.upsert({
        where: {
            loginProvider_providerKey: {
                loginProvider: LOCAL_LOGIN_PROVIDER,
                providerKey: getLocalProviderKey(userId),
            },
        },
        update: {
            refreshToken: null,
        },
        create: {
            loginProvider: LOCAL_LOGIN_PROVIDER,
            providerKey: getLocalProviderKey(userId),
            userId,
            refreshToken: null,
            tokenExpiry: null,
            accessToken: null,
            providerDisplayName: 'Local',
        },
    });
};

// ============================================
// GOOGLE OAUTH SERVICES
// ============================================

/**
 * Upsert UserLogin record for OAuth provider
 * Creates new record or updates existing one with fresh tokens
 */
export const upsertUserLogin = async (
    userId: number,
    provider: string,
    providerKey: string,
    tokens: {
        accessToken: string;
        refreshToken?: string;
        expiresIn?: number;
    },
    providerDisplayName?: string
) => {
    // Calculate token expiry (default 1 hour if not provided)
    const expiresInSeconds = tokens.expiresIn || 3600;
    const tokenExpiry = new Date(Date.now() + expiresInSeconds * 1000);

    const userLogin = await prisma.userLogin.upsert({
        where: {
            loginProvider_providerKey: {
                loginProvider: provider,
                providerKey: providerKey,
            },
        },
        update: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken || null,
            tokenExpiry,
            providerDisplayName,
            updatedAt: new Date(),
        },
        create: {
            loginProvider: provider,
            providerKey: providerKey,
            userId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken || null,
            tokenExpiry,
            providerDisplayName,
        },
    });

    return userLogin;
};

/**
 * Get OAuth tokens for a user and provider
 */
export const getOAuthTokens = async (userId: number, provider: string) => {
    const userLogin = await prisma.userLogin.findFirst({
        where: {
            userId,
            loginProvider: provider,
        },
    });

    if (!userLogin) {
        return null;
    }

    return {
        accessToken: userLogin.accessToken,
        refreshToken: userLogin.refreshToken,
        tokenExpiry: userLogin.tokenExpiry,
    };
};

/**
 * Check if OAuth token is still valid
 */
export const isOAuthTokenValid = async (userId: number, provider: string): Promise<boolean> => {
    const tokens = await getOAuthTokens(userId, provider);

    if (!tokens || !tokens.tokenExpiry) {
        return false;
    }

    // Check if token expires in more than 5 minutes
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    return tokens.tokenExpiry.getTime() > Date.now() + bufferTime;
};

/**
 * Delete UserLogin record (unlink OAuth provider)
 */
export const unlinkOAuthProvider = async (userId: number, provider: string) => {
    const deleted = await prisma.userLogin.deleteMany({
        where: {
            userId,
            loginProvider: provider,
        },
    });

    return deleted.count > 0;
};
