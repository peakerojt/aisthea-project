import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthSession } from '@/types';
import { useAuth } from '@/common/contexts/AuthContext';
import { useCart } from '@/common/contexts/CartContext';
import { getGuestCart } from '@/common/services/cart.service';
import { api } from '@/common/utils/api';
import { getAdminLandingPath, hasAdminShellAccess } from '@/common/utils/adminAccess';
import { useTranslation } from 'react-i18next';

export const OAuthCallback: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'oauthCallback' });
  const { setUserFromSession } = useAuth();
  const { syncWithMerge } = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const session = await api.get<AuthSession>('/api/auth/session');

        if (session.isAuthenticated && session.user) {
          const localItems = getGuestCart();
          setUserFromSession(session);

          if (localItems.length > 0) {
            try {
              await syncWithMerge(localItems);
            } catch (mergeError) {
              console.error('Failed to merge guest cart after OAuth login:', mergeError);
            }
          }

          if (hasAdminShellAccess(session.user.roles, session.user.permissions)) {
            navigate(getAdminLandingPath(session.user.roles, session.user.permissions));
          } else {
            navigate('/');
          }
        } else {
          setError(t('errors.sessionNotFound'));
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (error) {
        const err = error as Error | { message?: string };
        console.error('Failed to verify session:', err);
        setError(err.message || t('errors.verifyFailed'));
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [navigate, setUserFromSession, syncWithMerge, t]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {error ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-white text-lg font-bold mb-2">{t('states.failedTitle')}</p>
            <p className="text-gray-400 text-sm">{error}</p>
            <p className="text-gray-500 text-xs mt-3">{t('states.redirecting')}</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg font-bold">{t('states.processingTitle')}</p>
            <p className="text-gray-500 text-sm mt-2">{t('states.processingDescription')}</p>
          </>
        )}
      </div>
    </div>
  );
};
