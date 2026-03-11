
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProductItem, PurchaseOrder } from '@/types';
import {
  fetchProducts,
  Product as DBProduct,
  getPrimaryImage,
  getStockStatus
} from '@/common/services/product.service';

interface ProductContextType {
  products: ProductItem[];
  purchaseOrders: PurchaseOrder[];
  updateProduct: (id: string, updates: Partial<ProductItem>) => void;
  deleteProduct: (id: string) => void;
  receiveStock: (po: PurchaseOrder) => void;
  createPurchaseOrder: (po: PurchaseOrder) => void;
  addProduct: (product: Omit<ProductItem, 'id'>) => void;
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const STORAGE_KEY = 'aisthea_inventory_v2';

/**
 * Convert database product to ProductItem format for backward compatibility
 */
const convertDBProductToProductItem = (dbProduct: DBProduct): ProductItem => {
  const primaryVariant = dbProduct.variants?.[0];
  const stockQuantity = primaryVariant?.stockQuantity || 0;

  // Map images for gallery support
  const images = dbProduct.images?.map((img) => ({
    imageUrl: img.imageUrl,
    thumbnailUrl: img.thumbnailUrl || img.imageUrl
  })) || [];

  return {
    id: dbProduct.productId.toString(),
    name: dbProduct.name,
    sku: primaryVariant?.sku || `SKU-${dbProduct.productId}`,
    category: dbProduct.category?.name || 'Uncategorized',
    price: Number(primaryVariant?.price || dbProduct.basePrice),
    stock: stockQuantity,
    status: getStockStatus(stockQuantity),
    image: getPrimaryImage(dbProduct) || '',
    images: images.length > 0 ? images : undefined,
    description: dbProduct.description || ''
  };
};

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    try {
      const saved = localStorage.getItem('aisthea_purchase_orders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Fetch products from database on mount
  const refreshProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const dbProducts = await fetchProducts();
      const convertedProducts = dbProducts.map(convertDBProductToProductItem);

      setProducts(convertedProducts);

      // Cache products in localStorage for offline access
      localStorage.setItem(STORAGE_KEY, JSON.stringify(convertedProducts));
    } catch (error) {
            const err = error as Error | { message?: string; error?: string; data?: unknown };
      console.error('Failed to fetch products from database:', err);
      setError(err.message || 'Failed to load products');

      // Try to load from localStorage as fallback
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          setProducts(JSON.parse(cached));
          setError('Using cached data - database connection failed');
        }
      } catch (cacheErr) {
        console.error('Failed to load cached products:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProducts();
  }, []);

  // Persist purchase orders to LocalStorage
  useEffect(() => {
    localStorage.setItem('aisthea_purchase_orders', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  // CRUD Functions (for local state management - these can be extended to call APIs)
  const addProduct = (newProduct: Omit<ProductItem, 'id'>) => {
    const id = `PROD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
    setProducts(prev => [{ ...newProduct, id }, ...prev]);

    // Note: This should ideally call an API to create the product in the database
    console.warn('addProduct: This operation only updates local state. API integration needed.');
  };

  const updateProduct = (id: string, updates: Partial<ProductItem>) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, ...updates };

      // Auto-update status based on new stock if stock is being updated
      if (updates.stock !== undefined) {
        if (updated.stock === 0) updated.status = 'Out of Stock';
        else if (updated.stock < 10) updated.status = 'Low Stock';
        else updated.status = 'In Stock';
      }
      return updated;
    }));

    // Note: This should ideally call an API to update the product in the database
    console.warn('updateProduct: This operation only updates local state. API integration needed.');
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));

    // Note: This should ideally call an API to delete the product in the database
    console.warn('deleteProduct: This operation only updates local state. API integration needed.');
  };

  const createPurchaseOrder = (po: PurchaseOrder) => {
    setPurchaseOrders(prev => [po, ...prev]);
  };

  const receiveStock = (po: PurchaseOrder) => {
    const updatedProducts = [...products];
    po.items.forEach(item => {
      const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
      if (productIndex > -1) {
        const product = updatedProducts[productIndex];
        const newStock = product.stock + item.quantity;
        updatedProducts[productIndex] = {
          ...product,
          stock: newStock,
          status: newStock > 10 ? 'In Stock' : newStock > 0 ? 'Low Stock' : 'Out of Stock'
        };
      }
    });
    setProducts(updatedProducts);
    setPurchaseOrders(prev => prev.map(order => order.id === po.id ? { ...order, status: 'Received' } : order));
  };

  return (
    <ProductContext.Provider value={{
      products,
      purchaseOrders,
      updateProduct,
      deleteProduct,
      receiveStock,
      createPurchaseOrder,
      addProduct,
      loading,
      error,
      refreshProducts
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
