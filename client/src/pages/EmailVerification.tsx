import React, { useState, useEffect, useRef } from 'react';
import { ViewState } from '../types';
import { AuthLayout } from '../layouts/AuthLayout';
import { authService } from '../services/auth.service';
import { useAuth } from '../contexts/AuthContext';
import Mail from 'lucide-react/dist/esm/icons/mail';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import XCircle from 'lucide-react/dist/esm/icons/x-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';

interface EmailVerificationProps {
    setView: (view: ViewState) => void;
    email?: string;
    token?: string; // Keep for backward compatibility, but won't use for code-based flow
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({ setView, email }) => {
    const { refreshSession } = useAuth();
    const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending');
    const [message, setMessage] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [userEmail, setUserEmail] = useState(email || '');

    // 6-digit code input state
    const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    // Handle code input change
    const handleCodeChange = (index: number, value: string) => {
        // Only allow digits
        const digit = value.replace(/\D/g, '').slice(-1);

        const newCode = [...code];
        newCode[index] = digit;
        setCode(newCode);

        // Auto-focus next input
        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits are entered
        if (digit && index === 5) {
            const fullCode = newCode.join('');
            if (fullCode.length === 6) {
                verifyCode(fullCode);
            }
        }
    };

    // Handle keyboard navigation
    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (!code[index] && index > 0) {
                // Move to previous input when backspace on empty input
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

    // Handle paste
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

        if (pastedData.length > 0) {
            const newCode = [...code];
            for (let i = 0; i < pastedData.length && i < 6; i++) {
                newCode[i] = pastedData[i];
            }
            setCode(newCode);

            // Focus appropriate input
            const nextIndex = Math.min(pastedData.length, 5);
            inputRefs.current[nextIndex]?.focus();

            // Auto-submit if 6 digits pasted
            if (pastedData.length === 6) {
                verifyCode(pastedData);
            }
        }
    };

    // Verify the code
    const verifyCode = async (verificationCode: string) => {
        if (!userEmail) {
            setStatus('error');
            setMessage('Email is required');
            return;
        }

        setStatus('verifying');
        try {
            const response = await authService.verifyEmail(userEmail, verificationCode);
            setStatus('success');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setMessage((response as any).message || 'Email verified successfully!');

            // Clear pending email from session storage
            sessionStorage.removeItem('pendingVerificationEmail');

            // Re-initialize auth to get the user session from cookies
            await refreshSession();

            // Redirect to landing page after short delay
            setTimeout(() => {
                setView('STORE_HOME');
            }, 1500);
        } catch (error: unknown) {
            setStatus('error');
            const errorMessage = error instanceof Error ? error.message : 'Verification failed. Please try again.';
            setMessage(errorMessage);
            // Reset code on error
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    };

    const handleResendEmail = async () => {
        if (!userEmail || isResending || resendCooldown > 0) return;

        setIsResending(true);
        try {
            await authService.resendVerification(userEmail);
            setResendCooldown(60); // 60 second cooldown
            setMessage('New verification code sent! Please check your inbox.');
            setStatus('pending');
            // Reset code inputs
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to resend email. Please try again.';
            setMessage(errorMessage);
        } finally {
            setIsResending(false);
        }
    };

    // Verification in progress
    if (status === 'verifying') {
        return (
            <AuthLayout
                backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000"
                setView={setView}
            >
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                    <h1 className="text-2xl font-bold text-white mb-2">Verifying Your Code</h1>
                    <p className="text-gray-400">Please wait while we verify your email...</p>
                </div>
            </AuthLayout>
        );
    }

    // Verification success
    if (status === 'success') {
        return (
            <AuthLayout
                backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000"
                setView={setView}
            >
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Email Verified!</h1>
                    <p className="text-gray-400 text-center mb-4">{message}</p>
                    <p className="text-green-500 text-sm">Redirecting to home...</p>
                </div>
            </AuthLayout>
        );
    }

    // Error state
    if (status === 'error') {
        return (
            <AuthLayout
                backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000"
                setView={setView}
            >
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                        <XCircle className="w-12 h-12 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-4">Verification Failed</h1>
                    <p className="text-gray-400 text-center mb-8">{message}</p>

                    <div className="w-full max-w-sm space-y-6">
                        {/* Code Input */}
                        <div className="flex gap-2 justify-center">
                            {code.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => { inputRefs.current[index] = el; }}
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
                            {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Code'}
                        </button>

                        <button
                            onClick={() => setView('AUTH_LOGIN')}
                            className="w-full text-gray-400 hover:text-white text-sm py-2 transition-colors"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    // Pending state (after registration) - show code input
    return (
        <AuthLayout
            backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000"
            setView={setView}
        >
            <div className="flex flex-col items-center py-10">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                    <Mail className="w-12 h-12 text-primary" />
                </div>

                <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2 text-center">Enter Verification Code</h1>
                <p className="text-gray-400 text-center mb-8 max-w-sm">
                    We've sent a 6-digit code to{' '}
                    <span className="text-white font-semibold">{userEmail || 'your email'}</span>.
                    Enter the code below to verify your account.
                </p>

                {message && (
                    <div className={`${message.includes('sent') ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'} border text-sm p-3 rounded-sm mb-6 w-full max-w-sm text-center`}>
                        {message}
                    </div>
                )}

                <div className="w-full max-w-sm space-y-6">
                    {/* 6-digit Code Input */}
                    <div className="flex gap-3 justify-center">
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => { inputRefs.current[index] = el; }}
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

                    <p className="text-gray-500 text-xs text-center">
                        Code expires in 24 hours
                    </p>

                    <div className="bg-gray-900/50 border border-gray-800 rounded-sm p-4">
                        <h3 className="text-white font-bold text-sm mb-2">Didn't receive the code?</h3>
                        <ul className="text-gray-400 text-sm space-y-1 mb-4">
                            <li>• Check your spam folder</li>
                            <li>• Make sure you entered the correct email</li>
                            <li>• Wait a few minutes for delivery</li>
                        </ul>

                        {!userEmail && (
                            <input
                                type="email"
                                value={userEmail}
                                onChange={(e) => setUserEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="w-full py-3 px-4 text-sm text-white bg-gray-900 border border-gray-700 rounded-sm focus:outline-none focus:border-primary mb-3"
                            />
                        )}

                        <button
                            onClick={handleResendEmail}
                            disabled={isResending || resendCooldown > 0 || !userEmail}
                            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm uppercase tracking-wider py-3 rounded-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                        </button>
                    </div>

                    <div className="flex items-center justify-center gap-4 pt-4">
                        <button
                            onClick={() => setView('AUTH_LOGIN')}
                            className="text-gray-400 hover:text-white text-sm transition-colors"
                        >
                            Back to Login
                        </button>
                        <span className="text-gray-700">|</span>
                        <button
                            onClick={() => setView('AUTH_SIGNUP')}
                            className="text-gray-400 hover:text-white text-sm transition-colors"
                        >
                            Use Different Email
                        </button>
                    </div>
                </div>
            </div>
        </AuthLayout>
    );
};
