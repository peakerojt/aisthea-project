import React, { useState, useEffect } from 'react';
import { ViewState } from '../../types';

interface ResetPasswordPageProps {
    setView: (view: ViewState) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ setView }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Check for error from redirect (invalid/expired token)
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');

        if (error === 'invalid_link') {
            setStatus('error');
            setMessage('Invalid password reset link.');
        } else if (error === 'expired_token') {
            setStatus('error');
            setMessage('Password reset link has expired. Please request a new one.');
        } else if (error === 'server_error') {
            setStatus('error');
            setMessage('Server error. Please try again later.');
        }

        // Clean up URL after reading error (remove query params for clean URL)
        if (error) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match');
            return;
        }

        // Password validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            setStatus('error');
            setMessage('Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const response = await fetch('http://localhost:5000/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Important: include cookies
                body: JSON.stringify({ newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password');
            }

            setStatus('success');
            setMessage(data.message);
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-bg-dark text-white p-4">
            <div className="w-full max-w-md bg-bg-card p-8 rounded-lg shadow-lg border border-border-light/20">
                <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Reset Password
                </h2>

                {status === 'success' ? (
                    <div className="text-center">
                        <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded mb-6">
                            {message}
                        </div>
                        <button
                            onClick={() => setView('AUTH_LOGIN')}
                            className="w-full py-3 bg-white text-black font-bold rounded-md hover:bg-gray-200 transition-colors"
                        >
                            Login Now
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {status === 'error' ? (
                            <div className="text-red-500 text-center bg-red-500/10 p-4 rounded mb-4">
                                {message}
                            </div>
                        ) : null}

                        <>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    New Password
                                </label>
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
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Confirm New Password
                                </label>
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

                            {status === 'error' && (
                                <div className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded">
                                    {message}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full py-3 bg-white text-black font-bold rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {status === 'loading' ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </>
                    </form>
                )}
            </div>
        </div>
    );
};
