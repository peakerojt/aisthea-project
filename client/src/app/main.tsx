import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AuthProvider } from '@/common/contexts/AuthContext';
import { CartProvider } from '@/common/contexts/CartContext';
import { ToastProvider } from '@/common/contexts/ToastContext';
import { AuthEventListener } from '@/app/AuthEventListener';
import { StoreRouteTree } from '@/app/routes/StoreRouteTree';
import '@/styles/index.css';
import '@/i18n/config';

const AdminRouteTree = React.lazy(() => import('@/app/routes/AdminRouteTree').then((module) => ({ default: module.AdminRouteTree })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

const RouteSpinner: React.FC = () => (
  <div className="flex h-full min-h-[200px] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
  </div>
);

const RouteTreeSwitch: React.FC = () => {
  const location = useLocation();
  if (!location.pathname.startsWith('/admin')) {
    return <StoreRouteTree />;
  }

  return (
    <React.Suspense fallback={<RouteSpinner />}>
      <AdminRouteTree />
    </React.Suspense>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AuthEventListener />
              <RouteTreeSwitch />
              <SpeedInsights />
            </BrowserRouter>
          </QueryClientProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>,
);

