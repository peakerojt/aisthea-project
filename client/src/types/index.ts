
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  stock: number;
  sku: string;
}

export interface Order {
  id: string;
  customer: {
    name: string;
    email: string;
    avatar?: string;
  };
  date: string;
  total: number;
  status: 'Pending' | 'Shipping' | 'Delivered';
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  color: string;
  size: string;
  quantity: number;
  ref: string;
}

export type ViewState =
  | 'STORE_HOME'
  | 'STORE_CATEGORY'
  | 'STORE_COLLECTION'
  | 'STORE_DETAIL'
  | 'STORE_CART'
  | 'STORE_STYLIST'
  | 'STORE_PROFILE'
  | 'STORE_MY_ORDERS'
  | 'AUTH_LOGIN'
  | 'AUTH_SIGNUP'
  | 'AUTH_CALLBACK'
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_PRODUCTS'
  | 'ADMIN_CREATE_PRODUCT'
  | 'ADMIN_ORDERS'
  | 'ADMIN_TRACKING'
  | 'ADMIN_CUSTOMERS'
  | 'ADMIN_ANALYTICS'
  | 'ADMIN_RESTOCK';

export type CategoryType = 'Men' | 'Women' | 'Accessories';

// Shared Types for Admin
export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  image: string; // Changed from img to image for consistency
  category: string;
  description?: string;
}

export interface RestockItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  date: string;
  items: RestockItem[];
  totalCost: number;
  status: 'Pending' | 'Received';
}

// Authentication Types
export interface AuthSession {
  isAuthenticated: boolean;
  user?: {
    userId: number;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
    roles: string[];
  };
}

export interface AuthError {
  error: string;
  code?: string;
  message?: string;
}

