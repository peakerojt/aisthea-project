import React, { Suspense, useState } from 'react';
import { ViewState, CategoryType, Product, CartItem } from '@/types';
import { StoreLayout } from '@/store/layouts/StoreLayout';

const Home = React.lazy(() => import('@/store/pages/Home').then(m => ({ default: m.Home })));
const Category = React.lazy(() => import('@/store/pages/Category').then(m => ({ default: m.Category })));
const Collection = React.lazy(() => import('@/store/pages/Collection').then(m => ({ default: m.Collection })));
const ProductDetail = React.lazy(() => import('@/common/pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const ShoppingBag = React.lazy(() => import('@/common/pages/ShoppingBag').then(m => ({ default: m.ShoppingBag })));
const Stylist = React.lazy(() => import('@/store/pages/Stylist').then(m => ({ default: m.Stylist })));
const SupportPage = React.lazy(() => import('@/store/pages/SupportPage').then(m => ({ default: m.SupportPage })));

const WeatherOutfitPage = React.lazy(() => import('@/store/pages/WeatherOutfitPage').then(m => ({ default: m.WeatherOutfitPage })));
const Profile = React.lazy(() => import('@/store/pages/Profile').then(m => ({ default: m.Profile })));
const MyOrders = React.lazy(() => import('@/store/pages/MyOrders').then(m => ({ default: m.MyOrders })));
const Checkout = React.lazy(() => import('@/common/pages/Checkout'));
const OrderSuccess = React.lazy(() => import('@/common/pages/OrderSuccess'));
const PaymentQR = React.lazy(() => import('@/common/pages/PaymentQR'));

const Login = React.lazy(() => import('@/common/pages/Login').then(m => ({ default: m.Login })));
const Signup = React.lazy(() => import('@/common/pages/Signup').then(m => ({ default: m.Signup })));
const OAuthCallback = React.lazy(() => import('@/common/pages/OAuthCallback').then(m => ({ default: m.OAuthCallback })));
const EmailVerification = React.lazy(() => import('@/common/pages/EmailVerification').then(m => ({ default: m.EmailVerification })));
const ForgotPasswordPage = React.lazy(() => import('@/common/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = React.lazy(() => import('@/common/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));

interface StorefrontRoutesProps {
    view: ViewState;
    setView: (v: ViewState) => void;
    handleSetView: (v: ViewState, id?: number) => void;
    PageFallback: React.FC;
    activeCategory: CategoryType;
    handleCategoryClick: (category: CategoryType) => void;
    activeCollection: string;
    handleCollectionClick: (collection: string) => void;
    selectedProduct: Product | null;
    handleProductClick: <T>(product: T) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    cart: CartItem[];
    addToCart: (item: CartItem) => Promise<void>;
    updateQuantity: (itemId: string, delta: number) => Promise<void>;
    removeItem: (itemId: string) => Promise<void>;
    activeSupportSection?: import('@/store/pages/SupportPage').SupportSection;
    handleSupportClick: (section: import('@/store/pages/SupportPage').SupportSection) => void;
}

export const StorefrontRoutes: React.FC<StorefrontRoutesProps> = ({
    view,
    setView,
    handleSetView,
    PageFallback,
    activeCategory,
    handleCategoryClick,
    activeCollection,
    handleCollectionClick,
    selectedProduct,
    handleProductClick,
    searchTerm,
    setSearchTerm,
    cart,
    addToCart,
    updateQuantity,
    removeItem,
    activeSupportSection,
    handleSupportClick,
}) => {
    const [pendingEmail] = useState<string | undefined>(
        () => sessionStorage.getItem('pendingVerificationEmail') ?? undefined
    );
    return (
        <StoreLayout setView={handleSetView} setCategory={handleCategoryClick} setCollection={handleCollectionClick} handleSupportClick={handleSupportClick}>
            <Suspense fallback={<PageFallback />}>
                {view === 'STORE_HOME' && <Home setView={handleSetView} setCategory={handleCategoryClick} setCollection={handleCollectionClick} onProductClick={handleProductClick} setSearchTerm={setSearchTerm} />}
                {view === 'STORE_CATEGORY' && <Category setView={handleSetView} category={activeCategory} setCategory={handleCategoryClick} setCollection={handleCollectionClick} onProductClick={handleProductClick} setSearchTerm={setSearchTerm} />}
                {view === 'STORE_COLLECTION' && <Collection setView={handleSetView} category={activeCategory} setCategory={handleCategoryClick} collection={activeCollection} setCollection={handleCollectionClick} onProductClick={handleProductClick} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
                {view === 'STORE_DETAIL' && <ProductDetail setView={handleSetView} setCategory={handleCategoryClick} setCollection={handleCollectionClick} addToCart={addToCart} cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} product={selectedProduct} setSearchTerm={setSearchTerm} />}
                {view === 'STORE_CART' && <ShoppingBag setView={handleSetView} setCategory={handleCategoryClick} cart={cart} updateQuantity={updateQuantity} removeItem={removeItem} />}
                {view === 'STORE_STYLIST' && <Stylist setView={handleSetView} setCategory={handleCategoryClick} onProductClick={handleProductClick} />}
                {view === 'STORE_SUPPORT' && <SupportPage setView={handleSetView} setCategory={handleCategoryClick} setSearchTerm={setSearchTerm} onProductClick={handleProductClick} initialSection={activeSupportSection} />}
                {view === 'STORE_WEATHER_OUTFIT' && <WeatherOutfitPage />}
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
                {view === 'EMAIL_VERIFICATION' && <EmailVerification setView={setView} email={pendingEmail} />}
            </Suspense>
        </StoreLayout>
    );
};
