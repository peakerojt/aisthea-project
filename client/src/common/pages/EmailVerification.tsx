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

  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const verifyCode = async (verificationCode: string) => {
    if (!userEmail) {
      setStatus('error');
      setMessage(t('messages.emailRequired'));
      return;
    }

    setStatus('verifying');
    try {
      const response = await authService.verifyEmail(userEmail, verificationCode);
      setStatus('success');
      setMessage((response as any).message || t('messages.verifySuccess'));
      sessionStorage.removeItem('pendingVerificationEmail');
      await refreshSession();
      setTimeout(() => navigate('/'), 1500);
    } catch (error: unknown) {
      setStatus('error');
      const errorMessage = error instanceof Error ? error.message : t('messages.verifyFailed');
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

    setIsResending(true);
    try {
      await authService.resendVerification(userEmail);
      setResendCooldown(60);
      setMessage(t('messages.resendSuccess'));
      setStatus('pending');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('messages.resendFailed');
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
          <h1 className="text-2xl font-bold text-white mb-2">{t('states.verifyingTitle')}</h1>
          <p className="text-gray-400">{t('states.verifyingDescription')}</p>
        </div>
      </AuthLayout>
    );
  }

  if (status === 'success') {
    return (
      <AuthLayout backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
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
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-4">{t('states.errorTitle')}</h1>
          <p className="text-gray-400 text-center mb-8">{message}</p>

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
                  className="w-12 h-14 text-center text-2xl font-bold text-white bg-gray-900 border-2 border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors"
                />
              ))}
            </div>

            <button
              onClick={handleResendEmail}
              disabled={isResending || resendCooldown > 0}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
          <Mail className="w-12 h-12 text-primary" />
        </div>

        <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2 text-center">{t('states.pendingTitle')}</h1>
        <p className="text-gray-400 text-center mb-8 max-w-sm">
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
                className="w-12 h-14 text-center text-2xl font-bold text-white bg-gray-900 border-2 border-gray-700 rounded-lg focus:outline-none focus:border-primary transition-colors"
                autoFocus={index === 0}
              />
            ))}
          </div>

          <p className="text-gray-500 text-xs text-center">{t('states.codeExpires')}</p>

          <div className="bg-gray-900/50 border border-gray-800 rounded-sm p-4">
            <h3 className="text-white font-bold text-sm mb-2">{t('help.title')}</h3>
            <ul className="text-gray-400 text-sm space-y-1 mb-4">
              <li>• {t('help.tip1')}</li>
              <li>• {t('help.tip2')}</li>
              <li>• {t('help.tip3')}</li>
            </ul>

            {!userEmail && (
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder={t('form.emailPlaceholder')}
                className="w-full py-3 px-4 text-sm text-white bg-gray-900 border border-gray-700 rounded-sm focus:outline-none focus:border-primary mb-3"
              />
            )}

            <button
              onClick={handleResendEmail}
              disabled={isResending || resendCooldown > 0 || !userEmail}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm uppercase tracking-wider py-3 rounded-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending
                ? t('actions.sending')
                : resendCooldown > 0
                ? t('actions.resendIn', { seconds: resendCooldown })
                : t('actions.resendShort')}
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            <button onClick={() => navigate('/login')} className="text-gray-400 hover:text-white text-sm transition-colors">
              {t('actions.backToLogin')}
            </button>
            <span className="text-gray-700">|</span>
            <button onClick={() => navigate('/signup')} className="text-gray-400 hover:text-white text-sm transition-colors">
              {t('actions.useDifferentEmail')}
            </button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};
