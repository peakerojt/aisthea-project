import React from 'react';
import { Navigate } from 'react-router-dom';

const Home = React.lazy(() => import('@/store/pages/Home').then((m) => ({ default: m.Home })));
const Category = React.lazy(() => import('@/store/pages/Category').then((m) => ({ default: m.Category })));
const Collection = React.lazy(() => import('@/store/pages/Collection').then((m) => ({ default: m.Collection })));
const ProductDetail = React.lazy(() => import('@/common/pages/ProductDetail').then((m) => ({ default: m.ProductDetail })));
const ShoppingBag = React.lazy(() => import('@/common/pages/ShoppingBag').then((m) => ({ default: m.ShoppingBag })));
const Stylist = React.lazy(() => import('@/store/pages/Stylist').then((m) => ({ default: m.Stylist })));
const WeatherOutfitPage = React.lazy(() => import('@/store/pages/WeatherOutfitPage').then((m) => ({ default: m.WeatherOutfitPage })));
const SupportPage = React.lazy(() => import('@/store/pages/SupportPage').then((m) => ({ default: m.SupportPage })));
const Profile = React.lazy(() => import('@/store/pages/Profile').then((m) => ({ default: m.Profile })));
const MyOrdersPage = React.lazy(() => import('@/store/pages/MyOrders').then((m) => ({ default: m.MyOrders })));
const Checkout = React.lazy(() => import('@/common/pages/Checkout'));
const OrderSuccess = React.lazy(() => import('@/common/pages/OrderSuccess'));
const PaymentQR = React.lazy(() => import('@/common/pages/PaymentQR'));
const OrderDetailPage = React.lazy(() => import('@/common/pages/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })));
const CreateReturnPage = React.lazy(() => import('@/common/pages/CreateReturnPage').then((m) => ({ default: m.CreateReturnPage })));
const TrackingLookupPage = React.lazy(() => import('@/common/pages/TrackingLookupPage').then((m) => ({ default: m.TrackingLookupPage })));
const TrackingDetailPage = React.lazy(() => import('@/common/pages/TrackingDetailPage').then((m) => ({ default: m.TrackingDetailPage })));
const VNPayReturn = React.lazy(() => import('@/common/pages/VNPayReturn').then((m) => ({ default: m.VNPayReturn })));
const ItemsPage = React.lazy(() => import('@/common/pages/ItemsPage'));

export const storeRoutes = [
  { path: '/', element: <Home /> },
  { path: '/category/:gender', element: <Category /> },
  { path: '/collection', element: <Collection /> },
  { path: '/collection/:gender/:name', element: <Collection /> },
  { path: '/product/:id', element: <ProductDetail /> },
  { path: '/cart', element: <ShoppingBag /> },
  { path: '/stylist', element: <Stylist /> },
  { path: '/weather-outfit', element: <WeatherOutfitPage /> },
  { path: '/support', element: <SupportPage /> },
  { path: '/profile/*', element: <Profile /> },
  { path: '/account/bank', element: <Navigate to="/profile/bank" replace /> },
  { path: '/account/vouchers', element: <Navigate to="/profile/vouchers" replace /> },
  { path: '/my-orders', element: <MyOrdersPage /> },
  { path: '/checkout', element: <Checkout /> },
  { path: '/order-success', element: <OrderSuccess /> },
  { path: '/payment-qr', element: <PaymentQR /> },
  { path: '/orders/:id', element: <OrderDetailPage /> },
  { path: '/orders/:id/return', element: <CreateReturnPage /> },
  { path: '/tracking', element: <TrackingLookupPage /> },
  { path: '/tracking/:id', element: <TrackingDetailPage /> },
  { path: '/vnpay-return', element: <VNPayReturn /> },
  { path: '/items', element: <ItemsPage /> },
];
