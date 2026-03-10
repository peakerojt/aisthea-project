import React, { useState } from 'react';
import { ViewState } from '../../types';

interface ForgotPasswordPageProps {
    setView: (view: ViewState) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ setView }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send reset link');
            }

            setStatus('success');
            setMessage(data.message);
        } catch (error) {
            const err = error as Error | { message?: string; error?: string; data?: unknown };
            setStatus('error');
            setMessage(err.message);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-bg-dark text-white p-4">
            <div className="w-full max-w-md bg-bg-card p-8 rounded-lg shadow-lg border border-border-light/20">
                <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Forgot Password
                </h2>

                {status === 'success' ? (
                    <div className="text-center">
                        <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded mb-6">
                            {message}
                        </div>
                        <button
                            onClick={() => setView('AUTH_LOGIN')}
                            className="w-full py-3 bg-none border border-border-light text-text-secondary hover:text-white hover:border-white transition-colors rounded-md font-medium"
                        >
                            Back to Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                Enter your email address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-bg-dark border border-border-light rounded-md text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                placeholder="name@example.com"
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
                            {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                        </button>

                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={() => setView('AUTH_LOGIN')}
                                className="text-text-secondary hover:text-white text-sm transition-colors"
                            >
                                Back to Login
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
