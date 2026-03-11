import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { ViewState, CategoryType, CartItem, Product } from '@/types';
import { useAuth } from '@/common/contexts/AuthContext';
import { useCart } from '@/common/contexts/CartContext';
import { getCloudinaryProductCard } from '@/common/utils/cloudinary';

// ─── Eagerly loaded (critical path) ──────────────────────────────────────────
import { Sidebar } from '@/admin/components/Sidebar';
import { AdminLayout } from '@/admin/layouts/AdminLayout';
import { StoreLayout } from '@/store/layouts/StoreLayout';
import { Home } from '@/store/pages/Home';

// ─── Lazy loaded store pages ──────────────────────────────────────────────────
const Category = React.lazy(() => import('@/store/pages/Category').then(m => ({ default: m.Category })));
const Collection = React.lazy(() => import('@/store/pages/Collection').then(m => ({ default: m.Collection })));
const ProductDetail = React.lazy(() => import('@/common/pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const ShoppingBag = React.lazy(() => import('@/common/pages/ShoppingBag').then(m => ({ default: m.ShoppingBag })));
const Stylist = React.lazy(() => import('@/store/pages/Stylist').then(m => ({ default: m.Stylist })));
const Profile = React.lazy(() => import('@/store/pages/Profile').then(m => ({ default: m.Profile })));
const MyOrders = React.lazy(() => import('@/store/pages/MyOrders').then(m => ({ default: m.MyOrders })));
const Checkout = React.lazy(() => import('@/common/pages/Checkout'));
const OrderSuccess = React.lazy(() => import('@/common/pages/OrderSuccess'));
const PaymentQR = React.lazy(() => import('@/common/pages/PaymentQR'));

// ─── Lazy loaded auth pages ───────────────────────────────────────────────────
const Login = React.lazy(() => import('@/common/pages/Login').then(m => ({ default: m.Login })));
const Signup = React.lazy(() => import('@/common/pages/Signup').then(m => ({ default: m.Signup })));
const OAuthCallback = React.lazy(() => import('@/common/pages/OAuthCallback').then(m => ({ default: m.OAuthCallback })));
const EmailVerification = React.lazy(() => import('@/common/pages/EmailVerification').then(m => ({ default: m.EmailVerification })));
const ForgotPasswordPage = React.lazy(() => import('@/common/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = React.lazy(() => import('@/common/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

// ─── Lazy loaded admin pages (heaviest — only admins ever see these) ──────────
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
        import('@/common/services/product.service').then(({ fetchProductById }) => {
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
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/products`)
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
        </Suspense>
      </AdminLayout>
    );
  }

  return (
    <StoreLayout>
      <Suspense fallback={<PageFallback />}>
        {view === 'STORE_HOME' && <Home setView={handleSetView} setCategory={handleCategoryClick} setCollection={handleCollectionClick} onProductClick={handleProductClick} setSearchTerm={setSearchTerm} />}
        {view === 'STORE_CATEGORY' && <Category setView={handleSetView} category={activeCategory} setCategory={handleCategoryClick} setCollection={handleCollectionClick} onProductClick={handleProductClick} setSearchTerm={setSearchTerm} />}
        {view === 'STORE_COLLECTION' && <Collection setView={handleSetView} category={activeCategory} setCategory={handleCategoryClick} collection={activeCollection} onProductClick={handleProductClick} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
        {view === 'STORE_DETAIL' && <ProductDetail setView={handleSetView} setCategory={handleCategoryClick} addToCart={addToCart} cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} product={selectedProduct} setSearchTerm={setSearchTerm} />}
        {view === 'STORE_CART' && <ShoppingBag setView={handleSetView} setCategory={handleCategoryClick} cart={cart} updateQuantity={updateQuantity} removeItem={removeItem} />}
        {view === 'STORE_STYLIST' && <Stylist setView={handleSetView} setCategory={handleCategoryClick} onProductClick={handleProductClick} />}
        {view === 'STORE_PROFILE' && <Profile setView={handleSetView} setCategory={handleCategoryClick} />}
        {view === 'STORE_MY_ORDERS' && <MyOrders setView={handleSetView} setCategory={handleCategoryClick} />}
        {view === 'STORE_CHECKOUT' && <Checkout setView={handleSetView} setCategory={handleCategoryClick} cart={cart} />}
        {view === 'STORE_ORDER_SUCCESS' && <OrderSuccess setView={handleSetView} setCategory={handleCategoryClick} />}
        {view === 'STORE_PAYMENT_QR' && <PaymentQR setView={handleSetView} totalAmount={cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + (cart.reduce((sum, item) => sum + item.price * item.quantity, 0) > 200 ? 0 : 15)} />}
        {view === 'AUTH_LOGIN' && <Login setView={setView} />}
        {view === 'AUTH_SIGNUP' && <Signup setView={setView} />}
        {view === 'AUTH_CALLBACK' && <OAuthCallback setView={setView} />}
        {view === 'AUTH_FORGOT_PASSWORD' && <ForgotPasswordPage setView={setView} />}
        {view === 'AUTH_RESET_PASSWORD' && <ResetPasswordPage setView={setView} />}
        {view === 'EMAIL_VERIFICATION' && <EmailVerification setView={setView} email={sessionStorage.getItem('pendingVerificationEmail') || undefined} />}
        {view === 'ADMIN_TRACKING' && <Tracking setView={setView} setCategory={handleCategoryClick} />}
      </Suspense>
    </StoreLayout>
  );
};

export default App;