import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/common/contexts/AuthContext';
import { CartProvider } from '@/common/contexts/CartContext';
import { ToastProvider } from '@/common/contexts/ToastContext';
import { AdminGuard } from '@/common/components/AdminGuard';
import { StoreLayout } from '@/store/layouts/StoreLayout';
import { AdminLayout } from '@/admin/layouts/AdminLayout';
import '@/styles/index.css';
import '@/i18n/config';

// ─── Fallback spinner ─────────────────────────────────────────────────────────
const Spinner: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  </div>
);

// ─── Store pages ──────────────────────────────────────────────────────────────
const Home = React.lazy(() => import('@/store/pages/Home').then(m => ({ default: m.Home })));
const Category = React.lazy(() => import('@/store/pages/Category').then(m => ({ default: m.Category })));
const Collection = React.lazy(() => import('@/store/pages/Collection').then(m => ({ default: m.Collection })));
const ProductDetail = React.lazy(() => import('@/common/pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const ShoppingBag = React.lazy(() => import('@/common/pages/ShoppingBag').then(m => ({ default: m.ShoppingBag })));
const Stylist = React.lazy(() => import('@/store/pages/Stylist').then(m => ({ default: m.Stylist })));
const WeatherOutfitPage = React.lazy(() => import('@/store/pages/WeatherOutfitPage').then(m => ({ default: m.WeatherOutfitPage })));
const Profile = React.lazy(() => import('@/store/pages/Profile').then(m => ({ default: m.Profile })));
const MyOrdersPage = React.lazy(() => import('@/store/pages/MyOrders').then(m => ({ default: m.MyOrders })));
const Checkout = React.lazy(() => import('@/common/pages/Checkout'));
const OrderSuccess = React.lazy(() => import('@/common/pages/OrderSuccess'));
const PaymentQR = React.lazy(() => import('@/common/pages/PaymentQR'));
const OrderDetailPage = React.lazy(() => import('@/common/pages/OrderDetailPage').then(m => ({ default: m.OrderDetailPage })));
const CreateReturnPage = React.lazy(() => import('@/common/pages/CreateReturnPage').then(m => ({ default: m.CreateReturnPage })));
const TrackingLookupPage = React.lazy(() => import('@/common/pages/TrackingLookupPage').then(m => ({ default: m.TrackingLookupPage })));
const TrackingDetailPage = React.lazy(() => import('@/common/pages/TrackingDetailPage').then(m => ({ default: m.TrackingDetailPage })));
const VNPayReturn = React.lazy(() => import('@/common/pages/VNPayReturn').then(m => ({ default: m.VNPayReturn })));
const ItemsPage = React.lazy(() => import('@/common/pages/ItemsPage'));

// ─── Auth pages ───────────────────────────────────────────────────────────────
const Login = React.lazy(() => import('@/common/pages/Login').then(m => ({ default: m.Login })));
const Signup = React.lazy(() => import('@/common/pages/Signup').then(m => ({ default: m.Signup })));
const OAuthCallback = React.lazy(() => import('@/common/pages/OAuthCallback').then(m => ({ default: m.OAuthCallback })));
const EmailVerification = React.lazy(() => import('@/common/pages/EmailVerification').then(m => ({ default: m.EmailVerification })));
const ForgotPasswordPage = React.lazy(() => import('@/common/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = React.lazy(() => import('@/common/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

// ─── Admin pages ──────────────────────────────────────────────────────────────
const Dashboard = React.lazy(() => import('@/admin/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Products = React.lazy(() => import('@/admin/pages/Products').then(m => ({ default: m.Products })));
const CreateProduct = React.lazy(() => import('@/admin/pages/CreateProduct').then(m => ({ default: m.CreateProduct })));
const EditProduct = React.lazy(() => import('@/admin/pages/EditProduct').then(m => ({ default: m.EditProduct })));
const Orders = React.lazy(() => import('@/admin/pages/Orders').then(m => ({ default: m.Orders })));
const AdminOrderDetail = React.lazy(() => import('@/admin/pages/OrderDetail').then(m => ({ default: m.OrderDetail })));
const AdminTracking = React.lazy(() => import('@/admin/pages/Tracking').then(m => ({ default: m.Tracking })));
const Customers = React.lazy(() => import('@/admin/pages/Customers').then(m => ({ default: m.Customers })));
const Analytics = React.lazy(() => import('@/admin/pages/Analytics').then(m => ({ default: m.Analytics })));
const Restock = React.lazy(() => import('@/admin/pages/Restock').then(m => ({ default: m.Restock })));
const Categories = React.lazy(() => import('@/admin/pages/Categories').then(m => ({ default: m.Categories })));
const Coupons = React.lazy(() => import('@/admin/pages/Coupons').then(m => ({ default: m.Coupons })));
const Roles = React.lazy(() => import('@/admin/pages/Roles').then(m => ({ default: m.Roles })));
const Returns = React.lazy(() => import('@/admin/pages/Returns').then(m => ({ default: m.Returns })));
const Warehouses = React.lazy(() => import('@/admin/pages/Warehouses'));

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

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AuthEventListener />
              <Suspense fallback={<Spinner />}>
                <Routes>
                  {/* ── Store Routes ──────────────────────────────────────── */}
                  <Route element={<StoreLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/category/:gender" element={<Category />} />
                    <Route path="/collection" element={<Collection />} />
                    <Route path="/collection/:gender/:name" element={<Collection />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/cart" element={<ShoppingBag />} />
                    <Route path="/stylist" element={<Stylist />} />
                    <Route path="/weather-outfit" element={<WeatherOutfitPage />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/my-orders" element={<MyOrdersPage />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order-success" element={<OrderSuccess />} />
                    <Route path="/payment-qr" element={<PaymentQR />} />
                    <Route path="/orders/:id" element={<OrderDetailPage />} />
                    <Route path="/orders/:id/return" element={<CreateReturnPage />} />
                    <Route path="/tracking" element={<TrackingLookupPage />} />
                    <Route path="/tracking/:id" element={<TrackingDetailPage />} />
                    <Route path="/vnpay-return" element={<VNPayReturn />} />
                    <Route path="/items" element={<ItemsPage />} />
                    {/* ── Auth routes (no admin layout) ───────────────────── */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/auth/callback" element={<OAuthCallback />} />
                    <Route path="/email-verification" element={<EmailVerification />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                  </Route>

                  {/* ── Admin Routes (guarded) ────────────────────────────── */}
                  <Route element={<AdminGuard />}>
                    <Route element={<AdminLayout />}>
                      <Route path="/admin" element={<Dashboard />} />
                      <Route path="/admin/products" element={<Products />} />
                      <Route path="/admin/products/create" element={<CreateProduct />} />
                      <Route path="/admin/products/:id/edit" element={<EditProduct />} />
                      <Route path="/admin/orders" element={<Orders />} />
                      <Route path="/admin/orders/:id" element={<AdminOrderDetail />} />
                      <Route path="/admin/tracking" element={<AdminTracking />} />
                      <Route path="/admin/customers" element={<Customers />} />
                      <Route path="/admin/analytics" element={<Analytics />} />
                      <Route path="/admin/restock" element={<Restock />} />
                      <Route path="/admin/categories" element={<Categories />} />
                      <Route path="/admin/coupons" element={<Coupons />} />
                      <Route path="/admin/roles" element={<Roles />} />
                      <Route path="/admin/returns" element={<Returns />} />
                      <Route path="/admin/warehouses" element={<Warehouses />} />
                    </Route>
                  </Route>

                  {/* ── Fallback ──────────────────────────────────────────── */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </QueryClientProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>,
);
