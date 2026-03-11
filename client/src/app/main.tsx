import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/app/App';
import { AuthProvider } from '@/common/contexts/AuthContext';
import { CartProvider } from '@/common/contexts/CartContext';
import { ToastProvider } from '@/common/contexts/ToastContext';
import { ProductProvider } from '@/common/contexts/ProductContext';
import '@/styles/index.css';
import '@/i18n/config';
import { OrderDetailPage } from '@/common/pages/OrderDetailPage';
import { CreateReturnPage } from '@/common/pages/CreateReturnPage';
import { VNPayReturn } from '@/common/pages/VNPayReturn';
import { TrackingLookupPage } from '@/common/pages/TrackingLookupPage';
import { TrackingDetailPage } from '@/common/pages/TrackingDetailPage';
import { MyOrdersPage } from '@/common/pages/MyOrdersPage';
import ItemsPage from '@/common/pages/ItemsPage';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
const queryClient = new QueryClient();

root.render(
  <React.StrictMode>
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <ProductProvider>
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
                <Routes>
                  <Route path="/orders/:id" element={<OrderDetailPage />} />
                  <Route path="/orders/:id/return" element={<CreateReturnPage />} />
                  <Route path="/vnpay-return" element={<VNPayReturn />} />
                  <Route path="/tracking" element={<TrackingLookupPage />} />
                  <Route path="/tracking/:id" element={<TrackingDetailPage />} />
                  <Route path="/my-orders" element={<MyOrdersPage />} />
                  <Route path="/items" element={<ItemsPage />} />
                  <Route path="*" element={<App />} />
                </Routes>
              </BrowserRouter>
            </QueryClientProvider>
          </ProductProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  </React.StrictMode>,
);
