import React, { useState, useEffect } from 'react';
import { ViewState, CartItem, CategoryType } from '../types';
import { StoreHeader } from '../components/StoreHeader';
import { ProductImageGallery } from '../components/ProductImageGallery';
import { fetchProductById } from '../services/product.service';

interface ProductDetailProps {
  setView: (v: ViewState) => void;
  setCategory: (c: CategoryType) => void;
  addToCart: (item: CartItem) => void;
  cartCount: number;
  product?: any;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ setView, setCategory, addToCart, cartCount, product: initialProduct }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('#111'); // Hex code for Midnight Black
  const [productDetails, setProductDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fallback default product if none selected
  if (!initialProduct) {
    return <div className="min-h-screen bg-bg-dark text-white flex items-center justify-center">Product not found.</div>;
  }

  // Normalize product data
  const product = {
    ...initialProduct,
    image: initialProduct.image || initialProduct.img || '',
    ref: initialProduct.ref || `SKU-${Date.now()}`,
    id: initialProduct.id || `temp-${Date.now()}`
  };

  // Fetch full product details including all images
  useEffect(() => {
    const loadProductDetails = async () => {
      try {
        setIsLoading(true);
        const details = await fetchProductById(parseInt(product.id));
        setProductDetails(details);
      } catch (error) {
        console.error('Failed to load product details:', error);
        // Use basic product info as fallback
        setProductDetails({
          ...product,
          images: [{
            imageId: 0,
            productId: parseInt(product.id),
            imageUrl: product.image,
            thumbnailUrl: product.image,
            isPrimary: true
          }]
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProductDetails();
  }, [product.id]);

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      ref: product.ref,
      quantity: quantity,
      size: selectedSize,
      color: selectedColor === '#111' ? 'Midnight Black' : selectedColor === '#4a0404' ? 'Deep Burgundy' : 'Charcoal Grey'
    });
  };

  const getColorName = (hex: string) => {
    if (hex === '#111') return 'Midnight Black';
    if (hex === '#4a0404') return 'Deep Burgundy';
    return 'Charcoal Grey';
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-bg-dark">
      {/* Left Gallery */}
      <div className="w-full lg:w-1/2 lg:h-screen lg:sticky lg:top-0 bg-surface-dark relative">
        {isLoading ? (
          <div className="w-full h-[60vh] lg:h-full bg-surface-dark animate-pulse" />
        ) : (
          <ProductImageGallery
            images={productDetails?.images || []}
            productName={product.name}
            className="w-full h-[60vh] lg:h-full"
            enableZoom={true}
            showThumbnails={true}
            viewLabels={['FRONT VIEW', 'SIDE VIEW', 'BACK VIEW']}
          />
        )}
        <button onClick={() => setView('STORE_COLLECTION')} className="absolute top-6 left-6 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-all cursor-pointer z-10">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      </div>

      {/* Right Content */}
      <div className="w-full lg:w-1/2 flex flex-col bg-bg-dark">
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 lg:px-12 lg:py-6 bg-bg-dark/90 backdrop-blur-sm border-b border-border-dark/50">
          <button onClick={() => setView('STORE_HOME')} className="text-primary"><span className="material-symbols-outlined text-3xl">diamond</span></button>

          <nav className="hidden md:flex items-center gap-8">
            {['New Arrivals', 'Women', 'Men', 'Accessories'].map((item) => (
              <button
                key={item}
                onClick={() => {
                  if (['Men', 'Women', 'Accessories'].includes(item)) {
                    setCategory(item as CategoryType);
                  } else {
                    setView('STORE_COLLECTION');
                  }
                }}
                className="text-white/80 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
              >
                {item}
              </button>
            ))}
          </nav>

          <button onClick={() => setView('STORE_CART')} className="relative group">
            <span className="material-symbols-outlined text-white group-hover:text-primary transition-colors">shopping_bag</span>
            {cartCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">{cartCount}</span>}
          </button>
        </header>

        <div className="flex-1 px-6 py-8 lg:px-16 lg:py-12 flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <p className="text-gray-400 text-xs font-medium tracking-widest uppercase">Ref. {product.ref}</p>
              <div className="flex gap-4 text-gray-500">
                <span className="material-symbols-outlined hover:text-white cursor-pointer text-sm">favorite</span>
                <span className="material-symbols-outlined hover:text-white cursor-pointer text-sm">share</span>
              </div>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black leading-[1.1] tracking-tight uppercase text-white">{product.name}</h1>
            <div className="flex items-center gap-4 pt-1">
              <span className="text-2xl font-bold text-white">${product.price.toFixed(2)}</span>
              {product.tag && <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold tracking-wide uppercase">{product.tag}</span>}
            </div>
            <p className="text-gray-300 leading-relaxed text-base max-w-md pt-2">
              Crafted from premium materials, this piece defines modern luxury. Features a tailored silhouette, refined hardware, and Aisthea's signature structural design.
            </p>
          </div>

          <div className="flex flex-col gap-8 border-t border-border-dark/50 pt-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 block">Color — <span className="text-white">{getColorName(selectedColor)}</span></span>
              <div className="flex gap-3">
                {['#111', '#4a0404', '#2a2a2a'].map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-full border-2 ${selectedColor === color ? 'border-white ring-1 ring-white/20' : 'border-transparent'} hover:scale-105 transition-transform`}
                    style={{ backgroundColor: color }}
                  ></button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Size — <span className="text-white">{selectedSize}</span></span>
                <span className="text-xs underline text-gray-400 hover:text-white cursor-pointer">Size Guide</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {['XS', 'S', 'M', 'L', 'XL'].map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`h-12 border ${selectedSize === size ? 'border-white bg-white text-black' : 'border-border-dark text-gray-400 hover:border-white hover:text-white'} text-sm font-bold transition-colors rounded-sm`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {/* Quantity Selector */}
            <div className="h-14 w-32 border border-border-dark flex items-center justify-between px-2 bg-surface-dark">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">remove</span>
              </button>
              <span className="text-white font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </button>
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              className="flex-1 h-14 bg-primary hover:bg-red-600 text-white font-bold text-sm tracking-[0.1em] uppercase rounded-sm flex items-center justify-center gap-3 transition-all active:scale-[0.99] shadow-lg shadow-primary/20"
            >
              Add to Bag <span className="w-px h-4 bg-white/30"></span> ${(product.price * quantity).toFixed(2)}
            </button>
          </div>

          <div className="flex flex-col divide-y divide-border-dark border-y border-border-dark mt-4">
            {['Description', 'Shipping & Returns'].map(item => (
              <details key={item} className="group py-4 cursor-pointer">
                <summary className="flex items-center justify-between font-bold text-sm uppercase tracking-wide list-none select-none text-white">
                  {item} <span className="material-symbols-outlined text-gray-500 transition-transform group-open:rotate-180">expand_more</span>
                </summary>
                <div className="pt-4 text-base text-gray-300 leading-relaxed"><p>Details placeholder text...</p></div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};