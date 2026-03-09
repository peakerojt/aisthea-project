import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { ViewState, CategoryType, CartItem, Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { getCloudinaryProductCard } from '../utils/cloudinary';

// ─── Eagerly loaded (critical path) ──────────────────────────────────────────
import { AdminSidebar } from '../components/AdminSidebar';
import { StoreHome } from '../pages/StoreHome';

// ─── Lazy loaded store pages ──────────────────────────────────────────────────
const StoreCategory = React.lazy(() => import('../pages/StoreCategory').then(m => ({ default: m.StoreCategory })));
const StoreCollection = React.lazy(() => import('../pages/StoreCollection').then(m => ({ default: m.StoreCollection })));
const ProductDetail = React.lazy(() => import('../pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const ShoppingBag = React.lazy(() => import('../pages/ShoppingBag').then(m => ({ default: m.ShoppingBag })));
const StoreStylist = React.lazy(() => import('../pages/StoreStylist').then(m => ({ default: m.StoreStylist })));
const StoreProfile = React.lazy(() => import('../pages/StoreProfile').then(m => ({ default: m.StoreProfile })));
const StoreMyOrders = React.lazy(() => import('../pages/StoreMyOrders').then(m => ({ default: m.StoreMyOrders })));
const Checkout = React.lazy(() => import('../pages/Checkout'));
const OrderSuccess = React.lazy(() => import('../pages/OrderSuccess'));
const PaymentQR = React.lazy(() => import('../pages/PaymentQR'));

// ─── Lazy loaded auth pages ───────────────────────────────────────────────────
const Login = React.lazy(() => import('../pages/Login').then(m => ({ default: m.Login })));
const Signup = React.lazy(() => import('../pages/Signup').then(m => ({ default: m.Signup })));
const OAuthCallback = React.lazy(() => import('../pages/OAuthCallback').then(m => ({ default: m.OAuthCallback })));
const EmailVerification = React.lazy(() => import('../pages/EmailVerification').then(m => ({ default: m.EmailVerification })));
const ForgotPasswordPage = React.lazy(() => import('../pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = React.lazy(() => import('../pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

// ─── Lazy loaded admin pages (heaviest — only admins ever see these) ──────────
const AdminDashboard = React.lazy(() => import('../pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminProducts = React.lazy(() => import('../pages/AdminProducts').then(m => ({ default: m.AdminProducts })));
const AdminCreateProduct = React.lazy(() => import('../pages/AdminCreateProduct').then(m => ({ default: m.AdminCreateProduct })));
const AdminEditProduct = React.lazy(() => import('../pages/AdminEditProduct').then(m => ({ default: m.AdminEditProduct })));
const AdminOrders = React.lazy(() => import('../pages/AdminOrders').then(m => ({ default: m.AdminOrders })));
const AdminOrderDetail = React.lazy(() => import('../pages/AdminOrderDetail').then(m => ({ default: m.AdminOrderDetail })));
const AdminTracking = React.lazy(() => import('../pages/AdminTracking').then(m => ({ default: m.AdminTracking })));
const AdminCustomers = React.lazy(() => import('../pages/AdminCustomers').then(m => ({ default: m.AdminCustomers })));
const AdminAnalytics = React.lazy(() => import('../pages/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminRestock = React.lazy(() => import('../pages/AdminRestock').then(m => ({ default: m.AdminRestock })));
const AdminCategories = React.lazy(() => import('../pages/AdminCategories').then(m => ({ default: m.AdminCategories })));
const AdminCoupons = React.lazy(() => import('../pages/AdminCoupons').then(m => ({ default: m.AdminCoupons })));
const AdminRoles = React.lazy(() => import('../pages/AdminRoles').then(m => ({ default: m.AdminRoles })));
const AdminReturns = React.lazy(() => import('../pages/AdminReturns').then(m => ({ default: m.AdminReturns })));

// ─── Minimal fallback ─────────────────────────────────────────────────────────
const PageFallback = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  </div>
);

const App: React.FC = () => {
  const { role } = useAuth();
  // useLocation MUST be declared before useState so the lazy initializer
  // can read location.state synchronously — this eliminates the STORE_HOME flash.
  const location = useLocation();
  const [view, setView] = useState<ViewState>(() => {
    const locState = location.state as { initialView?: string } | null;
    if (locState?.initialView) return locState.initialView as ViewState;
    return 'STORE_HOME';
  });
  const [activeCategory, setActiveCategory] = useState<CategoryType>('Men');
  const [activeCollection, setActiveCollection] = useState<string>('Outerwear');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editProductId, setEditProductId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleSetView = (v: ViewState, id?: number) => {
    if (v === 'ADMIN_EDIT_PRODUCT' && id !== undefined) setEditProductId(id);
    if (v === 'ADMIN_ORDER_DETAIL' && id !== undefined) setSelectedOrderId(id);
    setView(v);
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const pathname = url.pathname;

    if (pathname.includes('auth/callback')) setView('AUTH_CALLBACK');
    if (pathname.includes('/reset-password')) setView('AUTH_RESET_PASSWORD');

    const productIdParam = url.searchParams.get('productId');
    if (productIdParam) {
      const productId = parseInt(productIdParam, 10);
      if (!isNaN(productId)) {
        import('../services/product.service').then(({ fetchProductById }) => {
          fetchProductById(productId).then((product) => {
            if (product) {
              setSelectedProduct(product as unknown as Product);
              setView('STORE_DETAIL');
              const cleanUrl = new URL(window.location.href);
              cleanUrl.searchParams.delete('productId');
              window.history.replaceState({}, '', cleanUrl.toString());
            }
          }).catch(() => { });
        });
      }
    }
  }, []);

  useEffect(() => {
    const locState = location.state as { initialView?: string } | null;
    if (locState?.initialView) {
      setView(locState.initialView as ViewState);
      window.history.replaceState({ ...window.history.state, usr: null }, '');
    }
  }, [location.state]);

  const [dbProducts, setDbProducts] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/products')
      .then((res) => res.json())
      .then((data) => { setDbProducts(data); })
      .catch(() => { setDbProducts([]); });
  }, []);

  useEffect(() => {
    const isAdminView = view.startsWith('ADMIN_') && view !== 'ADMIN_TRACKING';
    if (isAdminView && role !== 'admin') setView('AUTH_LOGIN');
  }, [view, role]);

  const { items: contextItems, updateItem, removeItem: removeContextItem } = useCart();
  const { user } = useAuth();

  const cart: CartItem[] = useMemo(() => {
    return contextItems.map((item) => {
      const itemRecord = item as Record<string, unknown>;
      const variant = itemRecord.variant as Record<string, unknown> | undefined;
      const product = variant?.product as Record<string, unknown> | undefined;
      const images = product?.images as { imageUrl: string }[] | undefined;
      const variantAttributes = variant?.variantAttributes as { value: { attribute: { name: string }, value: string } }[] | undefined;

      return {
        cartItemId: itemRecord.cartItemId as number | undefined,
        id: ((itemRecord.cartItemId || itemRecord.variantId) as number).toString(),
        productId: product?.productId?.toString() || '',
        variantId: itemRecord.variantId as number | undefined,
        name: (product?.name || itemRecord.productName || 'Sản phẩm') as string,
        price: Number(variant?.price || itemRecord.price || 0),
        image: variant ? getCloudinaryProductCard(images?.[0]?.imageUrl || '') : (itemRecord.imageUrl as string || ''),
        color: variantAttributes?.find((a) => ['Color', 'Màu', 'Màu sắc'].includes(a.value.attribute.name))?.value.value || 'N/A',
        size: variantAttributes?.find((a) => ['Size', 'Kích thước'].includes(a.value.attribute.name))?.value.value || 'N/A',
        quantity: itemRecord.quantity as number,
        ref: (variant?.sku as string) || ''
      };
    });
  }, [contextItems]);

  const addToCart = async (_item: CartItem) => { };

  const updateQuantity = async (itemId: string, delta: number) => {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    const targetId = item.cartItemId || item.variantId;
    if (!targetId) return;
    try {
      const newQty = Math.max(1, item.quantity + delta);
      await updateItem(targetId, newQty);
    } catch {
      alert('Có lỗi xảy ra khi cập nhật số lượng. Vui lòng kiểm tra lại số lượng tồn kho.');
    }
  };

  const removeItem = async (itemId: string) => {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    const targetId = item.cartItemId || item.variantId;
    if (!targetId) return;
    try {
      await removeContextItem(targetId);
    } catch { }
  };

  const handleCategoryClick = (category: CategoryType) => { setActiveCategory(category); setView('STORE_CATEGORY'); };
  const handleCollectionClick = (collection: string) => { setActiveCollection(collection); setView('STORE_COLLECTION'); };
  const handleProductClick = <T,>(product: T) => { setSelectedProduct(product as unknown as Product); setView('STORE_DETAIL'); };

  const isAdminView = view.startsWith('ADMIN_') && view !== 'ADMIN_TRACKING';

  if (isAdminView && role !== 'admin') return null;

  if (isAdminView) {
    return (
      <div className="flex h-screen w-full bg-bg-dark text-white font-sans overflow-hidden">
        <AdminSidebar currentView={view} setView={setView} />
        <main className="flex-1 h-full overflow-y-auto bg-bg-dark relative">
          <Suspense fallback={<PageFallback />}>
            {view === 'ADMIN_DASHBOARD' && <AdminDashboard setView={setView} />}
            {view === 'ADMIN_PRODUCTS' && <AdminProducts setView={(v, id?: number) => handleSetView(v as ViewState, id)} />}
            {view === 'ADMIN_CREATE_PRODUCT' && <AdminCreateProduct setView={setView} />}
            {view === 'ADMIN_EDIT_PRODUCT' && editProductId !== null && (
              <AdminEditProduct setView={setView} productId={editProductId} />
            )}
            {view === 'ADMIN_CATEGORIES' && <AdminCategories setView={setView} />}
            {view === 'ADMIN_RESTOCK' && <AdminRestock />}
            {view === 'ADMIN_ORDERS' && <AdminOrders setView={(v, id?: number) => handleSetView(v as ViewState, id)} />}
            {view === 'ADMIN_ORDER_DETAIL' && <AdminOrderDetail orderId={selectedOrderId} setView={setView} />}
            {view === 'ADMIN_CUSTOMERS' && <AdminCustomers />}
            {view === 'ADMIN_ANALYTICS' && <AdminAnalytics />}
            {view === 'ADMIN_COUPONS' && <AdminCoupons />}
            {view === 'ADMIN_ROLES' && <AdminRoles />}
            {view === 'ADMIN_RETURNS' && <AdminReturns />}
          </Suspense>
        </main>
      </div>
    );
  }

  return (
    <div className="text-white font-sans antialiased">
      <Suspense fallback={<PageFallback />}>
        {view === 'STORE_HOME' && <StoreHome setView={handleSetView} setCategory={handleCategoryClick} setCollection={handleCollectionClick} onProductClick={handleProductClick} setSearchTerm={setSearchTerm} />}
        {view === 'STORE_CATEGORY' && <StoreCategory setView={handleSetView} category={activeCategory} setCategory={handleCategoryClick} setCollection={handleCollectionClick} onProductClick={handleProductClick} setSearchTerm={setSearchTerm} />}
        {view === 'STORE_COLLECTION' && <StoreCollection setView={handleSetView} category={activeCategory} setCategory={handleCategoryClick} collection={activeCollection} onProductClick={handleProductClick} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
        {view === 'STORE_DETAIL' && <ProductDetail setView={handleSetView} setCategory={handleCategoryClick} addToCart={addToCart} cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} product={selectedProduct} setSearchTerm={setSearchTerm} />}
        {view === 'STORE_CART' && <ShoppingBag setView={handleSetView} setCategory={handleCategoryClick} cart={cart} updateQuantity={updateQuantity} removeItem={removeItem} />}
        {view === 'STORE_STYLIST' && <StoreStylist setView={handleSetView} setCategory={handleCategoryClick} onProductClick={handleProductClick} />}
        {view === 'STORE_PROFILE' && <StoreProfile setView={handleSetView} setCategory={handleCategoryClick} />}
        {view === 'STORE_MY_ORDERS' && <StoreMyOrders setView={handleSetView} setCategory={handleCategoryClick} />}
        {view === 'STORE_CHECKOUT' && <Checkout setView={handleSetView} setCategory={handleCategoryClick} cart={cart} />}
        {view === 'STORE_ORDER_SUCCESS' && <OrderSuccess setView={handleSetView} setCategory={handleCategoryClick} />}
        {view === 'STORE_PAYMENT_QR' && <PaymentQR setView={handleSetView} totalAmount={cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + (cart.reduce((sum, item) => sum + item.price * item.quantity, 0) > 200 ? 0 : 15)} />}
        {view === 'AUTH_LOGIN' && <Login setView={setView} />}
        {view === 'AUTH_SIGNUP' && <Signup setView={setView} />}
        {view === 'AUTH_CALLBACK' && <OAuthCallback setView={setView} />}
        {view === 'AUTH_FORGOT_PASSWORD' && <ForgotPasswordPage setView={setView} />}
        {view === 'AUTH_RESET_PASSWORD' && <ResetPasswordPage setView={setView} />}
        {view === 'EMAIL_VERIFICATION' && <EmailVerification setView={setView} email={sessionStorage.getItem('pendingVerificationEmail') || undefined} />}
        {view === 'ADMIN_TRACKING' && <AdminTracking setView={setView} setCategory={handleCategoryClick} />}
      </Suspense>
    </div>
  );
};

export default App;