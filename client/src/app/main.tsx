import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/common/contexts/AuthContext';
import { CartProvider } from '@/common/contexts/CartContext';
import { ToastProvider } from '@/common/contexts/ToastContext';
import { AdminGuard } from '@/common/components/AdminGuard';
import { StoreLayout } from '@/store/layouts/StoreLayout';
import { AdminLayout } from '@/admin/layouts/AdminLayout';
import { storeRoutes } from '@/app/routes/storeRoutes';
import { authRoutes } from '@/app/routes/authRoutes';
import { adminRoutes } from '@/app/routes/adminRoutes';
import '@/styles/index.css';
import '@/i18n/config';

const Spinner: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  </div>
);

const AuthEventListener: React.FC = () => {
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

const withRouteSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<Spinner />}>{element}</Suspense>
);

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AuthEventListener />
              <Routes>
                <Route element={<StoreLayout />}>
                  {storeRoutes.map(({ path, element }) => (
                    <Route key={`store-${path}`} path={path} element={withRouteSuspense(element)} />
                  ))}
                  {authRoutes.map(({ path, element }) => (
                    <Route key={`auth-${path}`} path={path} element={withRouteSuspense(element)} />
                  ))}
                </Route>

                <Route element={<AdminGuard />}>
                  <Route element={<AdminLayout />}>
                    {adminRoutes.map(({ path, element }) => (
                      <Route key={`admin-${path}`} path={path} element={withRouteSuspense(element)} />
                    ))}
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </QueryClientProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>,
);

