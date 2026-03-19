import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { sendVerificationEmail } from './email.service';
import { logger } from '../lib/logger';

const TOKEN_EXPIRY_HOURS = 24;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret';

const serializeVerificationError = (error: unknown) => {
    if (error instanceof Error) {
        const detailedError = error as Error & {
            code?: string;
            command?: string;
            response?: string;
            responseCode?: number;
        };

        return {
            name: detailedError.name,
            message: detailedError.message,
            code: detailedError.code,
            command: detailedError.command,
            responseCode: detailedError.responseCode,
            response: detailedError.response,
            stack: detailedError.stack,
        };
    }

    return { value: error };
};

/**
 * Generate a 6-digit verification code
 */
const generateVerificationCode = (): string => {
    // Generate 6-digit code (100000-999999)
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Create a verification token for a user and send verification email
 */
export const createVerificationToken = async (userId: number, email: string, fullName: string) => {
    // Delete any existing tokens for this user
    await prisma.emailVerificationToken.deleteMany({
        where: { userId },
    });

    // Generate new 6-digit verification code
    const token = generateVerificationCode();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Save token to database FIRST
    await prisma.emailVerificationToken.create({
        data: {
            userId,
            token,
            expiresAt,
        },
    });

    // Send email asynchronously (don't await)
    // This prevents the UI from blocking while SMTP connects
    sendVerificationEmail(email, token, fullName).catch((error) => {
        logger.error('[verificationService] Failed to send verification email (async)', {
            verificationError: serializeVerificationError(error),
            userId,
            email,
        });
    });

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
        throw new Error('Invalid verification token');
    }

    // Check if token has expired
    if (new Date() > verificationToken.expiresAt) {
        // Delete expired token
        await prisma.emailVerificationToken.delete({
            where: { token },
        });
        throw new Error('Verification token has expired. Please request a new one.');
    }

    // Check if user is already verified
    if (verificationToken.user.status === 'Active') {
        // Delete the token since user is already verified
        await prisma.emailVerificationToken.delete({
            where: { token },
        });
        throw new Error('Email is already verified');
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
        throw new Error('No account found with this email');
    }

    if (user.status === 'Active') {
        throw new Error('Email is already verified');
    }

    if (user.status === 'Banned') {
        throw new Error('This account has been banned');
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
