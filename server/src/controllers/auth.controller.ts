import { authController } from '../modules/auth/auth.controller';

// Legacy compatibility surface. The runtime routes use the module controller,
// and these named exports stay aligned for any remaining imports.
export const register = authController.register;
export const verifyEmail = authController.verifyEmail;
export const resendVerification = authController.resendVerification;
export const login = authController.login;
export const googleCallback = authController.googleCallback;
export const getSession = authController.getSession;
export const logout = authController.logout;
export const forgotPassword = authController.forgotPassword;
export const passwordResetInit = authController.passwordResetInit;
export const resetPassword = authController.resetPassword;
