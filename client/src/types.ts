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
  | 'ADMIN_DASHBOARD' 
  | 'ADMIN_PRODUCTS' 
  | 'ADMIN_CREATE_PRODUCT'
  | 'ADMIN_ORDERS' 
  | 'ADMIN_TRACKING';

export type CategoryType = 'Men' | 'Women' | 'Accessories';