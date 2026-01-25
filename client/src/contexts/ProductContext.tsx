
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProductItem, PurchaseOrder } from '../types';

interface ProductContextType {
  products: ProductItem[];
  purchaseOrders: PurchaseOrder[];
  updateProduct: (id: string, updates: Partial<ProductItem>) => void;
  deleteProduct: (id: string) => void;
  receiveStock: (po: PurchaseOrder) => void;
  createPurchaseOrder: (po: PurchaseOrder) => void;
  addProduct: (product: Omit<ProductItem, 'id'>) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const STORAGE_KEY = 'aisthea_inventory_v2';

// Specific Luxury Mock Data as requested
const DEFAULT_MOCK_DATA: ProductItem[] = [
  {
    id: '1',
    name: "Obsidian Structure Biker Jacket",
    sku: "JKT-BLK-001",
    category: "Men",
    price: 1250,
    stock: 5,
    status: "Low Stock",
    image: "https://images.unsplash.com/photo-1551028919-ac6635f0e5c9?q=80&w=1000&auto=format&fit=crop",
    description: "Hand-crafted Italian leather with asymmetrical zip details."
  },
  {
    id: '2',
    name: "Midnight Silk Asymmetric Dress",
    sku: "DRS-SLK-009",
    category: "Women",
    price: 890,
    stock: 24,
    status: "In Stock",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=1000&auto=format&fit=crop",
    description: "Flowing midnight blue silk with architectural draping."
  },
  {
    id: '3',
    name: "Velvet Noir Tailored Blazer",
    sku: "BLZ-VLV-022",
    category: "Men",
    price: 950,
    stock: 0,
    status: "Out of Stock",
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1000&auto=format&fit=crop",
    description: "Deep black velvet blazer with satin lapels."
  },
  {
    id: '4',
    name: "The Vanguard Chelsea Boots",
    sku: "BTS-LTR-104",
    category: "Shoes",
    price: 560,
    stock: 12,
    status: "In Stock",
    image: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?q=80&w=1000&auto=format&fit=crop",
    description: "Polished calfskin leather with durable stacked heel."
  },
  {
    id: '5',
    name: "Ethereal Cashmere Trench",
    sku: "COAT-CSH-005",
    category: "Women",
    price: 2100,
    stock: 3,
    status: "Low Stock",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1000&auto=format&fit=crop",
    description: "Oversized silhouette made from 100% Mongolian cashmere."
  },
  {
    id: '6',
    name: "Minimalist Gold Cuff",
    sku: "ACC-GLD-882",
    category: "Accessories",
    price: 450,
    stock: 50,
    status: "In Stock",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=1000&auto=format&fit=crop",
    description: "18k gold plated cuff with brushed finish."
  }
];

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Initialize State from LocalStorage or Mock Data
  const [products, setProducts] = useState<ProductItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_MOCK_DATA;
    } catch (e) {
      console.error("Failed to load products", e);
      return DEFAULT_MOCK_DATA;
    }
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    {
        id: '#PO-001',
        supplier: 'Milan Silk Factory',
        date: 'Oct 15, 2024',
        status: 'Received',
        totalCost: 12500,
        items: [
            { productId: '1', productName: 'Obsidian Structure Coat', sku: '9921', quantity: 20, unitCost: 625 }
        ]
    }
  ]);

  // Persist to LocalStorage whenever products change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  // 2. CRUD Functions
  const addProduct = (newProduct: Omit<ProductItem, 'id'>) => {
    // Generate random ID
    const id = `PROD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
    setProducts(prev => [{ ...newProduct, id }, ...prev]);
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
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
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
    <ProductContext.Provider value={{ products, purchaseOrders, updateProduct, deleteProduct, receiveStock, createPurchaseOrder, addProduct }}>
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
