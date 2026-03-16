import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Provide a lightweight default mock for AuthContext so component tests don't need to wrap providers
vi.mock('@/common/contexts/AuthContext', () => {
  const mockAuth = {
    user: { id: '1', name: 'Test User', email: 'test@example.com', roles: ['Customer'], permissions: [] },
    role: 'customer' as const,
    permissions: [] as string[],
    isInitialized: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    initializeAuth: vi.fn(),
    refreshSession: vi.fn(),
    setUserFromSession: vi.fn(),
  };

  return {
    useAuth: () => mockAuth,
    AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

// Mock CartContext to avoid provider wiring in unit tests
vi.mock('@/common/contexts/CartContext', () => {
  const mockCart = {
    items: [] as any[],
    totalItems: 0,
    cartTotal: 0,
    isLoading: false,
    addItem: vi.fn(),
    addItemsBatch: vi.fn(),
    removeItem: vi.fn(),
    updateItem: vi.fn(),
    clearCart: vi.fn(),
    fetchCart: vi.fn(),
    syncWithMerge: vi.fn(),
    getStockStatus: vi.fn(() => 'ok' as const),
  };
  return {
    useCart: () => mockCart,
    CartProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

vi.mock('@/common/contexts/ToastContext', () => {
  const mockToast = {
    showToast: vi.fn(),
    showCartToast: vi.fn(),
  };

  return {
    useToast: () => mockToast,
    ToastProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

// Minimal i18n mock
vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, i18n: { changeLanguage: vi.fn() } as any }),
    Trans: ({ children }: any) => children,
  };
});

// Mock order/return services to avoid real network calls in unit tests
vi.mock('@/common/services/order.service', () => {
  const deliveredEvent = {
    status: 'DELIVERED',
    at: new Date().toISOString(),
    note: 'delivered',
  };
  const dummyOrder = {
    orderId: 1,
    orderNumber: 'ORD-1',
    orderCode: 'ORD-1',
    status: 'DELIVERED',
    statusLabel: 'Đã giao hàng',
    paymentStatus: 'PAID',
    totalAmount: 100000,
    pricing: { grandTotal: 100000 },
    createdAt: new Date().toISOString(),
    address: '123 Test St',
    paymentMethod: 'COD',
    shippingAddress: {
      recipientName: 'Khách Test',
      recipientPhone: '0900000000',
      addressLine: '123 Đường Test, Quận 1',
      province: 'HCM',
      district: 'Quận 1',
      ward: 'Phường Bến Nghé',
    },
    timeline: [deliveredEvent],
    items: [
      { orderItemId: 10, quantity: 1, productName: 'Item', variantName: 'Default', price: 100000 },
    ],
  };
  return {
    orderService: {
      getMyOrderDetail: vi.fn().mockResolvedValue(dummyOrder),
      fetchOrderDetail: vi.fn().mockResolvedValue(dummyOrder),
      cancelOrder: vi.fn().mockResolvedValue({ success: true }),
      cancelOrderUser: vi.fn().mockResolvedValue({ success: true }),
      confirmReceipt: vi.fn().mockResolvedValue({ success: true }),
      getOrderTracking: vi.fn().mockResolvedValue([]),
    },
    adminOrderService: {
      getOrderById: vi.fn().mockResolvedValue(dummyOrder),
      updateStatus: vi.fn(),
    },
  };
});

vi.mock('@/common/services/return.service', () => ({
  returnService: {
    request: vi.fn().mockResolvedValue({ returnId: 5 }),
    create: vi.fn().mockResolvedValue({ returnId: 5 }),
    getReturnDetail: vi.fn().mockResolvedValue({ returnId: 5, items: [] }),
  },
}));
