
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
  status: 'PENDING' | 'PROCESSING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';
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
  | 'STORE_CHECKOUT'
  | 'STORE_ORDER_SUCCESS'
  | 'STORE_PAYMENT_QR'
  | 'AUTH_LOGIN'
  | 'AUTH_SIGNUP'
  | 'AUTH_CALLBACK'
  | 'AUTH_FORGOT_PASSWORD'
  | 'AUTH_RESET_PASSWORD'
  | 'EMAIL_VERIFICATION'
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_PRODUCTS'
  | 'ADMIN_CREATE_PRODUCT'
  | 'ADMIN_EDIT_PRODUCT'
  | 'ADMIN_ORDERS'
  | 'ADMIN_ORDER_DETAIL'
  | 'ADMIN_TRACKING'
  | 'ADMIN_CUSTOMERS'
  | 'ADMIN_ANALYTICS'
  | 'ADMIN_RESTOCK'
  | 'ADMIN_CATEGORIES'
  | 'ADMIN_COUPONS'
  | 'ADMIN_ROLES';


export type CategoryType = 'Men' | 'Women' | 'Accessories';

// Shared Types for Admin
export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  image: string; // Primary image for backward compatibility
  images?: { imageUrl: string; thumbnailUrl?: string }[]; // Multiple images for gallery
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
    permissions?: string[];
  };
}


export interface AuthError {
  error: string;
  code?: string;
  message?: string;
}

