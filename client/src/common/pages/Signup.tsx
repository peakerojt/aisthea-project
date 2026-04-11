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
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { passwordRequirements } from '@/common/utils/passwordValidation';
import { useTranslation } from 'react-i18next';
import { SignupFormInput, signupFormSchema } from '@/common/validation/schemas';
import type { input } from 'zod';

type SignupFormValues = input<typeof signupFormSchema>;
type SignupRequestError = Error & {
  code?: string;
  data?: {
    email?: string;
    requiresVerification?: boolean;
  };
};

export const Signup: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'signup' });
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
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
  const passwordValue = useWatch({
    control,
    name: 'password',
    defaultValue: '',
  });
  const passwordChecks = {
    minLength: passwordValue.length >= passwordRequirements.minLength,
    hasUpperCase: passwordRequirements.hasUpperCase.test(passwordValue),
    hasLowerCase: passwordRequirements.hasLowerCase.test(passwordValue),
    hasNumber: passwordRequirements.hasNumber.test(passwordValue),
    hasSpecialChar: passwordRequirements.hasSpecialChar.test(passwordValue),
  };
  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);
  const passwordRegister = register('password', { onChange: clearServerError });
  const passwordHelperText = isPasswordStrong ? t('password.strong') : t('password.helperHint');
  const passwordErrorMessage = errors.password?.message;
  const shouldShowPasswordError = Boolean(passwordErrorMessage) && !isPasswordFocused;
  const passwordErrorContent = shouldShowPasswordError
    ? <span className="inline-flex h-6 items-center">{passwordErrorMessage}</span>
    : undefined;

  const fullNameRegister = register('fullName', { onChange: clearServerError });
  const emailRegister = register('email', { onChange: clearServerError });
  const confirmPasswordRegister = register('confirmPassword', { onChange: clearServerError });
  const passwordHelperContent = shouldShowPasswordError
    ? undefined
    : (
      <span className={`inline-flex h-6 items-center ${isPasswordStrong ? 'text-emerald-300' : ''}`}>
        {passwordHelperText}
      </span>
    );

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
      const err = error as SignupRequestError;
      if (err.code === 'EMAIL_PENDING_VERIFICATION') {
        const pendingEmail = typeof err.data?.email === 'string' && err.data.email.trim().length > 0
          ? err.data.email
          : data.email;
        sessionStorage.setItem('pendingVerificationEmail', pendingEmail);
        navigate('/email-verification', { state: { email: pendingEmail } });
        return;
      }

      setServerError(err.message || t('errors.registerFailed'));
    }
  };

  return (
    <AuthLayout backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000">
      <AuthPageHeader eyebrow={t('label')} title={t('title')} subtitle={t('subtitle')} className="mb-8 lg:mb-9" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

        <div>
          <AuthPasswordField
            {...passwordRegister}
            autoComplete="new-password"
            label={t('form.password')}
            error={passwordErrorContent}
            helperText={passwordHelperContent}
            placeholder="••••••••"
            disabled={isSubmitting}
            onFocus={() => setIsPasswordFocused(true)}
            onBlur={(event) => {
              passwordRegister.onBlur(event);
              setIsPasswordFocused(false);
            }}
          />
        </div>

        <AuthPasswordField
          autoComplete="new-password"
          label={t('form.confirmPassword')}
          error={errors.confirmPassword?.message}
          placeholder="••••••••"
          disabled={isSubmitting}
          {...confirmPasswordRegister}
        />

        <div className="space-y-3 pt-0.5">
          <AuthStatusRail message={serverError ?? undefined} tone="error" reserveSpace compact />

          <AuthPrimaryButton
            type="submit"
            loading={isSubmitting}
            label={t('actions.create')}
            loadingLabel={t('actions.creating')}
          />

          <AuthDivider label={t('divider.or')} className="pt-1" />

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

      <AuthFooterLinks className="mt-8 text-center">
        <p className="text-sm">
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
