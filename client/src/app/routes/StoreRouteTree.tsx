import React, { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { StoreLayout } from '@/store/layouts/StoreLayout';
import { storeRoutes } from '@/app/routes/storeRoutes';
import { authRoutes } from '@/app/routes/authRoutes';
import i18n from '@/i18n/config';
import { getStoreNamespacesForPath, loadNamespaces } from '@/i18n/config';

const Spinner: React.FC = () => (
  <div className="flex h-full min-h-[200px] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
  </div>
);

const withRouteSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<Spinner />}>{element}</Suspense>
);

const hasNamespacesLoaded = (path: string) =>
  getStoreNamespacesForPath(path).every((namespace) => i18n.hasResourceBundle('vi', namespace));

export const StoreRouteTree: React.FC = () => {
  const location = useLocation();
  const [isReady, setIsReady] = React.useState(() => hasNamespacesLoaded(location.pathname));

  React.useEffect(() => {
    if (hasNamespacesLoaded(location.pathname)) {
      setIsReady(true);
      return undefined;
    }

    let active = true;
    setIsReady(false);

    void loadNamespaces(getStoreNamespacesForPath(location.pathname)).then(() => {
      if (active) {
        setIsReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [location.pathname]);

  if (!isReady) {
    return <Spinner />;
  }

  return (
    <Routes>
      <Route element={<StoreLayout />}>
        {storeRoutes.map(({ path, element }) => (
          <Route key={`store-${path}`} path={path} element={withRouteSuspense(element)} />
        ))}
        {authRoutes.map(({ path, element }) => (
          <Route key={`auth-${path}`} path={path} element={withRouteSuspense(element)} />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default StoreRouteTree;
