import React, { Suspense } from 'react';
import { ViewState, CategoryType } from '@/types';
import { AdminLayout } from '@/admin/layouts/AdminLayout';

const Dashboard = React.lazy(() => import('@/admin/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Products = React.lazy(() => import('@/admin/pages/Products').then(m => ({ default: m.Products })));
const CreateProduct = React.lazy(() => import('@/admin/pages/CreateProduct').then(m => ({ default: m.CreateProduct })));
const EditProduct = React.lazy(() => import('@/admin/pages/EditProduct').then(m => ({ default: m.EditProduct })));
const Orders = React.lazy(() => import('@/admin/pages/Orders').then(m => ({ default: m.Orders })));
const OrderDetail = React.lazy(() => import('@/admin/pages/OrderDetail').then(m => ({ default: m.OrderDetail })));
const Tracking = React.lazy(() => import('@/admin/pages/Tracking').then(m => ({ default: m.Tracking })));
const Customers = React.lazy(() => import('@/admin/pages/Customers').then(m => ({ default: m.Customers })));
const Analytics = React.lazy(() => import('@/admin/pages/Analytics').then(m => ({ default: m.Analytics })));
const Restock = React.lazy(() => import('@/admin/pages/Restock').then(m => ({ default: m.Restock })));
const Categories = React.lazy(() => import('@/admin/pages/Categories').then(m => ({ default: m.Categories })));
const Coupons = React.lazy(() => import('@/admin/pages/Coupons').then(m => ({ default: m.Coupons })));
const Roles = React.lazy(() => import('@/admin/pages/Roles').then(m => ({ default: m.Roles })));
const Returns = React.lazy(() => import('@/admin/pages/Returns').then(m => ({ default: m.Returns })));
const Warehouses = React.lazy(() => import('@/admin/pages/Warehouses'));

interface AdminRoutesProps {
    view: ViewState;
    setView: (v: ViewState) => void;
    handleSetView: (v: ViewState, id?: number) => void;
    editProductId: number | null;
    selectedOrderId: number | null;
    PageFallback: React.FC;
    handleCategoryClick: (c: CategoryType) => void;
}

export const AdminRoutes: React.FC<AdminRoutesProps> = ({
    view,
    setView,
    handleSetView,
    editProductId,
    selectedOrderId,
    PageFallback,
    handleCategoryClick,
}) => {
    return (
        <AdminLayout currentView={view} setView={setView}>
            <Suspense fallback={<PageFallback />}>
                {view === 'ADMIN_DASHBOARD' && <Dashboard setView={setView} />}
                {view === 'ADMIN_PRODUCTS' && <Products setView={(v, id?: number) => handleSetView(v as ViewState, id)} />}
                {view === 'ADMIN_CREATE_PRODUCT' && <CreateProduct setView={setView} />}
                {view === 'ADMIN_EDIT_PRODUCT' && editProductId !== null && (
                    <EditProduct setView={setView} productId={editProductId} />
                )}
                {view === 'ADMIN_CATEGORIES' && <Categories setView={setView} />}
                {view === 'ADMIN_RESTOCK' && <Restock />}
                {view === 'ADMIN_ORDERS' && <Orders setView={(v, id?: number) => handleSetView(v as ViewState, id)} />}
                {view === 'ADMIN_ORDER_DETAIL' && <OrderDetail orderId={selectedOrderId} setView={setView} />}
                {view === 'ADMIN_CUSTOMERS' && <Customers />}
                {view === 'ADMIN_ANALYTICS' && <Analytics />}
                {view === 'ADMIN_COUPONS' && <Coupons />}
                {view === 'ADMIN_ROLES' && <Roles />}
                {view === 'ADMIN_RETURNS' && <Returns />}
                {view === 'ADMIN_WAREHOUSES' && <Warehouses />}
                {view === 'ADMIN_TRACKING' && <Tracking setView={setView} setCategory={handleCategoryClick} />}
            </Suspense>
        </AdminLayout>
    );
};
