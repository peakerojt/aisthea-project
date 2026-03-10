import React, { useEffect, useState } from 'react';
import { ViewState, AuthSession, AuthError } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

interface OAuthCallbackProps {
    setView: (view: ViewState) => void;
}

export const OAuthCallback: React.FC<OAuthCallbackProps> = ({ setView }) => {
    const { setUserFromSession } = useAuth();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Directly check session - auth state is in HTTP-only cookie
                const session = await api.get<AuthSession>('/api/auth/session');

                if (session.isAuthenticated && session.user) {
                    // Update AuthContext with the session data
                    setUserFromSession(session);

                    // Redirect based on role
                    if (session.user.roles.includes('Admin')) {
                        setView('ADMIN_DASHBOARD');
                    } else {
                        setView('STORE_HOME');
                    }
                } else {
                    setError('Authentication failed - no user session');
                    setTimeout(() => setView('AUTH_LOGIN'), 3000);
                }
            } catch (error) {
            const err = error as Error | { message?: string; error?: string; data?: unknown };
                console.error('Failed to verify session:', err);
                setError(err.message || 'Failed to verify authentication');
                setTimeout(() => setView('AUTH_LOGIN'), 3000);
            }
        };

        handleCallback();
    }, [setView, setUserFromSession]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center max-w-md mx-auto px-4">
                {error ? (
                    <>
                        {/* Error State */}
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                            <svg
                                className="w-8 h-8 text-red-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </div>
                        <p className="text-white text-lg font-bold mb-2">Authentication Failed</p>
                        <p className="text-gray-400 text-sm">{error}</p>
                        <p className="text-gray-500 text-xs mt-3">Redirecting to login...</p>
                    </>
                ) : (
                    <>
                        {/* Loading State */}
                        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white text-lg font-bold">Completing sign in...</p>
                        <p className="text-gray-500 text-sm mt-2">Verifying your authentication</p>
                    </>
                )}
            </div>
        </div>
    );
};
