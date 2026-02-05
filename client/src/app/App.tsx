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
import { AdminDashboard } from '../pages/AdminDashboard';
import { AdminProducts } from '../pages/AdminProducts';
import { AdminCreateProduct } from '../pages/AdminCreateProduct';
import { AdminOrders } from '../pages/AdminOrders';
import { AdminTracking } from '../pages/AdminTracking';
import { AdminCustomers } from '../pages/AdminCustomers';
import { AdminAnalytics } from '../pages/AdminAnalytics';
import { AdminRestock } from '../pages/AdminRestock';
import { Login } from '../pages/Login';
import { Signup } from '../pages/Signup';
import { OAuthCallback } from '../pages/OAuthCallback';

const App: React.FC = () => {
  const { role } = useAuth();
  const [view, setView] = useState<ViewState>('STORE_HOME');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('Men');
  const [activeCollection, setActiveCollection] = useState<string>('Outerwear');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

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

  // Cart State (Giữ nguyên dữ liệu mẫu để hiển thị UI)
  const [cart, setCart] = useState<CartItem[]>([
    { id: 'item-1', name: 'Midnight Silk Trench', ref: '892-3301-BLK', price: 850, image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=500&auto=format&fit=crop', color: 'Onyx', size: 'M', quantity: 1 },
    { id: 'item-2', name: 'Ankle Chelsea Boot', ref: '442-9921-LTH', price: 420, image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=500&auto=format&fit=crop', color: 'Black', size: '42', quantity: 1 }
  ]);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.size === item.size && i.color === item.color);
      if (existing) {
        return prev.map(i => (i === existing ? { ...i, quantity: i.quantity + item.quantity } : i));
      }
      return [...prev, item];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
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
          {view === 'ADMIN_PRODUCTS' && <AdminProducts setView={setView} />}
          {view === 'ADMIN_CREATE_PRODUCT' && <AdminCreateProduct setView={setView} />}
          {view === 'ADMIN_RESTOCK' && <AdminRestock />}
          {view === 'ADMIN_ORDERS' && <AdminOrders />}
          {view === 'ADMIN_CUSTOMERS' && <AdminCustomers />}
          {view === 'ADMIN_ANALYTICS' && <AdminAnalytics />}
        </main>
      </div>
    );
  }

  return (
    <div className="text-white font-sans antialiased">
      {/* Bạn có thể truyền dbProducts vào các component con ở đây nếu muốn hiển thị dữ liệu thật */}
      {view === 'STORE_HOME' && <StoreHome setView={setView} setCategory={handleCategoryClick} setCollection={handleCollectionClick} onProductClick={handleProductClick} />}
      {view === 'STORE_CATEGORY' && <StoreCategory setView={setView} category={activeCategory} setCategory={handleCategoryClick} setCollection={handleCollectionClick} onProductClick={handleProductClick} />}
      {view === 'STORE_COLLECTION' && <StoreCollection setView={setView} category={activeCategory} setCategory={handleCategoryClick} collection={activeCollection} onProductClick={handleProductClick} />}
      {view === 'STORE_DETAIL' && <ProductDetail setView={setView} setCategory={handleCategoryClick} addToCart={addToCart} cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} product={selectedProduct} />}
      {view === 'STORE_CART' && <ShoppingBag setView={setView} setCategory={handleCategoryClick} cart={cart} updateQuantity={updateQuantity} removeItem={removeItem} />}
      {view === 'STORE_STYLIST' && <StoreStylist setView={setView} setCategory={handleCategoryClick} onProductClick={handleProductClick} />}
      {view === 'STORE_PROFILE' && <StoreProfile setView={setView} setCategory={handleCategoryClick} />}
      {view === 'AUTH_LOGIN' && <Login setView={setView} />}
      {view === 'AUTH_SIGNUP' && <Signup setView={setView} />}
      {view === 'AUTH_CALLBACK' && <OAuthCallback setView={setView} />}
      {view === 'ADMIN_TRACKING' && <AdminTracking setView={setView} setCategory={handleCategoryClick} />}
    </div>
  );
};

export default App;