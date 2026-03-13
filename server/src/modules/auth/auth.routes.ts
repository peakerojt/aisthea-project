import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authRateLimiter } from '../../middlewares/security.middleware';
import {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    resendVerificationSchema,
} from './auth.validator';
import passport from 'passport';

const router = Router();

/** GET /api/auth/csrf-token */
router.get('/csrf-token', authController.csrfToken);

// ─── Public Auth Routes ───────────────────────────────────────────────────────

/** POST /api/auth/register */
router.post('/register', authRateLimiter, validate(registerSchema), authController.register);

/** POST /api/auth/login */
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);

/** POST /api/auth/verify-email */
router.post('/verify-email', authRateLimiter, validate(verifyEmailSchema), authController.verifyEmail);

/** POST /api/auth/resend-verification */
router.post('/resend-verification', authRateLimiter, validate(resendVerificationSchema), authController.resendVerification);

/** POST /api/auth/forgot-password */
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);

/** GET /api/auth/reset-password — validates token from email link & sets cookie */
router.get('/reset-password', authController.passwordResetInit);

/** POST /api/auth/reset-password */
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

/** POST /api/auth/refresh */
router.post('/refresh', authController.refresh);

/** GET /api/auth/session */
router.get('/session', authController.getSession);

/** POST /api/auth/logout */
router.post('/logout', authController.logout);

// ─── Google OAuth ─────────────────────────────────────────────────────────────

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), authController.googleCallback);

export default router;

