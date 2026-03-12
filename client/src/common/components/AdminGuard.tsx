import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/common/contexts/AuthContext';

const Spinner: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  </div>
);

export const AdminGuard: React.FC = () => {
  const { role, isInitialized } = useAuth();

  if (!isInitialized) return <Spinner />;
  if (role !== 'admin') return <Navigate to="/login" replace />;

  return <Outlet />;
};
