import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/common/layouts/AuthLayout';
import { authService } from '@/common/services/auth.service';
import { useAuth } from '@/common/contexts/AuthContext';
import Mail from 'lucide-react/dist/esm/icons/mail';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { useTranslation } from 'react-i18next';
import { resendVerificationClientSchema, verifyEmailClientSchema } from '@/common/validation/schemas';

interface EmailVerificationProps {
  email?: string;
  token?: string;
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({ email }) => {
  const { t } = useTranslation('pages', { keyPrefix: 'emailVerification' });
  const { refreshSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');
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

  const verifyCode = async (verificationCode: string) => {
    const normalizedCode = verificationCode.replace(/\D/g, '');
    const emailParsed = resendVerificationClientSchema.safeParse({ email: userEmail });

    if (!emailParsed.success) {
      setEmailError(userEmail.trim() ? t('messages.emailInvalid') : t('messages.emailRequired'));
      setCodeError('');
      setMessage('');
      if (status !== 'error') {
        setStatus('pending');
      }
      return;
    }

    if (normalizedCode.length !== 6) {
      setCodeError(t('messages.codeInvalid'));
      setEmailError('');
      setMessage('');
      if (status !== 'error') {
        setStatus('pending');
      }
      return;
    }

    setEmailError('');
    setCodeError('');
    setStatus('verifying');
    try {
      const payload = verifyEmailClientSchema.parse({ email: emailParsed.data.email, code: normalizedCode });
      const response = await authService.verifyEmail(payload.email, payload.code);
      setStatus('success');
      setMessage((response as any).message || t('messages.verifySuccess'));
      sessionStorage.removeItem('pendingVerificationEmail');
      await refreshSession();
      setTimeout(() => navigate('/'), 1500);
    } catch (error: unknown) {
      setStatus('error');
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
      const errorMessage = requestError.message || t('messages.verifyFailed');
      setMessage(errorMessage);
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
    if (status === 'error') {
      setMessage('');
    }

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        verifyCode(fullCode);
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
    if (status === 'error') {
      setMessage('');
    }

    const newCode = [...code];
    for (let i = 0; i < pastedData.length && i < 6; i += 1) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
    if (pastedData.length === 6) {
      verifyCode(pastedData);
    }
  };

  const handleResendEmail = async () => {
    if (!userEmail || isResending || resendCooldown > 0) return;

    const parsed = resendVerificationClientSchema.safeParse({ email: userEmail });
    if (!parsed.success) {
      setEmailError(userEmail.trim() ? t('messages.emailInvalid') : t('messages.emailRequired'));
      setMessage('');
      return;
    }

    setIsResending(true);
    setEmailError('');
    try {
      await authService.resendVerification(parsed.data.email);
      setResendCooldown(60);
      setMessage(t('messages.resendSuccess'));
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
      const errorMessage = requestError.message || t('messages.resendFailed');
      setMessage(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  if (status === 'verifying') {
    return (
      <AuthLayout backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
          <h1 className="mb-2 text-3xl font-black uppercase tracking-tight text-white">{t('states.verifyingTitle')}</h1>
          <p className="text-gray-400">{t('states.verifyingDescription')}</p>
        </div>
      </AuthLayout>
    );
  }

  if (status === 'success') {
    return (
      <AuthLayout backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-green-500/30 bg-green-500/15 shadow-[0_0_30px_rgba(34,197,94,0.18)]">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-4">{t('states.successTitle')}</h1>
          <p className="text-gray-400 text-center mb-4">{message}</p>
          <p className="text-green-500 text-sm">{t('states.redirectingHome')}</p>
        </div>
      </AuthLayout>
    );
  }

  if (status === 'error') {
    return (
      <AuthLayout backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-500/30 bg-red-500/15 shadow-[0_0_30px_rgba(239,68,68,0.16)]">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-4">{t('states.errorTitle')}</h1>
          {message && <p className="text-gray-400 text-center mb-8">{message}</p>}

          <div className="w-full max-w-sm space-y-6">
            <div className="flex gap-2 justify-center">
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
                  className={`h-14 w-12 rounded-xl border-2 bg-black/35 text-center text-2xl font-bold text-white backdrop-blur-sm transition-colors focus:outline-none ${codeError ? 'border-red-500 focus:border-red-400' : 'border-gray-700 focus:border-primary'}`}
                />
              ))}
            </div>
            {codeError && <p className="text-sm text-red-400 text-center">{codeError}</p>}
            {emailError && <p className="text-sm text-red-400 text-center">{emailError}</p>}

            <button
              onClick={handleResendEmail}
              disabled={isResending || resendCooldown > 0}
              className="w-full rounded-sm bg-white/10 py-4 text-sm font-bold uppercase tracking-[0.15em] text-white transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResending
                ? t('actions.sending')
                : resendCooldown > 0
                ? t('actions.resendIn', { seconds: resendCooldown })
                : t('actions.resendCode')}
            </button>

            <button onClick={() => navigate('/login')} className="w-full text-gray-400 hover:text-white text-sm py-2 transition-colors">
              {t('actions.backToLogin')}
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000">
      <div className="flex flex-col items-center py-10">
        <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">{t('label')}</div>
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-primary/15 shadow-[0_0_30px_rgba(220,38,38,0.16)]">
          <Mail className="w-12 h-12 text-primary" />
        </div>

        <h1 className="mb-2 text-center text-3xl font-black uppercase tracking-tight text-white">{t('states.pendingTitle')}</h1>
        <p className="mb-8 max-w-sm text-center text-gray-400">
          {t('states.pendingDescriptionPrefix')}{' '}
          <span className="text-white font-semibold">{userEmail || t('states.yourEmail')}</span>. {t('states.pendingDescriptionSuffix')}
        </p>

        {message && (
          <div
            className={`${
              message.toLowerCase().includes('gửi')
                ? 'bg-green-500/10 border-green-500/50 text-green-500'
                : 'bg-red-500/10 border-red-500/50 text-red-500'
            } border text-sm p-3 rounded-sm mb-6 w-full max-w-sm text-center`}
          >
            {message}
          </div>
        )}

        <div className="w-full max-w-sm space-y-6">
          <div className="flex gap-3 justify-center">
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
                className={`h-14 w-12 rounded-xl border-2 bg-black/35 text-center text-2xl font-bold text-white backdrop-blur-sm transition-colors focus:outline-none ${codeError ? 'border-red-500 focus:border-red-400' : 'border-gray-700 focus:border-primary'}`}
                autoFocus={index === 0}
              />
            ))}
          </div>
          {codeError && <p className="text-sm text-red-400 text-center">{codeError}</p>}

          <p className="text-gray-500 text-xs text-center">{t('states.codeExpires')}</p>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-white">{t('help.title')}</h3>
            <ul className="text-gray-400 text-sm space-y-1 mb-4">
              <li>• {t('help.tip1')}</li>
              <li>• {t('help.tip2')}</li>
              <li>• {t('help.tip3')}</li>
            </ul>

            {!userEmail && (
              <div>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => {
                    setUserEmail(e.target.value);
                    setEmailError('');
                    if (status === 'error') {
                      setMessage('');
                    }
                  }}
                  placeholder={t('form.emailPlaceholder')}
                  className={`mb-3 w-full rounded-xl border bg-black/35 px-4 py-3 text-sm text-white backdrop-blur-sm focus:outline-none ${emailError ? 'border-red-500 focus:border-red-400' : 'border-gray-700 focus:border-primary'}`}
                />
                {emailError && <p className="mb-3 text-sm text-red-400">{emailError}</p>}
              </div>
            )}

            {userEmail && emailError && <p className="mb-3 text-sm text-red-400">{emailError}</p>}

            <button
              onClick={handleResendEmail}
              disabled={isResending || resendCooldown > 0 || !userEmail}
              className="w-full rounded-sm bg-white/10 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResending
                ? t('actions.sending')
                : resendCooldown > 0
                ? t('actions.resendIn', { seconds: resendCooldown })
                : t('actions.resendShort')}
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            <button onClick={() => navigate('/login')} className="text-sm text-gray-400 transition-colors hover:text-white">
              {t('actions.backToLogin')}
            </button>
            <span className="text-gray-700">|</span>
            <button onClick={() => navigate('/signup')} className="text-sm text-gray-400 transition-colors hover:text-white">
              {t('actions.useDifferentEmail')}
            </button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};
