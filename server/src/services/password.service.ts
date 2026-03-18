import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { sendPasswordResetEmail } from './email.service';

const TOKEN_EXPIRY_HOURS = 1;

/**
 * Initiate password reset flow
 * Generates token and sends email
 */
export const createPasswordResetToken = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error('Account not registered');
    }

    // Delete existing tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.userId } });

    // Generate 6-digit secure token
    let token = '';
    let isUnique = false;
    while (!isUnique) {
        token = crypto.randomInt(100000, 999999).toString();
        const existingToken = await prisma.passwordResetToken.findFirst({
            where: { token, expiresAt: { gt: new Date() } }
        });
        if (!existingToken) {
            isUnique = true;
        }
    }

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
            console.warn(`[DEV MODE] Failed to send email, but continuing. The OTP for ${email} is ${token}`);
        } else {
            throw error;
        }
    }

    return token;
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
