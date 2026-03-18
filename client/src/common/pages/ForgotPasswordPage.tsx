import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '@/common/layouts/AuthLayout';

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'forgotPassword' });
  const { t: resetT } = useTranslation('pages', { keyPrefix: 'resetPassword' });
  const navigate = useNavigate();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || t('messages.sendFailed'));
      }

      setStatus('success');
      setStep(2);
      setMessage(data.message);
      // reset status to idle for the next form
      setTimeout(() => { setStatus('idle'); setMessage(''); }, 2000);
    } catch (error) {
      const err = error as Error | { message?: string };
      setStatus('error');
      setMessage(err.message || t('messages.sendFailed'));
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage(resetT('messages.passwordMismatch', 'Passwords do not match'));
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setStatus('error');
      setMessage(resetT('messages.passwordInvalid', 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'));
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || resetT('messages.resetFailed', 'Failed to reset password'));
      }

      setStatus('success');
      setStep(3);
      setMessage(data.message || resetT('messages.resetSuccess', 'Password reset successfully'));
    } catch (err: unknown) {
      const error = err as { message?: string };
      setStatus('error');
      setMessage(error.message || resetT('messages.resetFailed', 'Failed to reset password'));
    }
  };

  return (
    <AuthLayout backgroundImage="https://images.unsplash.com/photo-1511556532299-8f662fc26c06?q=80&w=2000">
      <div className="mb-12">
        <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">RECOVERY</p>
        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-2">
          {step === 1 ? t('title') : step === 2 ? resetT('title', 'Reset Password') : 'Reset Successfully'}
        </h1>
        {step === 2 && (
          <p className="text-gray-400 mt-2">
            Please enter the 6-digit confirmation code sent to <strong className="text-white">{email}</strong>
          </p>
        )}
      </div>

      {step === 3 ? (
        <div className="text-center">
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-md mb-8 tracking-wide font-medium">{message}</div>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-primary hover:bg-red-700 text-white font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-sm transition-all shadow-lg shadow-primary/20"
          >
            {t('actions.backToLogin')}
          </button>
        </div>
      ) : step === 1 ? (
        <form onSubmit={handleSendCode} className="flex flex-col gap-6">
          <div className="relative group mb-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block py-4 px-0 w-full text-base text-white bg-transparent border-0 border-b appearance-none focus:outline-none focus:ring-0 peer transition-colors border-gray-700 focus:border-white"
              placeholder=" "
              disabled={status === 'loading'}
            />
            <label className="absolute text-sm duration-300 transform -translate-y-6 scale-75 top-3 z-0 origin-[0] peer-focus:left-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase pointer-events-none text-gray-500 peer-focus:text-white">
              {t('form.emailLabel')}
            </label>
          </div>

          {status === 'error' && <div className="text-red-500 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-md">{message}</div>}
          {status === 'success' && <div className="text-green-500 text-sm p-3 bg-green-500/10 border border-green-500/20 rounded-md">{message}</div>}

          <div className="flex flex-col gap-4 mt-4">
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-primary hover:bg-red-700 text-white font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-sm transition-all shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  {t('actions.sending')}
                </>
              ) : t('actions.sendLink')}
            </button>
            <button
              type="button" 
              onClick={() => navigate('/login')} 
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-sm transition-all text-center"
            >
              {t('actions.backToLogin')}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="flex flex-col gap-6">
          <div className="relative group mb-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              className="block py-4 px-0 w-full text-base text-white bg-transparent border-0 border-b appearance-none focus:outline-none focus:ring-0 peer transition-colors tracking-widest font-mono text-xl border-gray-700 focus:border-white"
              placeholder=" "
              disabled={status === 'loading'}
            />
            <label className="absolute text-sm duration-300 transform -translate-y-6 scale-75 top-3 z-0 origin-[0] peer-focus:left-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase pointer-events-none text-gray-500 peer-focus:text-white">
              Confirmation Code
            </label>
          </div>

          <div className="relative group mb-2">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="block py-4 px-0 w-full text-base text-white bg-transparent border-0 border-b appearance-none focus:outline-none focus:ring-0 peer transition-colors pr-12 border-gray-700 focus:border-white"
              placeholder=" "
              disabled={status === 'loading'}
            />
            <label className="absolute text-sm duration-300 transform -translate-y-6 scale-75 top-3 z-0 origin-[0] peer-focus:left-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase pointer-events-none text-gray-500 peer-focus:text-white">
              {resetT('form.newPassword', 'New Password')}
            </label>
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-0 top-3 text-gray-500 hover:text-white transition-colors p-1"
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative group mb-4">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="block py-4 px-0 w-full text-base text-white bg-transparent border-0 border-b appearance-none focus:outline-none focus:ring-0 peer transition-colors pr-12 border-gray-700 focus:border-white"
              placeholder=" "
              disabled={status === 'loading'}
            />
            <label className="absolute text-sm duration-300 transform -translate-y-6 scale-75 top-3 z-0 origin-[0] peer-focus:left-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase pointer-events-none text-gray-500 peer-focus:text-white">
              {resetT('form.confirmPassword', 'Confirm Password')}
            </label>
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-0 top-3 text-gray-500 hover:text-white transition-colors p-1"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {status === 'error' && <div className="text-red-500 text-sm p-3 bg-red-500/10 border border-red-500/20 rounded-md">{message}</div>}

          <div className="flex flex-col gap-4 mt-2">
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-primary hover:bg-red-700 text-white font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-sm transition-all shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  {resetT('actions.resetting', 'Resetting...')}
                </>
              ) : resetT('actions.resetPassword', 'Reset Password')}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full bg-transparent border border-white/20 hover:bg-white/5 text-white font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-sm transition-all text-center"
            >
              Back to Email
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};
