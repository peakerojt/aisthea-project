import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ViewState, CategoryType, CartItem, Product } from '@/types';
import type { SupportSection } from '@/store/pages/SupportPage';
import { useAuth } from '@/common/contexts/AuthContext';
import { useCart } from '@/common/contexts/CartContext';
import { useToast } from '@/common/contexts/ToastContext';
import { getCloudinaryProductCard } from '@/common/utils/cloudinary';

import { AdminRoutes } from '@/admin/routes';
import { StorefrontRoutes } from '@/store/routes';

// ─── Minimal fallback ─────────────────────────────────────────────────────────
const PageFallback = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  </div>
);

const App: React.FC = () => {
  const { role, isInitialized } = useAuth();
  const { showToast } = useToast();
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
  const [activeSupportSection, setActiveSupportSection] = useState<SupportSection>('how-to-buy');

  const handleSupportClick = (section: SupportSection) => {
    setActiveSupportSection(section);
    setView('STORE_SUPPORT');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        color: variantAttributes?.find((a) => ['Color', 'Màu', 'Màu sắc'].includes(a.value.attribute.name))?.value.value || (itemRecord.color as string) || 'N/A',
        size: variantAttributes?.find((a) => ['Size', 'Kích thước'].includes(a.value.attribute.name))?.value.value || (itemRecord.size as string) || 'N/A',
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
      showToast({ type: 'error', title: 'Có lỗi xảy ra khi cập nhật số lượng. Vui lòng kiểm tra lại số lượng tồn kho.' });
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

  // Block render until the session check resolves — prevents auth flicker
  if (!isInitialized) return <PageFallback />;

  // Synchronous guard — no useEffect redirect race condition
  if (isAdminView && role !== 'admin') {
    return (
      <StorefrontRoutes
        view="AUTH_LOGIN"
        setView={setView}
        handleSetView={handleSetView}
        PageFallback={PageFallback}
        activeCategory={activeCategory}
        handleCategoryClick={handleCategoryClick}
        activeCollection={activeCollection}
        handleCollectionClick={handleCollectionClick}
        selectedProduct={selectedProduct}
        handleProductClick={handleProductClick}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        cart={cart}
        addToCart={addToCart}
        updateQuantity={updateQuantity}
        removeItem={removeItem}
        handleSupportClick={handleSupportClick}
      />
    );
  }

  if (isAdminView) {
    return (
      <AdminRoutes
        view={view}
        setView={setView}
        handleSetView={handleSetView}
        editProductId={editProductId}
        selectedOrderId={selectedOrderId}
        PageFallback={PageFallback}
        handleCategoryClick={handleCategoryClick}
      />
    );
  }

  return (
    <StorefrontRoutes
      view={view}
      setView={setView}
      handleSetView={handleSetView}
      PageFallback={PageFallback}
      activeCategory={activeCategory}
      handleCategoryClick={handleCategoryClick}
      activeCollection={activeCollection}
      handleCollectionClick={handleCollectionClick}
      selectedProduct={selectedProduct}
      handleProductClick={handleProductClick}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      cart={cart}
      addToCart={addToCart}
      updateQuantity={updateQuantity}
      removeItem={removeItem}
      handleSupportClick={handleSupportClick}
    />
  );
};

export default App;
