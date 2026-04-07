import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useMaterialSymbolsStylesheet } from '@/common/hooks/useMaterialSymbolsStylesheet';
import { Footer } from '@/store/components/Footer';

export const StoreLayout: React.FC = () => {
  const location = useLocation();
  const hideFooterPrefixes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/oauth'];
  const shouldHideFooter = hideFooterPrefixes.some((prefix) => location.pathname.startsWith(prefix));
  useMaterialSymbolsStylesheet(location.pathname === '/' ? 'idle' : 'immediate');

  useEffect(() => {
    const loadNonCriticalStyles = () => {
      void import('@/styles/non-critical.css');
    };

    if (typeof window === 'undefined') {
      return undefined;
    }

    if (location.pathname !== '/') {
      loadNonCriticalStyles();
      return undefined;
    }

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => {
        loadNonCriticalStyles();
      }, { timeout: 1200 });

      return () => {
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(loadNonCriticalStyles, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [location.pathname]);

  return (
    <div className="text-white font-sans antialiased min-h-screen bg-bg-dark flex flex-col overflow-x-hidden">
      <div className="flex-1">
        <Outlet />
      </div>
      {!shouldHideFooter && <Footer />}
    </div>
  );
};
