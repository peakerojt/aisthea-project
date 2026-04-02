import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/common/layouts/AuthLayout';
import {
  AuthField,
  AuthFooterLinks,
  AuthHelperRow,
  AuthPageHeader,
  AuthPrimaryButton,
  AuthStatePanel,
  AuthStatusRail,
} from '@/common/components/auth';
import { authService } from '@/common/services/auth.service';
import { useAuth } from '@/common/contexts/AuthContext';
import Mail from 'lucide-react/dist/esm/icons/mail';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { useTranslation } from 'react-i18next';
import { resendVerificationClientSchema, verifyEmailClientSchema } from '@/common/validation/schemas';

interface EmailVerificationProps {
  email?: string;
  token?: string;
}

type StatusTone = 'info' | 'success' | 'error';

export const EmailVerification: React.FC<EmailVerificationProps> = ({ email }) => {
  const { t } = useTranslation('pages', { keyPrefix: 'emailVerification' });
  const { refreshSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<StatusTone>('info');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const stateEmail = (location.state as { email?: string } | null)?.email;
  const [userEmail, setUserEmail] = useState(email || stateEmail || sessionStorage.getItem('pendingVerificationEmail') || '');
  const [emailError, setEmailError] = useState('');
  const [codeError, setCodeError] = useState('');

  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error) {
      setStatus('error');
      setMessageTone('error');
    }

    if (error === 'invalid_link') {
      setMessage(t('messages.verifyFailed'));
    } else if (error === 'expired_token') {
      setMessage(t('messages.verifyFailed'));
    } else if (error === 'server_error') {
      setMessage(t('messages.resendFailed'));
    }

    if (error) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [t]);

  const clearInlineState = () => {
    if (message) {
      setMessage('');
      setMessageTone('info');
    }
    if (status === 'error') {
      setStatus('pending');
    }
  };

  const verifyCode = async (verificationCode: string) => {
    const normalizedCode = verificationCode.replace(/\D/g, '');
    const emailParsed = resendVerificationClientSchema.safeParse({ email: userEmail });

    if (!emailParsed.success) {
      setEmailError(userEmail.trim() ? t('messages.emailInvalid') : t('messages.emailRequired'));
      setCodeError('');
      clearInlineState();
      return;
    }

    if (normalizedCode.length !== 6) {
      setCodeError(t('messages.codeInvalid'));
      setEmailError('');
      clearInlineState();
      return;
    }

    setEmailError('');
    setCodeError('');
    setMessage('');
    setStatus('verifying');

    try {
      const payload = verifyEmailClientSchema.parse({ email: emailParsed.data.email, code: normalizedCode });
      const response = await authService.verifyEmail(payload.email, payload.code);
      setStatus('success');
      setMessageTone('success');
      setMessage((response as { message?: string }).message || t('messages.verifySuccess'));
      sessionStorage.removeItem('pendingVerificationEmail');
      await refreshSession();
      setTimeout(() => navigate('/'), 1500);
    } catch (error: unknown) {
      setStatus('error');
      setMessageTone('error');
      const requestError = error as Error & {
        details?: Array<{ field?: string; message?: string }>;
      };
      const emailIssue = requestError.details?.find((issue) => issue.field === 'email' && issue.message);
      const codeIssue = requestError.details?.find((issue) => issue.field === 'code' && issue.message);
      if (emailIssue?.message) {
        setEmailError(emailIssue.message);
      }
      if (codeIssue?.message) {
        setCodeError(codeIssue.message);
      }
      setMessage(requestError.message || t('messages.verifyFailed'));
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setCodeError('');
    clearInlineState();

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        void verifyCode(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData.length) return;

    setCodeError('');
    clearInlineState();

    const newCode = [...code];
    for (let i = 0; i < pastedData.length && i < 6; i += 1) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
    if (pastedData.length === 6) {
      void verifyCode(pastedData);
    }
  };

  const handleResendEmail = async () => {
    if (!userEmail || isResending || resendCooldown > 0) return;

    const parsed = resendVerificationClientSchema.safeParse({ email: userEmail });
    if (!parsed.success) {
      setEmailError(userEmail.trim() ? t('messages.emailInvalid') : t('messages.emailRequired'));
      setMessage('');
      setMessageTone('info');
      setStatus('pending');
      return;
    }

    setIsResending(true);
    setEmailError('');
    try {
      await authService.resendVerification(parsed.data.email);
      setResendCooldown(60);
      setMessage(t('messages.resendSuccess'));
      setMessageTone('success');
      setStatus('pending');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: unknown) {
      const requestError = error as Error & {
        details?: Array<{ field?: string; message?: string }>;
      };
      const emailIssue = requestError.details?.find((issue) => issue.field === 'email' && issue.message);
      if (emailIssue?.message) {
        setEmailError(emailIssue.message);
      }
      setMessage(requestError.message || t('messages.resendFailed'));
      setMessageTone('error');
      setStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  if (status === 'verifying') {
    return (
      <AuthLayout backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000">
        <AuthStatePanel
          eyebrow={t('label')}
          badge={
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/25 bg-primary/10 shadow-[0_18px_40px_rgba(220,38,38,0.12)]">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          }
          title={t('states.verifyingTitle')}
          description={t('states.verifyingDescription')}
        />
      </AuthLayout>
    );
  }

  if (status === 'success') {
    return (
      <AuthLayout backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000">
        <AuthStatePanel
          eyebrow={t('label')}
          badge={
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 shadow-[0_18px_40px_rgba(16,185,129,0.12)]">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
            </div>
          }
          title={t('states.successTitle')}
          description={message}
          meta={t('states.redirectingHome')}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000">
      <AuthPageHeader
        eyebrow={t('label')}
        title={t('states.pendingTitle')}
        subtitle={
          <>
            {t('states.pendingDescriptionPrefix')}{' '}
            <span className="font-semibold text-white">{userEmail || t('states.yourEmail')}</span>.{' '}
            {t('states.pendingDescriptionSuffix')}
          </>
        }
        className="mb-10"
      />

      <div className="space-y-6">
        <AuthStatusRail message={message} tone={messageTone} reserveSpace />

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
              <Mail className="h-5 w-5 text-zinc-200" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">{t('meta.codeLabel')}</p>
              <p className="text-sm text-zinc-500">{t('states.codeExpires')}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2 sm:gap-3" role="group" aria-label={t('states.pendingTitle')}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={`ui-stable-click h-14 w-full rounded-sm border bg-white/[0.02] text-center text-2xl font-bold text-white outline-none transition-[border-color,box-shadow] duration-150 focus-visible:ring-1 ${
                    codeError
                      ? 'border-red-500/60 focus-visible:border-red-400 focus-visible:ring-red-500/25'
                      : 'border-white/12 hover:border-white/20 focus-visible:border-white/35 focus-visible:ring-primary/35'
                  }`}
                  aria-label={`Verification code digit ${index + 1}`}
                  autoFocus={index === 0}
                />
              ))}
            </div>
            <AuthHelperRow message={codeError} tone="error" align="center" live="polite" />
          </div>
        </div>

        <div className="rounded-sm border border-white/10 bg-white/[0.02] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">{t('help.title')}</p>
            <ul className="space-y-1 text-sm leading-6 text-zinc-400">
              <li>• {t('help.tip1')}</li>
              <li>• {t('help.tip2')}</li>
              <li>• {t('help.tip3')}</li>
            </ul>
          </div>

          {!userEmail ? (
            <div className="mt-4">
              <AuthField
                type="email"
                value={userEmail}
                onChange={(e) => {
                  setUserEmail(e.target.value);
                  setEmailError('');
                  clearInlineState();
                }}
                label={t('states.yourEmail')}
                placeholder={t('form.emailPlaceholder')}
                error={emailError}
              />
            </div>
          ) : (
            <div className="mt-4 rounded-sm border border-white/8 bg-black/20 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">{t('meta.currentEmail')}</p>
              <p className="mt-2 text-sm text-white">{userEmail}</p>
              <AuthHelperRow message={emailError} tone="error" />
            </div>
          )}

          <div className="mt-4">
            <AuthPrimaryButton
              type="button"
              onClick={handleResendEmail}
              disabled={isResending || resendCooldown > 0 || !userEmail}
              loading={isResending}
              label={resendCooldown > 0 ? t('actions.resendIn', { seconds: resendCooldown }) : t('actions.resendShort')}
              loadingLabel={t('actions.sending')}
            />
          </div>
        </div>
      </div>

      <AuthFooterLinks className="mt-10">
        <div className="flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="ui-stable-click rounded-sm text-zinc-400 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            {t('actions.backToLogin')}
          </button>
          <span className="text-zinc-700">/</span>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="ui-stable-click rounded-sm text-zinc-400 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
          >
            {t('actions.useDifferentEmail')}
          </button>
        </div>
      </AuthFooterLinks>
    </AuthLayout>
  );
};
