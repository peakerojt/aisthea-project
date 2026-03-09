import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { prisma } from '../utils/prisma';
import { upsertUserLogin } from '../services/auth.service';
import { logger } from '../lib/logger';

export const configureGoogleStrategy = () => {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';



    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        logger.warn('Google OAuth credentials not configured. Google login will not be available.');
        return;
    }

    passport.use(
        new GoogleStrategy(
            {
                clientID: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
                callbackURL: GOOGLE_CALLBACK_URL,
                scope: ['profile', 'email'],
            },
            async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
                try {
                    const email = profile.emails?.[0]?.value;
                    const fullName = profile.displayName || 'Google User';
                    const googleId = profile.id;
                    const avatarUrl = profile.photos?.[0]?.value || null;

                    if (!email) {
                        return done(new Error('No email found in Google profile'), undefined);
                    }

                    // Check if user exists by email
                    let user = await prisma.user.findUnique({
                        where: { email },
                        include: {
                            userRoles: {
                                include: {
                                    role: true
                                }
                            }
                        }
                    });

                    // User exists - link Google account if not already linked
                    if (user) {
                        // Update user with Google ID and avatar if not set
                        if (!user.googleId || !user.avatarUrl) {
                            user = await prisma.user.update({
                                where: { userId: user.userId },
                                data: {
                                    googleId: user.googleId || googleId,
                                    avatarUrl: user.avatarUrl || avatarUrl,
                                },
                                include: { userRoles: { include: { role: true } } }
                            });
                        }
                    } else {
                        // Create new user with Google auth
                        const result = await prisma.$transaction(async (tx) => {
                            const newUser = await tx.user.create({
                                data: {
                                    email,
                                    fullName,
                                    googleId,
                                    avatarUrl,
                                    passwordHash: null,
                                    status: 'Active',
                                },
                                include: {
                                    userRoles: {
                                        include: {
                                            role: true
                                        }
                                    }
                                }
                            });

                            // Assign default Customer role
                            let role = await tx.role.findUnique({
                                where: { roleName: 'Customer' },
                            });

                            if (!role) {
                                role = await tx.role.create({
                                    data: { roleName: 'Customer' },
                                });
                            }

                            await tx.userRole.create({
                                data: {
                                    userId: newUser.userId,
                                    roleId: role.roleId,
                                },
                            });

                            // Fetch user with roles
                            return await tx.user.findUnique({
                                where: { userId: newUser.userId },
                                include: {
                                    userRoles: {
                                        include: {
                                            role: true
                                        }
                                    }
                                }
                            });
                        });

                        user = result;
                    }

                    if (!user) {
                        return done(new Error('Failed to create or retrieve user'), undefined);
                    }

                    // Store/Update OAuth tokens in UserLogin table
                    await upsertUserLogin(
                        user.userId,
                        'Google',
                        googleId,
                        {
                            accessToken,
                            refreshToken,
                            expiresIn: 3600, // Google tokens typically expire in 1 hour
                        },
                        email
                    );

                    logger.info('Google OAuth successful', { email });
                    return done(null, user);
                } catch (error) {
                    logger.error('Google OAuth error', { error });
                    return done(error as Error, undefined);
                }
            }
        )
    );

    // Serialize user for session
    passport.serializeUser((user: any, done) => {
        done(null, user.userId);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id: number, done) => {
        try {
            const user = await prisma.user.findUnique({
                where: { userId: id },
                include: {
                    userRoles: {
                        include: {
                            role: true
                        }
                    }
                }
            });
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });
};
