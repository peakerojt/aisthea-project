
import { Request, Response } from 'express';
import { registerUser, loginUser } from '../services/auth.service';
import { registerSchema, loginSchema } from '../utils/schemas/auth.schema';
import { z, ZodError } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';

export const register = async (req: Request, res: Response) => {
    try {
        const { body } = await registerSchema.parseAsync({ body: req.body });
        // Register user
        const newUser = await registerUser(body);

        // Auto-login: Generate tokens
        // We need to fetch the full user with roles to generate tokens properly, 
        // OR we can rely on what registerUser returns if we update it.
        // However, registerUser currently returns { userId, email, fullName }.
        // We need to loginUser to get tokens easily or duplicate logic.
        // Let's use loginUser style logic or call loginUser if password is available.
        // Since we have the plain password in 'body', we can just call loginUser internally!

        const loginResult = await loginUser({ email: body.email, password: body.password });

        // Security: Set refresh token as httpOnly cookie
        res.cookie('refreshToken', loginResult.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.cookie('accessToken', loginResult.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        // Return user and access token, exclude refresh token from body
        const { refreshToken, ...response } = loginResult;

        // Return 201 for creation, but with login data
        res.status(201).json({ message: 'User registered and logged in successfully', ...response });

    } catch (error: any) {
        if (error instanceof ZodError) {
            res.status(400).json({ error: error.issues });
        } else if (error.message === 'Email already exists') {
            res.status(409).json({ error: error.message });
        } else {
            console.error("Registration error:", error);
            res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
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

        // Return user and access token, exclude refresh token from body
        const { refreshToken, ...response } = result;
        res.status(200).json(response);
    } catch (error: any) {
        if (error instanceof ZodError) {
            res.status(400).json({ error: error.issues });
        } else if (error.message === 'Invalid email or password' || error.message === 'User account is not active') {
            res.status(401).json({ error: error.message });
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
            console.error('Google OAuth callback: No user in request');
            return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?error=auth_failed`);
        }

        // Validate user data
        if (!user.userId || !user.email) {
            console.error('Google OAuth callback: Invalid user data', user);
            return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?error=invalid_user`);
        }

        const JWT_SECRET = process.env.JWT_SECRET;
        const REFRESH_SECRET = process.env.REFRESH_SECRET;

        if (!JWT_SECRET || !REFRESH_SECRET) {
            console.error('Google OAuth callback: Missing JWT secrets');
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


        // Redirect to frontend callback WITHOUT tokens in URL (security improvement)
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        res.redirect(`${clientUrl}/auth/callback?success=true`);
    } catch (error: any) {
        console.error('Google OAuth callback error:', error);
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        res.redirect(`${clientUrl}/auth/callback?error=callback_failed&message=${encodeURIComponent(error.message || 'Unknown error')}`);
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
                        role: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(401).json({
                isAuthenticated: false,
                error: 'User not found'
            });
        }

        const roles = user.userRoles.map(ur => ur.role.roleName);

        res.json({
            isAuthenticated: true,
            user: {
                userId: user.userId,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                roles
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

        console.error('Session verification error:', error);
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
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
};
