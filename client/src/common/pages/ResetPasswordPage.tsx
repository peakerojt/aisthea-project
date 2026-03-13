import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'resetPassword' });
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

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

    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage(t('messages.passwordMismatch'));
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setStatus('error');
      setMessage(t('messages.passwordInvalid'));
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('messages.resetFailed'));
      }

      setStatus('success');
      setMessage(data.message);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setStatus('error');
      setMessage(error.message || t('messages.resetFailed'));
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
              className="w-full py-3 bg-white text-black font-bold rounded-md hover:bg-gray-200 transition-colors"
            >
              {t('actions.loginNow')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {status === 'error' ? <div className="text-red-500 text-center bg-red-500/10 p-4 rounded mb-4">{message}</div> : null}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">{t('form.newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-bg-dark border border-border-light rounded-md text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">{t('form.confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-bg-dark border border-border-light rounded-md text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-3 bg-white text-black font-bold rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? t('actions.resetting') : t('actions.resetPassword')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
