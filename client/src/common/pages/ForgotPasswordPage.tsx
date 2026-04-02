import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Mail from 'lucide-react/dist/esm/icons/mail';
import {
  AuthField,
  AuthFooterLinks,
  AuthPageHeader,
  AuthPrimaryButton,
  AuthStatePanel,
  AuthStatusRail,
} from '@/common/components/auth';
import { AuthLayout } from '@/common/layouts/AuthLayout';
import { api } from '@/common/utils/api';
import { forgotPasswordClientSchema } from '@/common/validation/schemas';

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'forgotPassword' });
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = forgotPasswordClientSchema.safeParse({ email });

    if (!parsed.success) {
      setStatus('error');
      setMessage('');
      setEmailError(email.trim() ? t('messages.emailInvalid') : t('messages.emailRequired'));
      return;
    }

    setStatus('loading');
    setMessage('');
    setEmailError('');

    try {
      const response = await api.post<{ success: boolean; message?: string }>('/api/auth/forgot-password', parsed.data, {
        skipAuthRedirect: true,
      });

      setStatus('success');
      setMessage(response.message || t('messages.sentHint'));
    } catch (error) {
      const err = error as Error & {
        details?: Array<{ field?: string; message?: string }>;
      };
      const emailIssue = err.details?.find((issue) => issue.field === 'email' && issue.message);

      setStatus('error');
      if (emailIssue?.message) {
        setEmailError(emailIssue.message);
      }
      setMessage(err.message || t('messages.sendFailed'));
    }
  };

  return (
    <AuthLayout backgroundImage="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=2000">
      {status === 'success' ? (
        <AuthStatePanel
          eyebrow={t('title')}
          badge={
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 shadow-[0_18px_40px_rgba(16,185,129,0.12)]">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
          }
          title={t('actions.enterCode')}
          description={message}
        >
          <AuthPrimaryButton type="button" label={t('actions.enterCode')} onClick={() => navigate('/reset-password')} />
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="ui-stable-click w-full rounded-sm border border-white/12 px-4 py-4 text-sm font-medium uppercase tracking-[0.14em] text-zinc-300 transition-colors duration-150 hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            {t('actions.backToLogin')}
          </button>
        </AuthStatePanel>
      ) : (
        <>
          <AuthPageHeader
            eyebrow={t('eyebrow')}
            title={t('title')}
            subtitle={t('form.emailLabel')}
            className="mb-10"
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthField
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
                if (status === 'error') {
                  setMessage('');
                  setStatus('idle');
                }
              }}
              disabled={status === 'loading'}
              label={t('form.emailLabel')}
              placeholder={t('form.emailPlaceholder')}
              error={emailError}
              autoComplete="email"
            />

            <div className="rounded-sm border border-white/10 bg-white/[0.02] px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                  <Mail className="h-5 w-5 text-zinc-300" />
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">{t('rail.title')}</p>
                  <p className="text-sm leading-6 text-zinc-400">{t('rail.description')}</p>
                </div>
              </div>
            </div>

            <AuthStatusRail message={status === 'error' ? message : undefined} tone="error" reserveSpace />

            <AuthPrimaryButton
              type="submit"
              loading={status === 'loading'}
              label={t('actions.sendLink')}
              loadingLabel={t('actions.sending')}
            />
          </form>

          <AuthFooterLinks className="mt-10 text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="ui-stable-click rounded-sm text-sm text-zinc-400 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
            >
              {t('actions.backToLogin')}
            </button>
          </AuthFooterLinks>
        </>
      )}
    </AuthLayout>
  );
};
