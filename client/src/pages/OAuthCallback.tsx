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
            // Parse URL parameters
            const params = new URLSearchParams(window.location.search);
            const success = params.get('success');
            const errorParam = params.get('error');
            const errorMessage = params.get('message');

            // Handle error from OAuth callback
            if (errorParam) {
                console.error('OAuth error:', errorParam, errorMessage);
                setError(getErrorMessage(errorParam, errorMessage));

                // Redirect to login after showing error
                setTimeout(() => {
                    setView('AUTH_LOGIN');
                }, 3000);
                return;
            }

            // If success flag is present, verify session
            if (success === 'true') {
                try {
                    // Call session endpoint to get authenticated user data
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
                } catch (err: any) {
                    console.error('Failed to verify session:', err);
                    setError(err.message || 'Failed to verify authentication');
                    setTimeout(() => setView('AUTH_LOGIN'), 3000);
                }
            } else {
                // No success or error parameter - shouldn't happen
                setError('Invalid callback state');
                setTimeout(() => setView('AUTH_LOGIN'), 2000);
            }
        };

        handleCallback();
    }, [setView]);

    /**
     * Get user-friendly error message from error code
     */
    const getErrorMessage = (code: string, message?: string | null): string => {
        const errorMessages: Record<string, string> = {
            'auth_failed': 'Google authentication failed. Please try again.',
            'invalid_user': 'Unable to retrieve user information from Google.',
            'server_error': 'Server configuration error. Please contact support.',
            'callback_failed': message || 'Authentication callback failed. Please try again.',
        };

        return errorMessages[code] || 'An unexpected error occurred during login.';
    };

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
