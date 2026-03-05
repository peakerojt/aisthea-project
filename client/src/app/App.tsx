import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ViewState, CategoryType, CartItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { AdminSidebar } from '../components/AdminSidebar';
import { StoreHome } from '../pages/StoreHome';
import { StoreCategory } from '../pages/StoreCategory';
import { StoreCollection } from '../pages/StoreCollection';
import { ProductDetail } from '../pages/ProductDetail';
import { ShoppingBag } from '../pages/ShoppingBag';
import { StoreStylist } from '../pages/StoreStylist';
import { StoreProfile } from '../pages/StoreProfile';
import { StoreMyOrders } from '../pages/StoreMyOrders';
import Checkout from '../pages/Checkout';
import OrderSuccess from '../pages/OrderSuccess';
import PaymentQR from '../pages/PaymentQR';
import { AdminDashboard } from '../pages/AdminDashboard';
import { AdminProducts } from '../pages/AdminProducts';
import { AdminCreateProduct } from '../pages/AdminCreateProduct';
import { AdminEditProduct } from '../pages/AdminEditProduct';
import { AdminOrders } from '../pages/AdminOrders';
import { AdminOrderDetail } from '../pages/AdminOrderDetail';
import { AdminTracking } from '../pages/AdminTracking';
import { AdminCustomers } from '../pages/AdminCustomers';
import { AdminAnalytics } from '../pages/AdminAnalytics';
import { AdminRestock } from '../pages/AdminRestock';
import { AdminCategories } from '../pages/AdminCategories';
import { AdminCoupons } from '../pages/AdminCoupons';
import { AdminRoles } from '../pages/AdminRoles';
import { AdminReturns } from '../pages/AdminReturns';

