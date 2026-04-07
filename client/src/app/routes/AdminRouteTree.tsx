import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminGuard } from '@/common/components/AdminGuard';
import { AdminLayout } from '@/admin/layouts/AdminLayout';
import { adminRoutes } from '@/app/routes/adminRoutes';
import { adminNamespaces, loadNamespaces } from '@/i18n/config';

const Spinner: React.FC = () => (
  <div className="flex h-full min-h-[200px] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
  </div>
);

const withRouteSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<Spinner />}>{element}</Suspense>
);

export const AdminRouteTree: React.FC = () => {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setIsReady(false);

    void loadNamespaces(adminNamespaces).then(() => {
      if (active) {
        setIsReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (!isReady) {
    return <Spinner />;
  }

  return (
    <Routes>
      <Route element={<AdminGuard />}>
        <Route element={<AdminLayout />}>
          {adminRoutes.map(({ path, element }) => (
            <Route key={`admin-${path}`} path={path} element={withRouteSuspense(element)} />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AdminRouteTree;
