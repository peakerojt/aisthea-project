import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { prisma } from '../utils/prisma';
import { upsertUserLogin } from '../services/auth.service';

export const configureGoogleStrategy = () => {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

    // Debug: Log OAuth configuration (hide secret for security)
    console.log('🔐 Google OAuth Configuration:');
    if (GOOGLE_CLIENT_ID) {
        console.log('   Client ID:', `${GOOGLE_CLIENT_ID.substring(0, 20)}...`);
        console.log('   Client ID Length:', GOOGLE_CLIENT_ID.length);
        console.log('   Client ID first 5 chars code:', GOOGLE_CLIENT_ID.substring(0, 5).split('').map(c => c.charCodeAt(0)));
        console.log('   Client ID last 5 chars code:', GOOGLE_CLIENT_ID.substring(GOOGLE_CLIENT_ID.length - 5).split('').map(c => c.charCodeAt(0)));
    } else {
        console.log('   Client ID: NOT SET');
    }
    console.log('   Client Secret:', GOOGLE_CLIENT_SECRET ? `${GOOGLE_CLIENT_SECRET.substring(0, 10)}...` : 'NOT SET');
    console.log('   Callback URL:', GOOGLE_CALLBACK_URL);

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.warn('⚠️  Google OAuth credentials not configured. Google login will not be available.');
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
                                    passwordHash: null, // No password for Google auth
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

                    console.log(`Google OAuth successful for user: ${email}`);
                    return done(null, user);
                } catch (error) {
                    console.error('Google OAuth error:', error);
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
