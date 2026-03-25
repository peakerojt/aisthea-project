import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/common/contexts/AuthContext';

export const AuthEventListener: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  React.useEffect(() => {
    const handleBanned = async () => {
      try {
        await logout();
      } catch {
        // Swallow logout errors and still navigate to login
      }
      navigate('/login?reason=banned', { replace: true });
    };

    window.addEventListener('auth:banned', handleBanned);
    return () => window.removeEventListener('auth:banned', handleBanned);
  }, [logout, navigate]);

  return null;
};
