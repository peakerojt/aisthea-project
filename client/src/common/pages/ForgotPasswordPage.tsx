import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
      setMessage(response.message || t('actions.sendLink'));
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
    <div className="flex items-center justify-center min-h-screen bg-bg-dark text-white p-4">
      <div className="w-full max-w-md bg-bg-card p-8 rounded-lg shadow-lg border border-border-light/20">
        <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {t('title')}
        </h2>

        {status === 'success' ? (
          <div className="text-center">
            <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded mb-6">{message}</div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-none border border-border-light text-text-secondary hover:text-white hover:border-white transition-colors rounded-md font-medium"
            >
              {t('actions.backToLogin')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">{t('form.emailLabel')}</label>
              <input
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
                required
                className={`w-full px-4 py-3 bg-bg-dark border rounded-md text-white focus:outline-none focus:ring-1 transition-colors ${emailError ? 'border-red-500 focus:border-red-400 focus:ring-red-500/20' : 'border-border-light focus:border-primary focus:ring-primary'}`}
                placeholder={t('form.emailPlaceholder')}
              />
              {emailError && <p className="mt-2 text-sm text-red-400">{emailError}</p>}
            </div>

            {status === 'error' && message && <div className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded">{message}</div>}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3 bg-white text-black font-bold rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? t('actions.sending') : t('actions.sendLink')}
            </button>

            <div className="text-center mt-4">
              <button type="button" onClick={() => navigate('/login')} className="text-text-secondary hover:text-white text-sm transition-colors">
                {t('actions.backToLogin')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
