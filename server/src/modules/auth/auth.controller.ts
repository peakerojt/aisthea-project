import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser } from '../../services/auth.service';
import { verifyEmailToken, resendVerificationEmail } from '../../services/verification.service';
import { env } from '../../lib/env';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken';

/**
 * Auth controller — thin wrappers around existing auth service functions.
 * All business logic remains unchanged in auth.service.ts and verification.service.ts.
 */
export const authController = {
    register: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const newUser = await registerUser(req.body);
            res.status(201).json({
                success: true,
                message: 'Registration successful! Please check your email to verify your account.',
                data: { requiresVerification: true, email: newUser.email },
            });
        } catch (err: any) {
            if (err.message === 'Email already exists') {
                return res.status(409).json({ success: false, errorCode: 'EMAIL_EXISTS', message: err.message });
            }
            next(err);
        }
    },

    login: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await loginUser(req.body);

            const cookieOpts = {
                httpOnly: true,
                secure: env.nodeEnv === 'production',
                sameSite: 'lax' as const,
                path: '/',
            };

            const { refreshToken: _rt, ...user } = result as any;

            // Set cookies server-side
            res.cookie('refreshToken', result.refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
            res.cookie('accessToken', result.accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });

            // Return the same shape as before: { user, accessToken }
            // The client AuthContext destructures `{ user: userData, accessToken }` directly.
            res.json(result.user
                ? { user: result.user, accessToken: result.accessToken }
                : result
            );
        } catch (err: any) {
            if (err.message === 'Invalid email or password') {
                return res.status(401).json({ success: false, errorCode: 'INVALID_CREDENTIALS', message: err.message });
            }
            if (err.message === 'Please verify your email before logging in') {
                return res.status(403).json({ success: false, errorCode: 'EMAIL_NOT_VERIFIED', message: err.message });
            }
            if (err.message === 'Your account has been banned') {
                return res.status(403).json({ success: false, errorCode: 'ACCOUNT_BANNED', message: err.message });
            }
            next(err);
        }
    },

    verifyEmail: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { code } = req.body;
            const result = await verifyEmailToken(code);

            const cookieOpts = { httpOnly: true, secure: env.nodeEnv === 'production', sameSite: 'lax' as const, path: '/' };
            res.cookie('accessToken', result.accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
            res.cookie('refreshToken', result.refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

            res.json({
                success: true,
                message: 'Email verified successfully!',
                data: { userId: result.userId, email: result.email, fullName: result.fullName, avatarUrl: result.avatarUrl, roles: result.roles },
            });
        } catch (err: any) {
            if (err.message === 'Invalid verification token') {
                return res.status(400).json({ success: false, errorCode: 'INVALID_TOKEN', message: err.message });
            }
            if (err.message?.includes('expired')) {
                return res.status(400).json({ success: false, errorCode: 'TOKEN_EXPIRED', message: err.message });
            }
            next(err);
        }
    },

    resendVerification: async (req: Request, res: Response, next: NextFunction) => {
        try {
            await resendVerificationEmail(req.body.email);
            res.json({ success: true, message: 'Verification email sent. Please check your inbox.' });
        } catch (err: any) {
            if (err.message === 'No account found with this email') {
                return res.status(404).json({ success: false, errorCode: 'USER_NOT_FOUND', message: err.message });
            }
            next(err);
        }
    },

    forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { createPasswordResetToken } = await import('../../services/password.service');
            await createPasswordResetToken(req.body.email);
            res.json({ success: true, message: 'If an account exists with this email, a password reset link has been sent.' });
        } catch (err) {
            next(err);
        }
    },

    passwordResetInit: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token } = req.query as { token?: string };
            const clientUrl = env.clientUrl;
            if (!token) return res.redirect(`${clientUrl}/reset-password?error=invalid_link`);

            const { validatePasswordResetToken } = await import('../../services/password.service');
            const isValid = await validatePasswordResetToken(token);
            if (!isValid) return res.redirect(`${clientUrl}/reset-password?error=expired_token`);

            res.cookie('resetToken', token, {
                httpOnly: true,
                secure: env.nodeEnv === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 1000,
                path: '/',
            });
            res.redirect(`${clientUrl}/reset-password`);
        } catch (err) {
            next(err);
        }
    },

    resetPassword: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.cookies.resetToken || req.body.token;
            if (!token) {
                return res.status(400).json({ success: false, errorCode: 'MISSING_TOKEN', message: 'Reset token is required.' });
            }
            const { resetPassword: resetPasswordService } = await import('../../services/password.service');
            await resetPasswordService(token, req.body.newPassword);
            res.clearCookie('resetToken', { path: '/' });
            res.json({ success: true, message: 'Password reset successfully. You may now log in.' });
        } catch (err: any) {
            if (err.message?.includes('expired') || err.message?.includes('Invalid')) {
                res.clearCookie('resetToken', { path: '/' });
                return res.status(400).json({ success: false, errorCode: 'INVALID_TOKEN', message: err.message });
            }
            next(err);
        }
    },

    refresh: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(401).json({ success: false, errorCode: 'MISSING_TOKEN', message: 'No refresh token.' });
            }

            const decoded = jwt.verify(refreshToken, env.refreshSecret) as any;
            const user = await prisma.user.findUnique({
                where: { userId: decoded.userId },
                include: { userRoles: { include: { role: true } } },
            });

            if (!user) {
                return res.status(401).json({ success: false, errorCode: 'USER_NOT_FOUND', message: 'User not found.' });
            }

            const roles = user.userRoles.map((ur: any) => ur.role.roleName);
            const newAccessToken = jwt.sign({ userId: user.userId, email: user.email, roles }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });

            res.cookie('accessToken', newAccessToken, {
                httpOnly: true,
                secure: env.nodeEnv === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60 * 1000,
                path: '/',
            });

            res.json({ success: true, data: { accessToken: newAccessToken }, message: 'Token refreshed.' });
        } catch (err) {
            next(err);
        }
    },

    getSession: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const accessToken = req.cookies.accessToken;
            if (!accessToken) {
                return res.status(401).json({ success: false, isAuthenticated: false, errorCode: 'NO_TOKEN', message: 'No authentication token.' });
            }

            const decoded = jwt.verify(accessToken, env.jwtSecret) as any;
            const user = await prisma.user.findUnique({
                where: { userId: decoded.userId },
                include: {
                    userRoles: {
                        include: { role: { include: { rolePermissions: { include: { permission: { select: { code: true } } } } } } },
                    },
                },
            });

            if (!user) {
                return res.status(401).json({ success: false, isAuthenticated: false, errorCode: 'USER_NOT_FOUND', message: 'User not found.' });
            }

            const roles = user.userRoles.map((ur: any) => ur.role.roleName);
            const permissions = [...new Set(user.userRoles.flatMap((ur: any) => ur.role.rolePermissions.map((rp: any) => rp.permission.code)))];

            // Return the same shape the client `authService.getSession()` expects:
            // { isAuthenticated, user: { userId, email, fullName, avatarUrl, roles, permissions } }
            res.json({
                isAuthenticated: true,
                user: { userId: user.userId, email: user.email, fullName: user.fullName, avatarUrl: user.avatarUrl, roles, permissions },
            });
        } catch (err: any) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ success: false, isAuthenticated: false, errorCode: 'TOKEN_EXPIRED', message: 'Token expired.' });
            }
            next(err);
        }
    },

    logout: (_req: Request, res: Response) => {
        res.clearCookie('accessToken', { path: '/' });
        res.clearCookie('refreshToken', { path: '/' });
        res.json({ success: true, message: 'Logged out successfully.' });
    },

    googleCallback: (req: Request, res: Response) => {
        const user = req.user as any;
        const clientUrl = env.clientUrl;

        if (!user?.userId || !user?.email) {
            logger.error('[authController] Google OAuth: invalid user data', { user });
            return res.redirect(`${clientUrl}/auth/callback?error=auth_failed`);
        }

        const roles = user.userRoles?.map((ur: any) => ur.role.roleName) || [];
        const accessToken = jwt.sign({ userId: user.userId, email: user.email, roles }, env.jwtSecret, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId: user.userId }, env.refreshSecret, { expiresIn: '7d' });

        const cookieOpts = { httpOnly: true, secure: env.nodeEnv === 'production', sameSite: 'lax' as const, path: '/' };
        res.cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

        res.redirect(`${clientUrl}/auth/callback`);
    },
};
