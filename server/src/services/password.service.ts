import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { AppError } from '../middlewares/error.middleware';
import { notificationService } from '../modules/notifications/notification.service';
import { serializeMailError } from '../modules/notifications/email.providers';
import { logger } from '../lib/logger';

const TOKEN_EXPIRY_HOURS = 1;
const RESET_CODE_MIN = 100000;
const RESET_CODE_MAX = 999999;
const RESET_CODE_ATTEMPTS = 10;

const generateResetCode = async () => {
    for (let attempt = 0; attempt < RESET_CODE_ATTEMPTS; attempt += 1) {
        const token = crypto.randomInt(RESET_CODE_MIN, RESET_CODE_MAX + 1).toString();
        const existingToken = await prisma.passwordResetToken.findFirst({
            where: {
                token,
                expiresAt: { gt: new Date() },
            },
        });

        if (!existingToken) {
            return token;
        }
    }

    throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'common:errors.internalServer');
};

/**
 * Initiate password reset flow.
 * Generates token and enqueues email delivery without blocking on provider IO.
 */
export const createPasswordResetToken = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        // Return true to avoid enumerating emails
        return true;
    }

    // Check if google user (no password)
    if (!user.passwordHash && user.googleId) {
        // Optionally send an email saying "You sign in with Google"
        // For now, we'll throw an error or just return true.
        // Let's throw specific error if it's safe, or handle UI side.
        // Ideally we should send an email saying "You use Google login".
        throw new AppError(400, 'GOOGLE_LOGIN_ONLY', 'auth:errors.googleLoginOnly');
    }

    const token = await generateResetCode();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    try {
        await prisma.$transaction(async (tx) => {
            await tx.passwordResetToken.deleteMany({ where: { userId: user.userId } });

            await tx.passwordResetToken.create({
                data: {
                    userId: user.userId,
                    token,
                    expiresAt
                }
            });

            await notificationService.enqueuePasswordResetEmail(
                {
                    userId: user.userId,
                    email,
                    fullName: user.fullName,
                    code: token,
                },
                tx,
            );
        });
    } catch (error) {
        logger.error('[passwordService] Failed to enqueue password reset email', {
            enqueueError: serializeMailError(error),
            userId: user.userId,
            email,
        });
        throw new AppError(503, 'EMAIL_ENQUEUE_FAILED', 'auth:errors.passwordResetEmailFailed');
    }

    return true;
};

/**
 * Validate password reset token
 * Returns true if valid, false if expired or invalid
 */
export const validatePasswordResetToken = async (token: string): Promise<boolean> => {
    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token }
    });

    if (!resetToken) {
        return false;
    }

    if (resetToken.expiresAt < new Date()) {
        // Clean up expired token
        await prisma.passwordResetToken.delete({ where: { token } });
        return false;
    }

    return true;
};

/**
 * Reset password using token
 */
export const resetPassword = async (token: string, newPassword: string) => {
    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true }
    });

    if (!resetToken) {
        throw new AppError(400, 'INVALID_TOKEN', 'auth:errors.invalidToken');
    }

    if (resetToken.expiresAt < new Date()) {
        await prisma.passwordResetToken.delete({ where: { token } });
        throw new AppError(400, 'TOKEN_EXPIRED', 'auth:errors.tokenExpired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
        prisma.user.update({
            where: { userId: resetToken.userId },
            data: { passwordHash }
        }),
        prisma.passwordResetToken.delete({ where: { token } })
    ]);

    return true;
};
