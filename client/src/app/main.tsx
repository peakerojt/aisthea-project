import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AuthProvider } from '@/common/contexts/AuthContext';
import { CartProvider } from '@/common/contexts/CartContext';
import { ToastProvider } from '@/common/contexts/ToastContext';
import { AuthEventListener } from '@/app/AuthEventListener';
import '@/styles/index.css';
import '@/i18n/config';

const Spinner: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

type RouteTreeComponent = React.ComponentType;

const loadStoreRouteTree = async (): Promise<RouteTreeComponent> =>
  (await import('@/app/routes/StoreRouteTree')).StoreRouteTree;

const loadAdminRouteTree = async (): Promise<RouteTreeComponent> =>
  (await import('@/app/routes/AdminRouteTree')).AdminRouteTree;

const RouteTreeSwitch: React.FC = () => {
  const location = useLocation();
  const [RouteTree, setRouteTree] = React.useState<RouteTreeComponent | null>(null);
  const isAdminRoute = location.pathname.startsWith('/admin');

  React.useEffect(() => {
    let active = true;
    setRouteTree(null);

    const loadRouteTree = isAdminRoute ? loadAdminRouteTree : loadStoreRouteTree;
    void loadRouteTree().then((component) => {
      if (active) {
        setRouteTree(() => component);
      }
    });

    return () => {
      active = false;
    };
  }, [isAdminRoute]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const preloadOppositeRouteTree = () => {
      void (isAdminRoute ? loadStoreRouteTree() : loadAdminRouteTree());
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preloadOppositeRouteTree, { timeout: 1800 });
      return () => {
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = window.setTimeout(preloadOppositeRouteTree, 1400);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isAdminRoute]);

  if (!RouteTree) {
    return <Spinner />;
  }

  return <RouteTree />;
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

