import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AuthDivider,
  AuthField,
  AuthFooterLinks,
  AuthOAuthButton,
  AuthPageHeader,
  AuthPasswordField,
  AuthPrimaryButton,
  AuthStatusRail,
} from '@/common/components/auth';
import { AuthLayout } from '@/common/layouts/AuthLayout';
import { useAuth } from '@/common/contexts/AuthContext';
import { useCart } from '@/common/contexts/CartContext';
import { getGuestCart } from '@/common/services/cart.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { getAdminLandingPath, hasAdminShellAccess } from '@/common/utils/adminAccess';
import { LoginFormInput, loginFormSchema } from '@/common/validation/schemas';

export const Login: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'login' });
  const [authError, setAuthError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const { syncWithMerge } = useCart();

  const queryParams = new URLSearchParams(window.location.search);
  const isBanned = queryParams.get('reason') === 'banned';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInput>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const emailRegister = register('email', {
    onChange: () => setAuthError(''),
  });

  const passwordRegister = register('password', {
    onChange: () => setAuthError(''),
  });

  const onSubmit = async (data: LoginFormInput) => {
    try {
      const user = await login(data.email, data.password);

      if (user) {
        const localItems = getGuestCart();

        try {
          await syncWithMerge(localItems);
        } catch {
          // Keep login flow resilient even if cart merge fails.
        }

        if (hasAdminShellAccess(user.roles, user.permissions)) {
          navigate(getAdminLandingPath(user.roles, user.permissions));
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      const err = error as Error & { status?: number; code?: string };
      const message = err.status === 401 || err.code === 'INVALID_CREDENTIALS'
        ? t('errors.invalidCredentials')
        : err.message || t('errors.signInFailed');
      setAuthError(message);
    }
  };

  return (
    <AuthLayout backgroundImage="https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=2000">
      <AuthPageHeader
        eyebrow={t('label')}
        title={t('title')}
        subtitle={
          isBanned ? (
            <div className="rounded-sm border border-red-500/20 bg-[#150708] px-4 py-4 text-left shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-red-400">{t('banned.title')}</p>
              <p className="mt-2 text-sm leading-6 text-red-200/80">{t('banned.description')}</p>
            </div>
          ) : (
            t('subtitle')
          )
        }
        className="mb-10"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <AuthField
          type="email"
          autoComplete="off"
          label={t('form.email')}
          error={errors.email?.message}
          disabled={isLoading}
          placeholder={t('form.emailPlaceholder', { defaultValue: 'name@example.com' })}
          {...emailRegister}
        />

        <AuthPasswordField
          autoComplete="off"
          label={t('form.password')}
          error={errors.password?.message}
          disabled={isLoading}
          placeholder="••••••••"
          {...passwordRegister}
        />

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="ui-stable-click rounded-sm text-xs font-medium uppercase tracking-[0.12em] text-zinc-400 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            {t('actions.forgotPassword')}
          </button>
        </div>

        <div className="space-y-3 pt-1">
          <AuthStatusRail message={authError} tone="error" reserveSpace compact />

          <AuthPrimaryButton
            type="submit"
            loading={isLoading}
            label={t('actions.signIn')}
            loadingLabel={t('actions.signingIn')}
          />

          <AuthDivider label={t('divider.or')} className="pt-1" />

          <AuthOAuthButton
            type="button"
            onClick={() => (window.location.href = `${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}/api/auth/google`)}
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            }
            label={t('actions.google')}
          />
        </div>
      </form>

      <AuthFooterLinks className="mt-10 text-center">
        <p>
          {t('footer.newHere')}{' '}
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="ui-stable-click ml-1 rounded-sm font-bold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            {t('footer.createAccount')}
          </button>
        </p>
      </AuthFooterLinks>

      <div className="mt-8 border-t border-white/6 pt-8 text-center text-xs text-zinc-600">
        <span>{t('footer.privacy')}</span>
      </div>
    </AuthLayout>
  );
};
