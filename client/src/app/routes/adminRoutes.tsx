import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/common/contexts/AuthContext';
import { canAccessAdminPath, getAdminLandingPath } from '@/common/utils/adminAccess';

const loadDashboard = () => import('@/admin/pages/Dashboard').then((m) => ({ default: m.Dashboard }));
const loadProducts = () => import('@/admin/pages/Products').then((m) => ({ default: m.Products }));
const loadCreateProduct = () => import('@/admin/pages/CreateProduct').then((m) => ({ default: m.CreateProduct }));
const loadEditProduct = () => import('@/admin/pages/EditProduct').then((m) => ({ default: m.EditProduct }));
const loadCategories = () => import('@/admin/pages/Categories').then((m) => ({ default: m.Categories }));
const loadOrders = () => import('@/admin/pages/Orders').then((m) => ({ default: m.Orders }));
const loadOrderDetail = () => import('@/admin/pages/OrderDetail').then((m) => ({ default: m.OrderDetail }));
const loadReturns = () => import('@/admin/pages/Returns').then((m) => ({ default: m.Returns }));
const loadCustomers = () => import('@/admin/pages/Customers').then((m) => ({ default: m.Customers }));
const loadAnalytics = () => import('@/admin/pages/Analytics').then((m) => ({ default: m.Analytics }));
const loadCoupons = () => import('@/admin/pages/Coupons').then((m) => ({ default: m.Coupons }));
const loadRoles = () => import('@/admin/pages/Roles').then((m) => ({ default: m.Roles }));
const loadRestock = () => import('@/admin/pages/Restock').then((m) => ({ default: m.Restock }));
const loadTracking = () => import('@/admin/pages/Tracking').then((m) => ({ default: m.Tracking }));

const Dashboard = React.lazy(loadDashboard);
const Products = React.lazy(loadProducts);
const CreateProduct = React.lazy(loadCreateProduct);
const EditProduct = React.lazy(loadEditProduct);
const Categories = React.lazy(loadCategories);
const Orders = React.lazy(loadOrders);
const OrderDetail = React.lazy(loadOrderDetail);
const Returns = React.lazy(loadReturns);
const Customers = React.lazy(loadCustomers);
const Analytics = React.lazy(loadAnalytics);
const Coupons = React.lazy(loadCoupons);
const Roles = React.lazy(loadRoles);
const Restock = React.lazy(loadRestock);
const Tracking = React.lazy(loadTracking);

const AdminRouteAccessGate: React.FC<{ path: string; children: React.ReactNode }> = ({ path, children }) => {
  const { isInitialized, user } = useAuth();

  if (!isInitialized) {
    return null;
  }

  if (canAccessAdminPath(path, user?.roles)) {
    return <>{children}</>;
  }

  return <Navigate to={getAdminLandingPath(user?.roles)} replace />;
};

const withAdminRouteAccess = (path: string, element: React.ReactNode) => (
  <AdminRouteAccessGate path={path}>{element}</AdminRouteAccessGate>
);

export const adminRoutes = [
  { path: '/admin', element: withAdminRouteAccess('/admin', <Dashboard />) },
  { path: '/admin/products', element: withAdminRouteAccess('/admin/products', <Products />) },
  { path: '/admin/products/create', element: withAdminRouteAccess('/admin/products/create', <CreateProduct />) },
  { path: '/admin/products/:id/edit', element: withAdminRouteAccess('/admin/products/:id/edit', <EditProduct />) },
  { path: '/admin/categories', element: withAdminRouteAccess('/admin/categories', <Categories />) },
  { path: '/admin/orders', element: withAdminRouteAccess('/admin/orders', <Orders />) },
  { path: '/admin/orders/:id', element: withAdminRouteAccess('/admin/orders/:id', <OrderDetail />) },
  { path: '/admin/returns', element: withAdminRouteAccess('/admin/returns', <Returns />) },
  { path: '/admin/customers', element: withAdminRouteAccess('/admin/customers', <Customers />) },
  { path: '/admin/analytics', element: withAdminRouteAccess('/admin/analytics', <Analytics />) },
  { path: '/admin/coupons', element: withAdminRouteAccess('/admin/coupons', <Coupons />) },
  { path: '/admin/roles', element: withAdminRouteAccess('/admin/roles', <Roles />) },
  { path: '/admin/restock', element: withAdminRouteAccess('/admin/restock', <Restock />) },
  { path: '/admin/tracking', element: withAdminRouteAccess('/admin/tracking', <Tracking />) },
];

type RoutePreloader = {
  match: (path: string) => boolean;
  load: () => Promise<unknown>;
};

const normalizePath = (path: string): string => {
  const withoutQuery = path.split(/[?#]/)[0];
  if (!withoutQuery) return '/';
  const trimmed = withoutQuery.replace(/\/+$/, '');
  return trimmed || '/';
};

const routePreloaders: RoutePreloader[] = [
  { match: (path) => path === '/admin', load: loadDashboard },
  { match: (path) => path === '/admin/products', load: loadProducts },
  { match: (path) => path === '/admin/products/create', load: loadCreateProduct },
  { match: (path) => path.startsWith('/admin/products/') && path.endsWith('/edit'), load: loadEditProduct },
  { match: (path) => path === '/admin/categories', load: loadCategories },
  { match: (path) => path === '/admin/orders', load: loadOrders },
  { match: (path) => path.startsWith('/admin/orders/'), load: loadOrderDetail },
  { match: (path) => path === '/admin/returns', load: loadReturns },
  { match: (path) => path === '/admin/customers', load: loadCustomers },
  { match: (path) => path === '/admin/analytics', load: loadAnalytics },
  { match: (path) => path === '/admin/coupons', load: loadCoupons },
  { match: (path) => path === '/admin/roles', load: loadRoles },
  { match: (path) => path === '/admin/restock', load: loadRestock },
  { match: (path) => path === '/admin/tracking', load: loadTracking },
];

export const preloadAdminRoute = (path: string): void => {
  const normalizedPath = normalizePath(path);
  for (const preloader of routePreloaders) {
    if (!preloader.match(normalizedPath)) continue;
    void preloader.load();
    break;
  }
};
