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
import { authService } from '@/common/services/auth.service';
import { useForm, useWatch, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { passwordRequirements, calculatePasswordStrength } from '@/common/utils/passwordValidation';
import { useTranslation } from 'react-i18next';
import { SignupFormInput, signupFormSchema } from '@/common/validation/schemas';
import type { input } from 'zod';

type SignupFormValues = input<typeof signupFormSchema>;

const ValidationItem = React.memo(({ met, text }: { met: boolean; text: string }) => (
  <div className={`flex items-center gap-2 text-[11px] transition-colors ${met ? 'text-emerald-300' : 'text-zinc-500'}`}>
    <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${met ? 'border-emerald-500 bg-emerald-500/20' : 'border-zinc-700'}`}>
      {met && <span className="text-[8px]">✓</span>}
    </span>
    {text}
  </div>
));

const PasswordGuidancePanel = React.memo(
  ({
    control,
    t,
  }: {
    control: Control<SignupFormValues>;
    t: (key: string, options?: any) => string;
  }) => {
    const passwordValue = useWatch({
      control,
      name: 'password',
      defaultValue: '',
    });

    const strength = calculatePasswordStrength(passwordValue);
    const progressColor = strength <= 2 ? 'bg-red-500' : strength <= 4 ? 'bg-amber-400' : 'bg-emerald-500';
    const helperTone = passwordValue ? 'text-zinc-400' : 'text-zinc-500';

    return (
      <div className="min-h-[9.5rem] rounded-sm border border-white/10 bg-white/[0.02] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">{t('password.requirementsTitle')}</p>
          <span className={`text-[11px] uppercase tracking-[0.18em] ${helperTone}`}>
            {passwordValue ? `${strength}/5` : '0/5'}
          </span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/8">
          <div
            className={`h-full rounded-full transition-[width,background-color] duration-200 ${progressColor}`}
            style={{ width: `${(strength / 5) * 100}%` }}
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ValidationItem met={passwordValue.length >= passwordRequirements.minLength} text={t('password.minLength', { value: passwordRequirements.minLength })} />
          <ValidationItem met={passwordRequirements.hasUpperCase.test(passwordValue)} text={t('password.uppercase')} />
          <ValidationItem met={passwordRequirements.hasLowerCase.test(passwordValue)} text={t('password.lowercase')} />
          <ValidationItem met={passwordRequirements.hasNumber.test(passwordValue)} text={t('password.number')} />
          <ValidationItem met={passwordRequirements.hasSpecialChar.test(passwordValue)} text={t('password.special')} />
        </div>
      </div>
    );
  },
);

export const Signup: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'signup' });
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues, unknown, SignupFormInput>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      confirmPassword: '',
      newsletter: true,
    },
    mode: 'onChange',
  });

  const clearServerError = () => setServerError(null);

  const fullNameRegister = register('fullName', { onChange: clearServerError });
  const emailRegister = register('email', { onChange: clearServerError });
  const passwordRegister = register('password', { onChange: clearServerError });
  const confirmPasswordRegister = register('confirmPassword', { onChange: clearServerError });

  const onSubmit = async (data: SignupFormInput) => {
    setServerError(null);
    try {
      await authService.register({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      });
      sessionStorage.setItem('pendingVerificationEmail', data.email);
      navigate('/email-verification');
    } catch (error) {
      const err = error as Error | { message?: string };
      setServerError(err.message || t('errors.registerFailed'));
    }
  };

  return (
    <AuthLayout backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000">
      <AuthPageHeader eyebrow={t('label')} title={t('title')} subtitle={t('subtitle')} className="mb-10" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <AuthField
          type="text"
          autoComplete="off"
          label={t('form.fullName')}
          error={errors.fullName?.message}
          placeholder={t('form.fullNamePlaceholder', { defaultValue: 'Nguyen Van A' })}
          disabled={isSubmitting}
          {...fullNameRegister}
        />

        <AuthField
          type="email"
          autoComplete="off"
          label={t('form.email')}
          error={errors.email?.message}
          placeholder={t('form.emailPlaceholder', { defaultValue: 'name@example.com' })}
          disabled={isSubmitting}
          {...emailRegister}
        />

        <div className="space-y-3">
          <AuthPasswordField
            autoComplete="new-password"
            label={t('form.password')}
            error={errors.password?.message}
            placeholder="••••••••"
            disabled={isSubmitting}
            {...passwordRegister}
          />
          <PasswordGuidancePanel control={control} t={t} />
        </div>

        <AuthPasswordField
          autoComplete="new-password"
          label={t('form.confirmPassword')}
          error={errors.confirmPassword?.message}
          placeholder="••••••••"
          disabled={isSubmitting}
          {...confirmPasswordRegister}
        />

        <label className="group flex cursor-pointer items-start gap-3 pt-2">
          <span className="relative mt-0.5 flex h-5 w-5 items-center justify-center">
            <input
              type="checkbox"
              {...register('newsletter')}
              className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <span className="h-5 w-5 rounded-sm border border-white/18 bg-white/[0.02] transition-colors duration-150 peer-checked:border-primary peer-checked:bg-primary" />
            <svg
              viewBox="0 0 16 16"
              className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
            </svg>
          </span>
          <span className="text-sm leading-6 text-zinc-400 transition-colors duration-150 group-hover:text-zinc-200">{t('newsletter')}</span>
        </label>

        <div className="space-y-4 pt-3">
          <AuthStatusRail message={serverError ?? undefined} tone="error" reserveSpace />

          <AuthPrimaryButton
            type="submit"
            loading={isSubmitting}
            label={t('actions.create')}
            loadingLabel={t('actions.creating')}
          />

          <AuthDivider label={t('divider.or')} />

          <AuthOAuthButton
            type="button"
            onClick={() => (window.location.href = `${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}/api/auth/google`)}
            disabled={isSubmitting}
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
          {t('footer.hasAccount')}{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="ui-stable-click ml-1 rounded-sm font-bold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            {t('footer.signIn')}
          </button>
        </p>
      </AuthFooterLinks>
    </AuthLayout>
  );
};
