import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './app/App';
import { AuthProvider } from './contexts/AuthContext';
import { ProductProvider } from './contexts/ProductContext';
import './styles/index.css';
import './i18n/config';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { VNPayReturn } from './pages/VNPayReturn';
import { TrackingLookupPage } from './pages/TrackingLookupPage';
import { TrackingDetailPage } from './pages/TrackingDetailPage';
import { MyOrdersPage } from './pages/MyOrdersPage';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
const queryClient = new QueryClient();

root.render(
  <React.StrictMode>
    <AuthProvider>
      <ProductProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/vnpay-return" element={<VNPayReturn />} />
              <Route path="/tracking" element={<TrackingLookupPage />} />
              <Route path="/tracking/:id" element={<TrackingDetailPage />} />
              <Route path="/my-orders" element={<MyOrdersPage />} />
              <Route path="*" element={<App />} />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </ProductProvider>
    </AuthProvider>
  </React.StrictMode>,
);
