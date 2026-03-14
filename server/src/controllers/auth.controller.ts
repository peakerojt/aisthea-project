
import { Request, Response } from 'express';
import { registerUser, loginUser } from '../services/auth.service';
import { registerSchema, loginSchema } from '../utils/schemas/auth.schema';
import { z, ZodError } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { verifyEmailToken, resendVerificationEmail } from '../services/verification.service';
import { logger } from '../lib/logger';

export const register = async (req: Request, res: Response) => {
    try {
        const { body } = await registerSchema.parseAsync({ body: req.body });

        // Register user (status: Pending, sends verification email)
        const newUser = await registerUser(body);

        // Return success message - user needs to verify email before login
        res.status(201).json({
            message: 'Registration successful! Please check your email to verify your account.',
            requiresVerification: true,
            email: newUser.email,
        });

    } catch (error: unknown) {
        const e = error as { message?: string; issues?: unknown[] };
        if (error instanceof ZodError) {
            res.status(400).json({ error: error.issues });
        } else if (e.message === 'Email already exists') {
            res.status(409).json({ error: e.message });
        } else if (e.message === 'Failed to send verification email') {
            res.status(500).json({ error: 'Registration successful but failed to send verification email. Please try resending.' });
        } else {
            logger.error('[authController] register failed', { error });
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};

// Verify email with 6-digit code
export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { code, email } = req.body;



        if (!code || typeof code !== 'string') {
            return res.status(400).json({ error: 'Verification code is required' });
        }

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Verify the code (token)
        const result = await verifyEmailToken(code);

        // Set auth cookies for auto-login
        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: '/'
        });

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/'
        });

        res.json({
            success: true,
            message: 'Email verified successfully!',
            user: {
                userId: result.userId,
                email: result.email,
                fullName: result.fullName,
                avatarUrl: result.avatarUrl,
                roles: result.roles,
            }
        });
    } catch (error: any) {
        logger.error('[authController] verifyEmail failed', { error });

        if (error.message === 'Invalid verification token') {
            return res.status(400).json({ error: 'Invalid verification code' });
        }
        if (error.message.includes('expired')) {
            return res.status(400).json({ error: error.message, code: 'TOKEN_EXPIRED' });
        }
        if (error.message === 'Email is already verified') {
            return res.status(400).json({ error: error.message, code: 'ALREADY_VERIFIED' });
        }

        res.status(500).json({ error: 'Failed to verify email' });
    }
};

// Resend verification email
export const resendVerification = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Email is required' });
        }

        await resendVerificationEmail(email);

        res.json({
            success: true,
            message: 'Verification email has been sent. Please check your inbox.',
        });
    } catch (error: any) {
        logger.error('[authController] resendVerification failed', { error });

        if (error.message === 'No account found with this email') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Email is already verified') {
            return res.status(400).json({ error: error.message, code: 'ALREADY_VERIFIED' });
        }
        if (error.message === 'This account has been banned') {
            return res.status(403).json({ error: error.message });
        }

        res.status(500).json({ error: 'Failed to resend verification email' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { body } = await loginSchema.parseAsync({ body: req.body });
        const result = await loginUser(body);

        // Security: Set refresh token as httpOnly cookie
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Also set access token as HTTP-only cookie for cookie-based auth
        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: '/'
        });

        // Return user and access token, exclude refresh token from body
        const { refreshToken, ...response } = result;
        res.status(200).json(response);
    } catch (error: any) {
        if (error instanceof ZodError) {
            res.status(400).json({ error: error.issues });
        } else if (error.message === 'Invalid email or password') {
            res.status(401).json({ error: error.message });
        } else if (error.message === 'Please verify your email before logging in') {
            res.status(403).json({ error: error.message, code: 'EMAIL_NOT_VERIFIED' });
        } else if (error.message === 'Your account has been banned') {
            res.status(403).json({ error: error.message, code: 'ACCOUNT_BANNED' });
        } else {
            res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    }
};

