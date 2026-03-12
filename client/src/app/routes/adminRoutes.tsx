import React from 'react';

const Dashboard = React.lazy(() => import('@/admin/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Products = React.lazy(() => import('@/admin/pages/Products').then((m) => ({ default: m.Products })));
const CreateProduct = React.lazy(() => import('@/admin/pages/CreateProduct').then((m) => ({ default: m.CreateProduct })));
const EditProduct = React.lazy(() => import('@/admin/pages/EditProduct').then((m) => ({ default: m.EditProduct })));
const Orders = React.lazy(() => import('@/admin/pages/Orders').then((m) => ({ default: m.Orders })));
const AdminOrderDetail = React.lazy(() => import('@/admin/pages/OrderDetail').then((m) => ({ default: m.OrderDetail })));
const AdminTracking = React.lazy(() => import('@/admin/pages/Tracking').then((m) => ({ default: m.Tracking })));
const Customers = React.lazy(() => import('@/admin/pages/Customers').then((m) => ({ default: m.Customers })));
const Analytics = React.lazy(() => import('@/admin/pages/Analytics').then((m) => ({ default: m.Analytics })));
const Restock = React.lazy(() => import('@/admin/pages/Restock').then((m) => ({ default: m.Restock })));
const Categories = React.lazy(() => import('@/admin/pages/Categories').then((m) => ({ default: m.Categories })));
const Coupons = React.lazy(() => import('@/admin/pages/Coupons').then((m) => ({ default: m.Coupons })));
const Roles = React.lazy(() => import('@/admin/pages/Roles').then((m) => ({ default: m.Roles })));
const Returns = React.lazy(() => import('@/admin/pages/Returns').then((m) => ({ default: m.Returns })));
const Warehouses = React.lazy(() => import('@/admin/pages/Warehouses'));

export const adminRoutes = [
  { path: '/admin', element: <Dashboard /> },
  { path: '/admin/products', element: <Products /> },
  { path: '/admin/products/create', element: <CreateProduct /> },
  { path: '/admin/products/:id/edit', element: <EditProduct /> },
  { path: '/admin/orders', element: <Orders /> },
  { path: '/admin/orders/:id', element: <AdminOrderDetail /> },
  { path: '/admin/tracking', element: <AdminTracking /> },
  { path: '/admin/customers', element: <Customers /> },
  { path: '/admin/analytics', element: <Analytics /> },
  { path: '/admin/restock', element: <Restock /> },
  { path: '/admin/categories', element: <Categories /> },
  { path: '/admin/coupons', element: <Coupons /> },
  { path: '/admin/roles', element: <Roles /> },
  { path: '/admin/returns', element: <Returns /> },
  { path: '/admin/warehouses', element: <Warehouses /> },
];
