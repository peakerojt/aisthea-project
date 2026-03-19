import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/common/layouts/AuthLayout';
import { useAuth } from '@/common/contexts/AuthContext';
import { useCart } from '@/common/contexts/CartContext';
import { getGuestCart } from '@/common/services/cart.service';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { LoginFormInput, loginFormSchema } from '@/common/validation/schemas';

export const Login: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'login' });
  const [showPassword, setShowPassword] = useState(false);
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
      setAuthError('');
      const user = await login(data.email, data.password);

      if (user) {
        const localItems = getGuestCart();

        try {
          await syncWithMerge(localItems);
        } catch {
          // Keep login flow resilient even if cart merge fails.
        }

        if (user.roles.includes('Admin')) {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      const err = error as Error & { status?: number; code?: string };
      const message = err.status === 401 || err.message === 'Invalid email or password'
        ? t('errors.invalidCredentials')
        : err.message || t('errors.signInFailed');
      setAuthError(message);
    }
  };

  return (
    <AuthLayout backgroundImage="https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=2000">
      <div className="mb-12">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">{t('label')}</p>
        <h1 className="mb-2 text-4xl font-black uppercase tracking-tighter text-white md:text-5xl">
          {t('title')}
        </h1>

        {isBanned ? (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-sm font-bold text-red-500 uppercase tracking-wide">{t('banned.title')}</p>
            <p className="text-xs text-red-400 mt-1">{t('banned.description')}</p>
          </div>
        ) : (
          <p className="max-w-xl text-gray-400">
            {t('subtitle')}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="relative group">
          <input
            type="email"
            autoComplete="off"
            {...emailRegister}
            className={`block py-4 px-0 w-full text-base text-white bg-transparent border-0 border-b appearance-none focus:outline-none focus:ring-0 peer transition-colors ${
              errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-white'
            }`}
            placeholder=" "
            disabled={isLoading}
          />
          <label
            className={`pointer-events-none absolute top-3 z-0 origin-[0] -translate-y-6 scale-75 transform text-sm font-medium uppercase tracking-wide duration-300 peer-focus:left-0 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-6 peer-focus:scale-75 ${
              errors.email ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-500 peer-focus:text-white'
            }`}
          >
            {t('form.email')}
          </label>
          {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email.message}</span>}
        </div>

        <div className="relative group mb-2">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="off"
            {...passwordRegister}
            className={`block py-4 px-0 w-full text-base text-white bg-transparent border-0 border-b appearance-none focus:outline-none focus:ring-0 peer transition-colors pr-10 ${
              errors.password ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-white'
            }`}
            placeholder=" "
            disabled={isLoading}
          />
          <label
            className={`pointer-events-none absolute top-3 z-0 origin-[0] -translate-y-6 scale-75 transform text-sm font-medium uppercase tracking-wide duration-300 peer-focus:left-0 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-6 peer-focus:scale-75 ${
              errors.password ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-500 peer-focus:text-white'
            }`}
          >
            {t('form.password')}
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-0 top-3 text-gray-500 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          {errors.password && <span className="text-xs text-red-500 mt-1">{errors.password.message}</span>}
        </div>

        {authError && (
          <div className="rounded-sm border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {authError}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-xs font-medium text-gray-400 transition-colors hover:text-white"
          >
            {t('actions.forgotPassword')}
          </button>
        </div>

        <div className="flex flex-col gap-4 mt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary py-4 text-sm font-bold uppercase tracking-[0.15em] text-white shadow-lg shadow-primary/20 transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                {t('actions.signingIn')}
              </>
            ) : (
              t('actions.signIn')
            )}
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0a0a0a] px-4 font-bold tracking-wider text-gray-500">{t('divider.or')}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => (window.location.href = `${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}/api/auth/google`)}
            className="group flex w-full cursor-pointer items-center justify-center gap-3 rounded-sm border border-gray-200 bg-white py-4 text-sm font-bold uppercase tracking-[0.15em] text-gray-900 transition-all hover:bg-gray-100"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {t('actions.google')}
          </button>
        </div>
      </form>

      <div className="mt-12 text-center">
        <p className="text-gray-500 text-sm">
          {t('footer.newHere')}{' '}
          <button onClick={() => navigate('/signup')} className="text-white font-bold hover:underline underline-offset-4 ml-1">
            {t('footer.createAccount')}
          </button>
        </p>
      </div>

      <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center text-xs text-gray-600">
        <button onClick={() => navigate('/admin')} className="hover:text-gray-400">
          {t('footer.adminLogin')}
        </button>
        <span>{t('footer.privacy')}</span>
      </div>
    </AuthLayout>
  );
};
