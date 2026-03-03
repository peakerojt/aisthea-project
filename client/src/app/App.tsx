import React, { useState, useEffect } from 'react';
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

import { Login } from '../pages/Login';
import { Signup } from '../pages/Signup';
import { OAuthCallback } from '../pages/OAuthCallback';
import { EmailVerification } from '../pages/EmailVerification';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { fetchCart, addToCartApi, updateCartItemApi, removeCartItemApi } from '../services/cart.service';
import { getCloudinaryProductCard } from '../utils/cloudinary';

const App: React.FC = () => {
  const { role } = useAuth();
  const [view, setView] = useState<ViewState>('STORE_HOME');
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
  }, []);

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

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const { user } = useAuth();

  const syncCart = async () => {
    if (!user) {
      setCart([]);
      return;
    }
    try {
      const dbCart = await fetchCart();
      const mappedItems: CartItem[] = dbCart.items.map(item => ({
        cartItemId: item.cartItemId,
        id: item.cartItemId.toString(), // Luôn sử dụng cartItemId làm ID duy nhất ở frontend
        productId: item.variant.product.productId.toString(),
        variantId: item.variantId,
        name: item.variant.product.name,
        price: Number(item.variant.price),
        image: getCloudinaryProductCard(item.variant.product.images[0]?.imageUrl || ''),
        color: item.variant.variantAttributes.find(a => a.value.attribute.name === 'Color' || a.value.attribute.name === 'Màu' || a.value.attribute.name === 'Màu sắc')?.value.value || 'N/A',
        size: item.variant.variantAttributes.find(a => a.value.attribute.name === 'Size' || a.value.attribute.name === 'Kích thước')?.value.value || 'N/A',
        quantity: item.quantity,
        ref: item.variant.sku
      }));
      setCart(mappedItems);
    } catch (error) {
      console.error('Failed to sync cart:', error);
    }
  };

  useEffect(() => {
    syncCart();
  }, [user]);

  const addToCart = async (item: CartItem) => {
    if (!user) {
      setView('AUTH_LOGIN');
      return;
    }
    try {
      if (item.variantId) {
        await addToCartApi(item.variantId, item.quantity);
        await syncCart();
      } else {
        console.error('Missing variantId for add to cart');
      }
    } catch (error) {
      console.error('Add to cart failed:', error);
    }
  };

  const updateQuantity = async (itemId: string, delta: number) => {
    const item = cart.find(i => i.id === itemId);
    if (!item || !item.cartItemId) return;

    try {
      const newQty = Math.max(1, item.quantity + delta);
      await updateCartItemApi(item.cartItemId, newQty);
      await syncCart();
    } catch (error) {
      console.error('Update quantity failed:', error);
    }
  };

  const removeItem = async (itemId: string) => {
    const item = cart.find(i => i.id === itemId);
    if (!item || !item.cartItemId) return;

    try {
      await removeCartItemApi(item.cartItemId);
      await syncCart();
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