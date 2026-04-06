import { Request, Response, NextFunction } from 'express';
import {
    registerUser,
    loginUser,
    persistRefreshToken,
    getStoredRefreshTokenHash,
    revokeStoredRefreshToken,
} from '../../services/auth.service';
import { verifyEmailToken, resendVerificationEmail } from '../../services/verification.service';
import { env } from '../../lib/env';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
    buildResetCookieOptions,
    buildSessionCookieOptions,
    clearCsrfCookie,
    clearResetCookie,
    clearSessionCookies,
} from '../../lib/cookies';
import { setCsrfCookie } from '../../middlewares/security.middleware';
import { AppError } from '../../middlewares/error.middleware';

/**
 * Auth controller — thin wrappers around existing auth service functions.
 * All business logic remains unchanged in auth.service.ts and verification.service.ts.
 */
export const authController = {
    csrfToken: (req: Request, res: Response) => {
        const csrfToken = req.cookies?.csrfToken || setCsrfCookie(res, env.nodeEnv);
        res.json({
            success: true,
            messageKey: 'common:success.ok',
            data: { csrfToken },
        });
    },

    register: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const newUser = await registerUser(req.body);
            res.status(201).json({
                success: true,
                messageKey: 'auth:success.registered',
                data: { requiresVerification: true, email: newUser.email },
            });
        } catch (err: any) {
            next(err);
        }
    },

    login: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await loginUser(req.body);

            const cookieOpts = buildSessionCookieOptions();

            const { refreshToken: _rt, ...user } = result as any;

            // Set cookies server-side
            res.cookie('refreshToken', result.refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
            res.cookie('accessToken', result.accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
            setCsrfCookie(res, env.nodeEnv);

            // Return the same shape as before: { user, accessToken }
            // The client AuthContext destructures `{ user: userData, accessToken }` directly.
            res.json(result.user
                ? { user: result.user, accessToken: result.accessToken }
                : result
            );
        } catch (err: any) {
            next(err);
        }
    },

    verifyEmail: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { code } = req.body;
            const result = await verifyEmailToken(code);

            // Store hashed refresh token for reuse detection
            await persistRefreshToken(result.userId, result.refreshToken);

            const cookieOpts = buildSessionCookieOptions();
            res.cookie('accessToken', result.accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
            res.cookie('refreshToken', result.refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
            setCsrfCookie(res, env.nodeEnv);

            res.json({
                success: true,
                messageKey: 'auth:success.emailVerified',
                data: { userId: result.userId, email: result.email, fullName: result.fullName, avatarUrl: result.avatarUrl, roles: result.roles },
            });
        } catch (err: any) {
            next(err);
        }
    },

    resendVerification: async (req: Request, res: Response, next: NextFunction) => {
        try {
            await resendVerificationEmail(req.body.email);
            res.json({
                success: true,
                messageKey: 'auth:success.verificationEmailSent',
            });
        } catch (err: any) {
            next(err);
        }
    },

    forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { createPasswordResetToken } = await import('../../services/password.service');
            await createPasswordResetToken(req.body.email);
            res.json({
                success: true,
                messageKey: 'auth:success.passwordResetSent',
            });
        } catch (err: any) {
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

            res.cookie('resetToken', token, { ...buildResetCookieOptions(), maxAge: 60 * 60 * 1000 });
            res.redirect(`${clientUrl}/reset-password`);
        } catch (err) {
            next(err);
        }
    },

    resetPassword: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.body.token || req.cookies.resetToken;
            if (!token) {
                return res.status(400).json({
                    success: false,
                    errorCode: 'RESET_TOKEN_REQUIRED',
                    messageKey: 'auth:errors.resetTokenRequired',
                });
            }
            const { resetPassword: resetPasswordService } = await import('../../services/password.service');
            await resetPasswordService(token, req.body.newPassword);
            clearResetCookie(res);
            res.json({
                success: true,
                messageKey: 'auth:success.passwordReset',
            });
        } catch (err: any) {
            if (err instanceof AppError && ['INVALID_TOKEN', 'TOKEN_EXPIRED'].includes(err.errorCode)) {
                clearResetCookie(res);
            }
            next(err);
        }
    },

    refresh: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    errorCode: 'REFRESH_TOKEN_REQUIRED',
                    messageKey: 'auth:errors.refreshTokenRequired',
                });
            }

            const decoded = jwt.verify(refreshToken, env.refreshSecret) as any;
            const user = await prisma.user.findUnique({
                where: { userId: decoded.userId },
                include: { userRoles: { include: { role: true } } },
            });

            if (!user) {
                return res.status(401).json({
                    success: false,
                    errorCode: 'USER_NOT_FOUND',
                    messageKey: 'users:errors.userNotFound',
                });
            }

            // Validate against stored hashed refresh token
            const storedRefreshTokenHash = await getStoredRefreshTokenHash(user.userId);
            if (!storedRefreshTokenHash || !(await bcrypt.compare(refreshToken, storedRefreshTokenHash))) {
                return res.status(401).json({
                    success: false,
                    errorCode: 'REFRESH_TOKEN_REVOKED',
                    messageKey: 'auth:errors.refreshTokenRevoked',
                });
            }

            const roles = user.userRoles.map((ur: any) => ur.role.roleName);
            const newAccessToken = jwt.sign({ userId: user.userId, email: user.email, roles }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });
            const newRefreshToken = jwt.sign({ userId: user.userId }, env.refreshSecret, { expiresIn: env.refreshExpiresIn as any });

            await persistRefreshToken(user.userId, newRefreshToken);

            const cookieOpts = buildSessionCookieOptions();
            res.cookie('accessToken', newAccessToken, {
                ...cookieOpts,
                maxAge: 15 * 60 * 1000,
            });
            res.cookie('refreshToken', newRefreshToken, {
                ...cookieOpts,
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            setCsrfCookie(res, env.nodeEnv);

            res.json({
                success: true,
                data: { accessToken: newAccessToken },
                messageKey: 'auth:success.tokenRefreshed',
            });
        } catch (err) {
            next(err);
        }
    },

    getSession: async (req: Request, res: Response, next: NextFunction) => {
        try {
            const accessToken = req.cookies.accessToken;
            if (!accessToken) {
                return res.status(401).json({
                    success: false,
                    isAuthenticated: false,
                    errorCode: 'AUTH_TOKEN_REQUIRED',
                    messageKey: 'auth:errors.authTokenRequired',
                });
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
                return res.status(401).json({
                    success: false,
                    isAuthenticated: false,
                    errorCode: 'USER_NOT_FOUND',
                    messageKey: 'users:errors.userNotFound',
                });
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
                return res.status(401).json({
                    success: false,
                    isAuthenticated: false,
                    errorCode: 'TOKEN_EXPIRED',
                    messageKey: 'auth:errors.tokenExpired',
                });
            }
            next(err);
        }
    },

    logout: async (req: Request, res: Response) => {
        // Best-effort revoke stored refresh token
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
            try {
                const decoded = jwt.verify(refreshToken, env.refreshSecret) as any;
                await revokeStoredRefreshToken(decoded.userId);
            } catch (error) {
                logger.warn('[authController] logout revoke skipped', { error });
            }
        }

        clearSessionCookies(res);
        clearCsrfCookie(res);
        res.json({
            success: true,
            messageKey: 'auth:success.loggedOut',
        });
    },

    googleCallback: async (req: Request, res: Response) => {
        const user = req.user as any;
        const clientUrl = env.clientUrl;

        if (!user?.userId || !user?.email) {
            logger.error('[authController] Google OAuth: invalid user data', { user });
            return res.redirect(`${clientUrl}/auth/callback?error=auth_failed`);
        }

        const roles = user.userRoles?.map((ur: any) => ur.role.roleName) || [];
        const accessToken = jwt.sign({ userId: user.userId, email: user.email, roles }, env.jwtSecret, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId: user.userId }, env.refreshSecret, { expiresIn: '7d' });

        await persistRefreshToken(user.userId, refreshToken);

        const cookieOpts = buildSessionCookieOptions();
        res.cookie('accessToken', accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
        res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
        setCsrfCookie(res, env.nodeEnv);

        res.redirect(`${clientUrl}/auth/callback`);
    },
};