import { Login } from '../pages/Login';
import { Signup } from '../pages/Signup';
import { OAuthCallback } from '../pages/OAuthCallback';
import { EmailVerification } from '../pages/EmailVerification';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { fetchCartApi as fetchCart, addToCartApi, updateCartItemApi, removeCartItemApi, getGuestCart, saveGuestCart } from '../services/cart.service';
import { getCloudinaryProductCard } from '../utils/cloudinary';
import { useCart } from '../contexts/CartContext';

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
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editProductId, setEditProductId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Wrapper to also capture productId/orderId when navigating to those pages
  const handleSetView = (v: ViewState, id?: number) => {
    if (v === 'ADMIN_EDIT_PRODUCT' && id !== undefined) {
      setEditProductId(id);
    }
    if (v === 'ADMIN_ORDER_DETAIL' && id !== undefined) {
      setSelectedOrderId(id);
    }
    setView(v);
  };

  // Handle URL routing on page load
  useEffect(() => {
    const url = new URL(window.location.href);
    const pathname = url.pathname;

    // Check for OAuth callback
    if (pathname.includes('auth/callback')) {
      setView('AUTH_CALLBACK');
    }

    // Check for Reset Password
    if (pathname.includes('/reset-password')) {
      setView('AUTH_RESET_PASSWORD');
    }

    // Check for product navigation from order detail page
    const productIdParam = url.searchParams.get('productId');
    if (productIdParam) {
      const productId = parseInt(productIdParam, 10);
      if (!isNaN(productId)) {
        import('../services/product.service').then(({ fetchProductById }) => {
          fetchProductById(productId).then((product) => {
            if (product) {
              setSelectedProduct(product);
              setView('STORE_DETAIL');
              // Clean up the URL param without page reload
              const cleanUrl = new URL(window.location.href);
              cleanUrl.searchParams.delete('productId');
              window.history.replaceState({}, '', cleanUrl.toString());
            }
          }).catch(() => { });
        });
      }
    }
  }, []);

  // ── Reactive: switch view when location.state.initialView changes (SPA back-nav) ──
  useEffect(() => {
    const locState = location.state as { initialView?: string } | null;
    if (locState?.initialView) {
      setView(locState.initialView as ViewState);
      // Clear state so re-renders don’t re-trigger
      window.history.replaceState({ ...window.history.state, usr: null }, '');
    }
  }, [location.state]);

  // State để chứa danh sách sản phẩm lấy từ Database
  const [dbProducts, setDbProducts] = useState<any[]>([]);

  // Gọi API lấy sản phẩm từ SQL Server khi App khởi chạy
  useEffect(() => {
    fetch('http://localhost:5000/api/products')
      .then((res) => res.json())
      .then((data) => {

        setDbProducts(data);
      })
      .catch((err) => {
        console.error("Lỗi kết nối Backend:", err);
        // Fallback to empty array on error so UI doesn't break
        setDbProducts([]);
      });
  }, []);

  // Protected Route Logic
  useEffect(() => {
    const isAdminView = view.startsWith('ADMIN_') && view !== 'ADMIN_TRACKING';
    if (isAdminView && role !== 'admin') {
      setView('AUTH_LOGIN');
    }
  }, [view, role]);

  // Cart State (Now synced with CartContext)
  const { items: contextItems, updateItem, removeItem: removeContextItem } = useCart();
  const { user } = useAuth();

  // Map CartContext items to legacy App.tsx CartItem format
  const cart: CartItem[] = useMemo(() => {
    return contextItems.map((item: any) => ({
      cartItemId: item.cartItemId, // Only exists for DB items
      id: (item.cartItemId || item.variantId).toString(),
      productId: item.variant?.product?.productId?.toString() || '',
      variantId: item.variantId,
      name: item.variant?.product?.name || item.productName || 'Sản phẩm',
      price: Number(item.variant?.price || item.price || 0),
      image: item.variant ? getCloudinaryProductCard(item.variant.product.images?.[0]?.imageUrl || '') : (item.imageUrl || ''),
      color: item.variant?.variantAttributes?.find((a: any) => a.value.attribute.name === 'Color' || a.value.attribute.name === 'Màu' || a.value.attribute.name === 'Màu sắc')?.value.value || 'N/A',
      size: item.variant?.variantAttributes?.find((a: any) => a.value.attribute.name === 'Size' || a.value.attribute.name === 'Kích thước')?.value.value || 'N/A',
      quantity: item.quantity,
      ref: item.variant?.sku || ''
    }));
  }, [contextItems]);

  const addToCart = async (item: CartItem) => {
    // Legacy addToCart is barely used now (ProductDetail has its own), but we keep it functional
    console.warn("App.addToCart called. Consider using CartContext.addItem directly.");
  };

  const updateQuantity = async (itemId: string, delta: number) => {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;

    // DB item uses cartItemId, guest item uses variantId
    const targetId = item.cartItemId || item.variantId;
    if (!targetId) return;

    try {
      const newQty = Math.max(1, item.quantity + delta);
      await updateItem(targetId, newQty);
    } catch (error) {
      console.error('Update quantity failed:', error);
    }
  };

  const removeItem = async (itemId: string) => {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;

    const targetId = item.cartItemId || item.variantId;
    if (!targetId) return;

    try {
      await removeContextItem(targetId);
    } catch (error) {
      console.error('Remove item failed:', error);
    }
  };

  const handleCategoryClick = (category: CategoryType) => {
    setActiveCategory(category);
    setView('STORE_CATEGORY');
  };

  const handleCollectionClick = (collection: string) => {
    setActiveCollection(collection);
    setView('STORE_COLLECTION');
  };

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setView('STORE_DETAIL');
  };

  const isAdminView = view.startsWith('ADMIN_') && view !== 'ADMIN_TRACKING';

  if (isAdminView && role !== 'admin') {
    return null;
  }

  if (isAdminView) {
    return (
      <div className="flex h-screen w-full bg-bg-dark text-white font-sans overflow-hidden">
        <AdminSidebar currentView={view} setView={setView} />
        <main className="flex-1 h-full overflow-y-auto bg-bg-dark relative">
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
        </main>

      </div>
    );
  }

  return (
    <div className="text-white font-sans antialiased">
      {/* Bạn có thể truyền dbProducts vào các component con ở đây nếu muốn hiển thị dữ liệu thật */}
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
    </div>
  );
};

export default App;