// Google OAuth callback handler
export const googleCallback = (req: Request, res: Response) => {
    try {
        // After successful Google auth, user is in req.user (set by passport)
        const user = req.user as any;

        if (!user) {
            logger.error('[authController] Google OAuth: no user in request');
            return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?error=auth_failed`);
        }

        // Validate user data
        if (!user.userId || !user.email) {
            logger.error('[authController] Google OAuth: invalid user data', { user });
            return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?error=invalid_user`);
        }

        const JWT_SECRET = process.env.JWT_SECRET;
        const REFRESH_SECRET = process.env.REFRESH_SECRET;

        if (!JWT_SECRET || !REFRESH_SECRET) {
            logger.error('[authController] Google OAuth: missing JWT secrets');
            return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?error=server_error`);
        }

        const roles = user.userRoles?.map((ur: any) => ur.role.roleName) || [];

        // Generate JWT tokens
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

        // Set tokens as HTTP-only cookies (SECURE - not exposed in URL)
        const cookieMaxAge = parseInt(process.env.COOKIE_MAX_AGE || '604800000'); // 7 days default

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: '/'
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: cookieMaxAge,
            path: '/'
        });

        // Log successful OAuth (without sensitive data)


        // Redirect to frontend callback WITHOUT any parameters (clean URL)
        // Auth state is verified via session cookie
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        res.redirect(`${clientUrl}/auth/callback`);
    } catch (error: any) {
        logger.error('[authController] googleCallback failed', { error });
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        // Even on error, redirect to clean URL - let frontend check session
        res.redirect(`${clientUrl}/auth/callback`);
    }
};

// Get current session from cookie
export const getSession = async (req: Request, res: Response) => {
    try {
        const accessToken = req.cookies.accessToken;

        if (!accessToken) {
            return res.status(401).json({
                isAuthenticated: false,
                error: 'No authentication token found'
            });
        }

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Verify and decode token
        const decoded = jwt.verify(accessToken, JWT_SECRET) as any;

        // Fetch fresh user data from database
        const user = await prisma.user.findUnique({
            where: { userId: decoded.userId },
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

        if (!user) {
            return res.status(401).json({
                isAuthenticated: false,
                error: 'User not found'
            });
        }

        const roles = user.userRoles.map(ur => ur.role.roleName);
        const permissions = [
            ...new Set(
                user.userRoles.flatMap((ur) =>
                    ur.role.rolePermissions.map((rp) => rp.permission.code)
                )
            ),
        ];

        res.json({
            isAuthenticated: true,
            user: {
                userId: user.userId,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                roles,
                permissions,
            }
        });
    } catch (error: any) {
        // Token expired or invalid
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                isAuthenticated: false,
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                isAuthenticated: false,
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }

        logger.error('[authController] verifySession failed', { error });
        res.status(500).json({
            isAuthenticated: false,
            error: 'Internal server error'
        });
    }
};

// Logout - clear authentication cookies
export const logout = (req: Request, res: Response) => {
    try {
        // Clear both access and refresh tokens
        res.clearCookie('accessToken', { path: '/' });
        res.clearCookie('refreshToken', { path: '/' });

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error: any) {
        logger.error('[authController] logout failed', { error });
        res.status(500).json({ error: 'Failed to logout' });
    }
}


// Password Reset Flow
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Email is required' });
        }

        const { createPasswordResetToken } = await import('../services/password.service');
        await createPasswordResetToken(email);

        res.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.'
        });
    } catch (error: any) {
        logger.error('[authController] forgotPassword failed', { error });
        res.status(500).json({ error: 'Failed to process forgot password request' });
    }
};

// Password reset initialization - validates token from email link and sets cookie
export const passwordResetInit = async (req: Request, res: Response) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            // Redirect to frontend with error
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            return res.redirect(`${clientUrl}/reset-password?error=invalid_link`);
        }

        // Validate token exists in database
        const { validatePasswordResetToken } = await import('../services/password.service');
        const isValid = await validatePasswordResetToken(token);

        if (!isValid) {
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
            return res.redirect(`${clientUrl}/reset-password?error=expired_token`);
        }

        // Set token in HTTP-only cookie (secure, not visible in URL)
        res.cookie('resetToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000, // 1 hour
            path: '/'
        });

        // Redirect to clean URL (no token visible)
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        res.redirect(`${clientUrl}/reset-password`);
    } catch (error: any) {
        logger.error('[authController] resetPasswordInit failed', { error });
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        res.redirect(`${clientUrl}/reset-password?error=server_error`);
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        // Check for token in cookie first (new secure flow), then fallback to body (backward compatibility)
        const token = req.cookies.resetToken || req.body.token;
        const { newPassword } = req.body;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Reset token is required', code: 'MISSING_TOKEN' });
        }

        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        const { resetPassword: resetPasswordService } = await import('../services/password.service');
        await resetPasswordService(token, newPassword);

        // Clear the reset token cookie after successful reset
        res.clearCookie('resetToken', { path: '/' });

        res.json({
            success: true,
            message: 'Password has been reset successfully. You can now login with your new password.'
        });
    } catch (error: any) {
        logger.error('[authController] resetPassword failed', { error });

        if (error.message === 'Invalid or expired password reset token' || error.message === 'Password reset token has expired') {
            // Clear invalid token cookie
            res.clearCookie('resetToken', { path: '/' });
            return res.status(400).json({ error: error.message, code: 'INVALID_TOKEN' });
        }

        res.status(500).json({ error: 'Failed to reset password' });
    }
};
