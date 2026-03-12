import React from 'react';

const Login = React.lazy(() => import('@/common/pages/Login').then((m) => ({ default: m.Login })));
const Signup = React.lazy(() => import('@/common/pages/Signup').then((m) => ({ default: m.Signup })));
const OAuthCallback = React.lazy(() => import('@/common/pages/OAuthCallback').then((m) => ({ default: m.OAuthCallback })));
const EmailVerification = React.lazy(() => import('@/common/pages/EmailVerification').then((m) => ({ default: m.EmailVerification })));
const ForgotPasswordPage = React.lazy(() => import('@/common/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = React.lazy(() => import('@/common/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));

export const authRoutes = [
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/auth/callback', element: <OAuthCallback /> },
  { path: '/email-verification', element: <EmailVerification /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
];
