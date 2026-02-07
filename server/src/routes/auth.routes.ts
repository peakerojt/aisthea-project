
import { Router } from 'express';
import { register, login, googleCallback, getSession, logout, verifyEmail, resendVerification, passwordResetInit } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import passport from 'passport';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// Email verification routes
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

// Password reset routes
import { forgotPassword, resetPassword } from '../controllers/auth.controller';
router.post('/forgot-password', forgotPassword);
router.get('/reset-password-init', passwordResetInit); // New: validates token and sets cookie
router.post('/reset-password', resetPassword);

// Session management
router.get('/session', getSession);
router.post('/logout', logout);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Debug endpoint to check OAuth config
router.get('/google/debug', (req, res) => {
    res.json({
        clientId: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'NOT SET',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'SET (hidden)' : 'NOT SET',
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
        isConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    });
});

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/callback?error=auth_failed', session: false }),
    googleCallback
);

// Example protected route
router.get('/me', authenticateToken, (req: any, res) => {
    res.json({ message: 'This is a protected route', user: req.user });
});

export default router;
