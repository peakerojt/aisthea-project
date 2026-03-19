import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { sendPasswordResetEmail } from './email.service';

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

    throw new Error('Unable to generate a unique password reset code');
};

/**
 * Initiate password reset flow
 * Generates token and sends email
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
        throw new Error('This account uses Google Login. Please sign in with Google.');
    }

    // Delete existing tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.userId } });

    // Generate a short-lived OTP that fits the current client flow.
    const token = await generateResetCode();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
        data: {
            userId: user.userId,
            token,
            expiresAt
        }
    });

    // Send email
    try {
        await sendPasswordResetEmail(email, token, user.fullName);
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`[DEV MODE] Failed to send password reset email to ${email}. Reset code: ${token}`);
            return true;
        }

        throw error;
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
        throw new Error('Invalid or expired password reset token');
    }

    if (resetToken.expiresAt < new Date()) {
        await prisma.passwordResetToken.delete({ where: { token } });
        throw new Error('Password reset token has expired');
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
