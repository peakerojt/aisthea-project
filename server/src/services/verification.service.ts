import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { notificationService } from '../modules/notifications/notification.service';
import { serializeMailError } from '../modules/notifications/email.providers';
import { logger } from '../lib/logger';
import { AppError } from '../middlewares/error.middleware';

const TOKEN_EXPIRY_HOURS = 24;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret';

/**
 * Generate a 6-digit verification code
 */
const generateVerificationCode = (): string => {
    // Generate 6-digit code (100000-999999)
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Create a verification token for a user and enqueue verification email delivery.
 */
export const createVerificationToken = async (userId: number, email: string, fullName: string) => {
    const token = generateVerificationCode();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    try {
        await prisma.$transaction(async (tx) => {
            await tx.emailVerificationToken.deleteMany({
                where: { userId },
            });

            await tx.emailVerificationToken.create({
                data: {
                    userId,
                    token,
                    expiresAt,
                },
            });

            await notificationService.enqueueVerificationEmail(
                {
                    userId,
                    email,
                    fullName,
                    code: token,
                },
                tx,
            );
        });
    } catch (error) {
        logger.error('[verificationService] Failed to enqueue verification email', {
            enqueueError: serializeMailError(error),
            userId,
            email,
        });
        throw new AppError(503, 'EMAIL_ENQUEUE_FAILED', 'auth:errors.verificationEmailFailed');
    }

    return token;
};

/**
 * Verify email using token
 */
export const verifyEmailToken = async (token: string) => {
    // Find the token
    const verificationToken = await prisma.emailVerificationToken.findUnique({
        where: { token },
        include: { user: true },
    });



    if (!verificationToken) {
        throw new AppError(400, 'INVALID_TOKEN', 'auth:errors.invalidToken');
    }

    // Check if token has expired
    if (new Date() > verificationToken.expiresAt) {
        // Delete expired token
        await prisma.emailVerificationToken.delete({
            where: { token },
        });
        throw new AppError(400, 'TOKEN_EXPIRED', 'auth:errors.tokenExpired');
    }

    // Check if user is already verified
    if (verificationToken.user.status === 'Active') {
        // Delete the token since user is already verified
        await prisma.emailVerificationToken.delete({
            where: { token },
        });
        throw new AppError(409, 'EMAIL_ALREADY_VERIFIED', 'auth:errors.emailAlreadyVerified');
    }

    // Get user roles for JWT
    const userWithRoles = await prisma.user.findUnique({
        where: { userId: verificationToken.userId },
        include: {
            userRoles: {
                include: { role: true }
            }
        }
    });

    const roles = userWithRoles?.userRoles?.map(ur => ur.role.roleName) || [];

    // Update user status to Active
    await prisma.$transaction([
        prisma.user.update({
            where: { userId: verificationToken.userId },
            data: { status: 'Active' },
        }),
        prisma.emailVerificationToken.delete({
            where: { token },
        }),
    ]);

    // Generate JWT tokens for auto-login
    const accessToken = jwt.sign(
        { userId: verificationToken.userId, email: verificationToken.user.email, roles },
        JWT_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { userId: verificationToken.userId },
        REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return {
        userId: verificationToken.userId,
        email: verificationToken.user.email,
        fullName: verificationToken.user.fullName,
        avatarUrl: verificationToken.user.avatarUrl,
        roles,
        accessToken,
        refreshToken,
    };
};

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (email: string) => {
    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'users:errors.userNotFound');
    }

    if (user.status === 'Active') {
        throw new AppError(409, 'EMAIL_ALREADY_VERIFIED', 'auth:errors.emailAlreadyVerified');
    }

    if (user.status === 'Banned') {
        throw new AppError(403, 'ACCOUNT_BANNED', 'auth:errors.accountBanned');
    }

    // Create new verification token and send email
    await createVerificationToken(user.userId, user.email, user.fullName);

    return true;
};

/**
 * Check if user needs email verification
 */
export const needsVerification = async (email: string): Promise<boolean> => {
    const user = await prisma.user.findUnique({
        where: { email },
        select: { status: true },
    });

    return user?.status === 'Pending';
};
