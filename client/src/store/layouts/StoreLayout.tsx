import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from '@/store/components/Footer';

export const StoreLayout: React.FC = () => {
  const location = useLocation();
  const hideFooterPrefixes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/oauth'];
  const shouldHideFooter = hideFooterPrefixes.some((prefix) => location.pathname.startsWith(prefix));

  return (
    <div className="text-white font-sans antialiased min-h-screen bg-bg-dark flex flex-col overflow-x-hidden">
      <div className="flex-1">
        <Outlet />
      </div>
      {!shouldHideFooter && <Footer />}
    </div>
  );
};
