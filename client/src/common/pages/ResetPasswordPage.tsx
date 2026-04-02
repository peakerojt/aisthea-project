import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import ShieldCheck from 'lucide-react/dist/esm/icons/shield-check';
import {
  AuthField,
  AuthFooterLinks,
  AuthPageHeader,
  AuthPasswordField,
  AuthPrimaryButton,
  AuthStatePanel,
  AuthStatusRail,
} from '@/common/components/auth';
import { AuthLayout } from '@/common/layouts/AuthLayout';
import { api } from '@/common/utils/api';
import { resetPasswordClientSchema } from '@/common/validation/schemas';

export const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'resetPassword' });
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error === 'invalid_link') {
      setStatus('error');
      setMessage(t('messages.invalidLink'));
    } else if (error === 'expired_token') {
      setStatus('error');
      setMessage(t('messages.expiredToken'));
    } else if (error === 'server_error') {
      setStatus('error');
      setMessage(t('messages.serverError'));
    }

    if (error) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordParsed = resetPasswordClientSchema.safeParse({ token, newPassword });
    if (!passwordParsed.success) {
      setStatus('error');
      setMessage('');
      const tokenIssue = passwordParsed.error.issues.find((issue) => issue.path[0] === 'token');
      const passwordIssue = passwordParsed.error.issues.find((issue) => issue.path[0] === 'newPassword');
      setTokenError(tokenIssue?.message ?? '');
      setNewPasswordError(passwordIssue ? t('messages.passwordInvalid') : '');
      setConfirmPasswordError('');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('');
      setNewPasswordError('');
      setConfirmPasswordError(t('messages.passwordMismatch'));
      return;
    }

    setStatus('loading');
    setMessage('');
    setTokenError('');
    setNewPasswordError('');
    setConfirmPasswordError('');

    try {
      const payload = passwordParsed.data.token
        ? passwordParsed.data
        : { newPassword: passwordParsed.data.newPassword };

      const response = await api.post<{ success: boolean; message?: string }>('/api/auth/reset-password', payload, {
        skipAuthRedirect: true,
      });

      setStatus('success');
      setMessage(response.message || t('actions.loginNow'));
    } catch (err: unknown) {
      const error = err as Error & {
        details?: Array<{ field?: string; message?: string }>;
      };
      const passwordIssue = error.details?.find((issue) => issue.field === 'newPassword' && issue.message);

      setStatus('error');
      if (passwordIssue?.message) {
        setNewPasswordError(passwordIssue.message);
        setMessage('');
        return;
      }
      setMessage(error.message || t('messages.resetFailed'));
    }
  };

  return (
    <AuthLayout backgroundImage="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=2000">
      {status === 'success' ? (
        <AuthStatePanel
          eyebrow={t('title')}
          badge={
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 shadow-[0_18px_40px_rgba(16,185,129,0.12)]">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
          }
          title={t('actions.loginNow')}
          description={message}
        >
          <AuthPrimaryButton type="button" label={t('actions.loginNow')} onClick={() => navigate('/login')} />
        </AuthStatePanel>
      ) : (
        <>
          <AuthPageHeader eyebrow={t('eyebrow')} title={t('title')} subtitle={t('messages.codeHint')} className="mb-10" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthField
              type="text"
              value={token}
              onChange={(e) => {
                setToken(e.target.value.replace(/\D/g, '').slice(0, 6));
                setTokenError('');
                if (status === 'error') {
                  setMessage('');
                  setStatus('idle');
                }
              }}
              inputMode="numeric"
              maxLength={6}
              label={t('form.code')}
              placeholder="123456"
              error={tokenError}
              helperText={!tokenError ? t('messages.codeHint') : undefined}
            />

            <div className="rounded-sm border border-white/10 bg-white/[0.02] px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                  <ShieldCheck className="h-5 w-5 text-zinc-200" />
                </div>
                <p className="text-sm leading-6 text-zinc-400">{t('rail.description')}</p>
              </div>
            </div>

            <AuthPasswordField
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setNewPasswordError('');
                if (status === 'error') {
                  setMessage('');
                  setStatus('idle');
                }
              }}
              required
              autoComplete="new-password"
              label={t('form.newPassword')}
              placeholder="••••••••"
              error={newPasswordError}
            />

            <AuthPasswordField
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setConfirmPasswordError('');
                if (status === 'error') {
                  setMessage('');
                  setStatus('idle');
                }
              }}
              required
              autoComplete="new-password"
              label={t('form.confirmPassword')}
              placeholder="••••••••"
              error={confirmPasswordError}
            />

            <AuthStatusRail message={status === 'error' ? message : undefined} tone="error" reserveSpace />

            <AuthPrimaryButton
              type="submit"
              loading={status === 'loading'}
              label={t('actions.resetPassword')}
              loadingLabel={t('actions.resetting')}
            />
          </form>

          <AuthFooterLinks className="mt-10 text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="ui-stable-click rounded-sm text-sm text-zinc-400 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            >
              {t('actions.loginNow')}
            </button>
          </AuthFooterLinks>
        </>
      )}
    </AuthLayout>
  );
};
