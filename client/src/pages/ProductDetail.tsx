import React, { useState, useEffect, useMemo, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Share2,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ChevronDown,
  Diamond,
  CheckCircle2,
  HelpCircle,
  Zap,
  Star,
  Info
} from 'lucide-react';
import { ViewState, CartItem, CategoryType } from '../types';
import { ProductImageGallery } from '../components/ProductImageGallery';
import { fetchProductById, fetchProducts, Product as ApiProductType } from '../services/product.service';
import { getCloudinaryProductCard } from '../utils/cloudinary';
import { useProducts } from '../contexts/ProductContext';
import { useAuth } from '../contexts/AuthContext';
import { ProductCard } from '../components/ProductCard/ProductCard';
import { StoreHeader } from '../components/StoreHeader';
import { getReviewsByProduct } from "../services/review.service";

interface ProductDetailProps {
  setView: (v: ViewState, id?: number) => void;
  setCategory: (c: CategoryType) => void;
  addToCart: (item: CartItem) => void;
  cartCount: number;
  product?: any;
  setSearchTerm: (term: string) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ setView, setCategory, addToCart, cartCount, product: initialProduct, setSearchTerm }) => {
  const [quantity, setQuantity] = useState(1);
  const [productDetails, setProductDetails] = useState<ApiProductType | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const carouselRef = React.useRef<HTMLDivElement>(null);

  const { products } = useProducts();
  const { user } = useAuth(); // Hook để check đăng nhập
  const [reviews, setReviews] = useState<any[]>([]);
  const productId = initialProduct?.id
    ? Number(initialProduct.id)
    : initialProduct?.productId
      ? Number(initialProduct.productId)
      : null;

  // Selection states
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  // Review state 
  useEffect(() => {

    console.log("initialProduct:", initialProduct);
    console.log("productId:", productId);

    if (!productId) {
      console.log("Skip review fetch - invalid productId");
      return;
    }

    const fetchReviews = async () => {
      try {
        const data = await getReviewsByProduct(productId);
        console.log("Review API response:", data);
        setReviews(data.reviews ?? []);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      }
    };

    fetchReviews();

    // Re-fetch reviews when a review is submitted (e.g., from OrderDetailPage modal)
    const handleReviewSubmitted = (e: Event) => {
      const { productId: submittedProductId } = (e as CustomEvent).detail ?? {};
      if (submittedProductId === productId) {
        fetchReviews();
      }
    };
    window.addEventListener('review-submitted', handleReviewSubmitted);
    return () => window.removeEventListener('review-submitted', handleReviewSubmitted);
  }, [productId]);

  // Fallback default product if none selected
  if (!initialProduct) {
    return <div className="min-h-screen bg-bg-dark text-white flex items-center justify-center">Product not found.</div>;
  }

  // Normalize product data
  const basicInfo = {
    ...initialProduct,
    image: initialProduct.image || initialProduct.img || '',
    ref: initialProduct.ref || `SKU-${Date.now()}`,
    id: initialProduct.id || initialProduct.productId || `temp-${Date.now()}`
  };

  const currentActiveId = useMemo(() => {
    return (productDetails?.productId || basicInfo.id).toString();
  }, [productDetails, basicInfo]);

  // Recently Viewed Tracking and Loading
  useEffect(() => {
    if (!currentActiveId || isNaN(Number(currentActiveId))) {
      console.log("Skip recent tracking - invalid currentActiveId");
      return;
    }

    const trackAndLoadRecent = async () => {
      try {
        // Always work with string IDs to avoid logic errors
        const id = currentActiveId.toString();
        const storageKey = 'aisthea_recent_views';
        const stored = localStorage.getItem(storageKey);

        // Parse and ensure all items are strings
        let recentIds: string[] = stored ? JSON.parse(stored).map((rid: any) => rid.toString()) : [];

        // Add current ID to front (most recent), limit to 10
        recentIds = [id, ...recentIds.filter(rid => rid !== id)].slice(0, 10);
        localStorage.setItem(storageKey, JSON.stringify(recentIds));

        // Load details for the top most recent items (excluding the current one for chronological history)
        const historyIds = recentIds.filter(rid => rid !== id).slice(0, 8);
        if (historyIds.length > 0) {
          const details = await Promise.all(
            historyIds.map(rid => fetchProductById(parseInt(rid)).catch(() => null))
          );
          setRecentProducts(details.filter(d => d !== null));
        } else {
          setRecentProducts([]);
        }
      } catch (err) {
        console.error('Recent tracking error:', err);
      }
    };
    trackAndLoadRecent();
  }, [currentActiveId]);

  // Fetch full product details and related products
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const id = parseInt(basicInfo.id);
        const details = await fetchProductById(id);
        setProductDetails(details);

        // Pre-select first variant if available (Logic của feature/cart-Truong)
        if (details.variants && details.variants.length > 0) {
          const defaultVariant = details.variants.find(v => v.isDefault) || details.variants[0];
          const sizeAttr = defaultVariant.attributes?.find((a: any) => a.attributeName === 'Size' || a.attributeName === 'Kích thước') ||
            defaultVariant.variantAttributes?.find((a: any) => a.value?.attribute?.name === 'Size' || a.value?.attribute?.name === 'Kích thước');
          const colorAttr = defaultVariant.attributes?.find((a: any) => a.attributeName === 'Color' || a.attributeName === 'Màu sắc' || a.attributeName === 'Màu') ||
            defaultVariant.variantAttributes?.find((a: any) => a.value?.attribute?.name === 'Color' || a.value?.attribute?.name === 'Màu sắc' || a.value?.attribute?.name === 'Màu');

          if (sizeAttr) setSelectedSize(sizeAttr.attributeValue || sizeAttr.value?.value || sizeAttr.value);
          else setSelectedSize('M');

          if (colorAttr) setSelectedColor(colorAttr.attributeValue || colorAttr.value?.value || colorAttr.value);
          else setSelectedColor('#111');
        } else {
          setSelectedSize('M');
          setSelectedColor('#111');
        }

        // Fetch related products from same category - Up to 8 for carousel
        if (details.categoryId) {
          const related = await fetchProducts({ category: details.category?.name });
          setRelatedProducts(related.filter(p => p.productId !== id).slice(0, 8));
        }
      } catch (error) {
        console.error('Failed to load product details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    window.scrollTo(0, 0);
  }, [basicInfo.id]);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.clientWidth * 0.8;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const availableSizes = useMemo(() => {
    if (!productDetails?.variants) return ['XS', 'S', 'M', 'L', 'XL'];
    const sizes = new Set<string>();
    productDetails.variants.forEach(v => {
      const attr = v.attributes?.find((a: any) => a.attributeName === 'Size' || a.attributeName === 'Kích thước') ||
        v.variantAttributes?.find((a: any) => a.value?.attribute?.name === 'Size' || a.value?.attribute?.name === 'Kích thước');
      if (attr) sizes.add(attr.attributeValue || attr.value?.value || attr.value);
    });
    return sizes.size > 0 ? Array.from(sizes) : ['XS', 'S', 'M', 'L', 'XL'];
  }, [productDetails]);

  const availableColors = useMemo(() => {
    if (!productDetails?.variants) return ['#111', '#4a0404', '#2a2a2a'];
    const colors = new Set<string>();
    productDetails.variants.forEach(v => {
      const attr = v.attributes?.find((a: any) => a.attributeName === 'Color' || a.attributeName === 'Màu sắc' || a.attributeName === 'Màu') ||
        v.variantAttributes?.find((a: any) => a.value?.attribute?.name === 'Color' || a.value?.attribute?.name === 'Màu sắc' || a.value?.attribute?.name === 'Màu');
      if (attr) colors.add(attr.attributeValue || attr.value?.value || attr.value);
    });
    return colors.size > 0 ? Array.from(colors) : ['#111', '#4a0404', '#2a2a2a'];
  }, [productDetails]);

  const suggestedProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    const currentCategory = (productDetails?.category?.name || basicInfo.category || '').toString().toLowerCase().trim();
    const currentId = currentActiveId;

    // Filter out current product
    const otherProducts = products.filter(p => p.id.toString() !== currentId);

    // Pool A: Same category (Related)
    const poolA = otherProducts.filter(p =>
      (p.category || '').toString().toLowerCase().trim() === currentCategory
    ).sort(() => 0.5 - Math.random());

    // Pool B: Different categories (Cross-sell/Discover)
    const poolB = otherProducts.filter(p =>
      (p.category || '').toString().toLowerCase().trim() !== currentCategory
    ).sort(() => 0.5 - Math.random());

    // Selection logic: Mix 4 from same category + 4 from others
    // If not enough in same category, take more from others
    const selectedA = poolA.slice(0, 4);
    const selectedB = poolB.slice(0, 8 - selectedA.length);

    // Combine and final shuffle for presentation
    const combined = [...selectedA, ...selectedB];

    // Final check if we still have less than 8 (though unlikely given total products)
    if (combined.length < 8 && otherProducts.length > combined.length) {
      const combinedIds = new Set(combined.map(p => p.id));
      const remaining = otherProducts.filter(p => !combinedIds.has(p.id)).sort(() => 0.5 - Math.random());
      combined.push(...remaining.slice(0, 8 - combined.length));
    }

    return combined.sort(() => 0.5 - Math.random());
  }, [products, productDetails, basicInfo, currentActiveId]);

  const handleAddToCart = () => {
    // 1. Kiểm tra đăng nhập (từ nhánh dev)
    if (!user) {
      setView('AUTH_LOGIN');
      window.scrollTo(0, 0);
      return;
    }

    // 2. Logic tìm variantId (từ nhánh feature/cart-Truong)
    const variants = productDetails?.variants || initialProduct?.variants || [];
    const selectedVariant = variants.find((v: any) => {
      const sizeAttr = v.attributes?.find((a: any) => a.attributeName === 'Size' || a.attributeName === 'Kích thước') ||
        v.variantAttributes?.find((a: any) => a.value?.attribute?.name === 'Size' || a.value?.attribute?.name === 'Kích thước');
      const colorAttr = v.attributes?.find((a: any) => a.attributeName === 'Color' || a.attributeName === 'Màu sắc' || a.attributeName === 'Màu') ||
        v.variantAttributes?.find((a: any) => a.value?.attribute?.name === 'Color' || a.value?.attribute?.name === 'Màu sắc' || a.value?.attribute?.name === 'Màu');
      const vSize = sizeAttr?.attributeValue || sizeAttr?.value?.value || sizeAttr?.value;
      const vColor = colorAttr?.attributeValue || colorAttr?.value?.value || colorAttr?.value;
      return vSize === selectedSize && vColor === selectedColor;
    }) || variants.find((v: any) => v.isDefault) || variants[0];

    if (!selectedVariant?.variantId) {
      alert("Vui lòng đợi thông tin sản phẩm tải xong hoặc chọn Size khác.");
      return;
    }

    addToCart({
      id: basicInfo.id.toString(),
      variantId: selectedVariant.variantId,
      name: productDetails?.name || basicInfo.name,
      price: Number(productDetails?.basePrice || selectedVariant.price || basicInfo.price),
      image: basicInfo.image || (productDetails?.images?.[0]?.imageUrl),
      ref: selectedVariant.sku || basicInfo.ref,
      quantity: quantity,
      size: selectedSize,
      color: getColorName(selectedColor)
    });
  };

  const getColorName = (val: string) => {
    if (val.startsWith('#')) {
      if (val === '#111') return 'Midnight Black';
      if (val === '#4a0404') return 'Deep Burgundy';
      if (val === '#2a2a2a') return 'Charcoal Grey';
      return 'Selected Color';
    }
    return val;
  }

  const stockLevel = useMemo(() => {
    const variants = productDetails?.variants || initialProduct?.variants || [];
    const selectedVariant = variants.find((v: any) => {
      const sizeAttr = v.attributes?.find((a: any) => a.attributeName === 'Size' || a.attributeName === 'Kích thước') ||
        v.variantAttributes?.find((a: any) => a.value?.attribute?.name === 'Size' || a.value?.attribute?.name === 'Kích thước');
      const colorAttr = v.attributes?.find((a: any) => a.attributeName === 'Color' || a.attributeName === 'Màu sắc' || a.attributeName === 'Màu') ||
        v.variantAttributes?.find((a: any) => a.value?.attribute?.name === 'Color' || a.value?.attribute?.name === 'Màu sắc' || a.value?.attribute?.name === 'Màu');
      const vSize = sizeAttr?.attributeValue || sizeAttr?.value?.value || sizeAttr?.value;
      const vColor = colorAttr?.attributeValue || colorAttr?.value?.value || colorAttr?.value;
      return vSize === selectedSize && vColor === selectedColor;
    });

    if (selectedVariant) {
      return selectedVariant.stockQuantity ?? 15;
    }

    return variants.find((v: any) => v.isDefault)?.stockQuantity ?? 15;
  }, [productDetails, initialProduct, selectedSize, selectedColor]);

  function detailsTrigger(p: any) {
    setProductDetails(null);
    setIsLoading(true);
    const loadData = async () => {
      try {
        const details = await fetchProductById(p.productId || p.id);
        setProductDetails(details);
        if (details.variants && details.variants.length > 0) {
          const defaultVariant = details.variants.find(v => v.isDefault) || details.variants[0];
          const sizeAttr = defaultVariant.variantAttributes?.find(a => a.attribute?.name === 'Size');
          const colorAttr = defaultVariant.variantAttributes?.find(a => a.attribute?.name === 'Color');
          if (sizeAttr) setSelectedSize(sizeAttr.value);
          if (colorAttr) setSelectedColor(colorAttr.value);
          else setSelectedColor('#111');
        }
        if (details.categoryId) {
          const related = await fetchProducts({ category: details.category?.name });
          setRelatedProducts(related.filter(item => item.productId !== (p.productId || p.id)).slice(0, 8));
        }
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); window.scrollTo(0, 0); }
    };
    loadData();
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-bg-dark text-white">
      <div className="flex flex-col lg:flex-row w-full">
        {/* Left Gallery */}
        <div className="w-full lg:w-1/2 lg:h-screen lg:sticky lg:top-0 bg-black relative z-40">
          {isLoading ? (
            <div className="w-full h-[60vh] lg:h-full bg-black animate-pulse" />
          ) : (
            <ProductImageGallery
              images={productDetails?.images || []}
              productName={productDetails?.name || basicInfo.name}
              className="w-full min-h-[60vh] lg:h-full pb-10 lg:pb-0"
              enableZoom={true}
              showThumbnails={true}
              viewLabels={['FRONT VIEW', 'SIDE VIEW', 'BACK VIEW']}
            />
          )}
          <button onClick={() => setView('STORE_COLLECTION')} className="absolute top-6 left-6 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-all cursor-pointer z-10 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
        </div>

        {/* Right Content */}
        <div className="w-full lg:w-1/2 flex flex-col bg-bg-dark">
          <StoreHeader
            setView={setView}
            setCategory={setCategory}
            transparent={false}
            setSearchTerm={setSearchTerm}
            onProductClick={detailsTrigger}
            cartCount={cartCount}
          />

          <div className="flex-1 flex flex-col pt-20"> {/* Add padding top because StoreHeader is fixed */}

            <div className="px-5 py-4 lg:px-10 lg:py-4 flex flex-col gap-4">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <p className="text-primary text-[8px] font-bold tracking-[0.3em] uppercase">{productDetails?.category?.name || 'Exclusive Collection'}</p>
                    <p className="text-gray-500 text-[8px] font-medium tracking-widest uppercase">Ref. {basicInfo.ref}</p>
                  </div>
                  <div className="flex gap-4">
                    <button className="w-10 h-10 flex items-center justify-center rounded-full border border-border-dark hover:border-white hover:text-white text-gray-400 transition-all"><span className="material-symbols-outlined text-xl">favorite</span></button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full border border-border-dark hover:border-white hover:text-white text-gray-400 transition-all"><span className="material-symbols-outlined text-xl">share</span></button>
                  </div>
                </div>

                <h1 className="text-xl lg:text-3xl font-black leading-[1.1] tracking-tight uppercase text-white animate-fade-in-up">
                  {productDetails?.name || basicInfo.name}
                </h1>

                <div className="flex items-center gap-6 pt-2">
                  <span className="text-lg font-bold text-white tracking-tight">
                    {new Intl.NumberFormat('vi-VN').format(productDetails?.basePrice || basicInfo.price)}đ
                  </span>
                  {stockLevel < 10 && (
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[8px] font-bold tracking-wider uppercase border border-red-500/20">
                      <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span>
                      Only {stockLevel} left
                    </span>
                  )}
                  {stockLevel >= 10 && (
                    <span className="text-green-500 text-[8px] font-bold tracking-wider uppercase flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-green-500"></span>
                      In Stock <span className="text-white/40 font-medium tracking-normal normal-case ml-1">({stockLevel} sản phẩm)</span>
                    </span>
                  )}
                </div>

                <p className="text-gray-400 leading-relaxed text-xs max-w-lg">
                  {productDetails?.description || "Crafted from premium materials, this piece defines modern luxury. Features a tailored silhouette, refined hardware, and Aisthea's signature structural design."}
                </p>
              </div>

              <div className="flex flex-col gap-6 border-t border-border-dark/50 pt-6">
                {/* Color Selection */}
                <div>
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 block">
                    Select Color — <span className="text-white">{getColorName(selectedColor)}</span>
                  </span>
                  <div className="flex gap-3">
                    {availableColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${selectedColor === color ? 'border-white scale-110 shadow-xl shadow-white/10 ring-4 ring-white/5' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: color.startsWith('#') ? color : '#555' }}
                        title={color}
                      >
                        {!color.startsWith('#') && <span className="text-[7px] font-bold text-white/40">{color.substring(0, 1)}</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Selection */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500">
                      Select Size — <span className="text-white">{selectedSize || 'None'}</span>
                    </span>
                    <button className="text-[8px] font-bold uppercase tracking-widest text-primary hover:underline underline-offset-4">Size Guide</button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {availableSizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`h-10 border transition-all duration-300 rounded-sm text-[10px] font-black tracking-widest ${selectedSize === size ? 'border-white bg-white text-black' : 'border-border-dark text-gray-500 hover:border-white/50 hover:text-white'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {/* Quantity Selector */}
                <div className="h-12 w-full sm:w-32 border border-border-dark flex items-center justify-between px-3 bg-surface-dark/50 rounded-sm">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">remove</span>
                  </button>
                  <span className="text-white font-black text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-full flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedSize}
                  className={`flex-1 h-14 bg-primary hover:bg-red-600 text-white font-black text-sm tracking-[0.2em] uppercase rounded-sm flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-lg shadow-primary/20 ${!selectedSize ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                >
                  {selectedSize ? (
                    <>Add to Bag <span className="w-px h-6 bg-white/20"></span> {new Intl.NumberFormat('vi-VN').format((productDetails?.basePrice || basicInfo.price) * quantity)}đ</>
                  ) : (
                    'Please Select Size'
                  )}
                </button>
              </div>

              {/* Stylist CTA */}
              <div className="bg-surface-dark/30 border border-border-dark/50 p-3 rounded-sm flex flex-col md:flex-row items-center justify-between gap-2 group hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&h=200&fit=crop" alt="Stylist" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-white font-bold text-xs tracking-tight">Need help with styling?</p>
                    <p className="text-gray-500 text-[10px]">Our master stylists are available for expert advice.</p>
                  </div>
                </div>
                <button className="px-6 py-2 border border-white text-[8px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all whitespace-nowrap">
                  Chat With Stylist
                </button>
              </div>

              <div className="flex flex-col divide-y divide-border-dark border-y border-border-dark mt-4 mb-4">
                {['Product Features', 'Material & Care', 'Shipping & Returns'].map(item => (
                  <details key={item} className="group py-4 cursor-pointer">
                    <summary className="flex items-center justify-between font-black text-[10px] uppercase tracking-[0.2em] list-none select-none text-white/80 group-hover:text-white transition-colors">
                      {item} <span className="material-symbols-outlined text-gray-500 transition-transform group-open:rotate-180">expand_more</span>
                    </summary>
                    <div className="pt-6 text-sm text-gray-400 leading-relaxed max-w-2xl animate-fade-in">
                      <p>Designed with meticulous attention to detail at our flagship workshop. {item === 'Material & Care' ? '100% Premium lightweight wool. Dry clean only. Iron at low temperature if necessary.' : 'Complimentary express shipping on all orders over 5.000.000đ. Easy returns within 14 days of receipt.'}</p>
                    </div>
                  </details>
                ))}
              </div>

              {/* Recently Viewed Strip */}
              {recentProducts.length > 0 && (
                <div className="py-4 border-t border-border-dark/30">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Recently Viewed</span>
                    <div className="h-px flex-1 bg-border-dark/30"></div>
                  </div>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                    {recentProducts.map((rp) => (
                      <button
                        key={rp.productId}
                        onClick={() => detailsTrigger(rp)}
                        className="flex-shrink-0 flex items-center gap-4 p-3 bg-surface-dark/10 border border-border-dark/20 hover:border-primary/50 transition-all rounded-sm group min-w-[200px]"
                      >
                        <div className="w-12 h-12 overflow-hidden bg-surface-dark ring-1 ring-white/5">
                          <img
                            src={getCloudinaryProductCard(rp.images?.[0]?.imageUrl || '')}
                            alt={rp.name}
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider group-hover:text-primary transition-colors truncate max-w-[120px]">{rp.name}</span>
                          <span className="text-[9px] text-gray-500 font-medium">{new Intl.NumberFormat('vi-VN').format(rp.basePrice)}đ</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <div className="mt-10 border-t border-border-dark pt-8">
                <h2 className="text-lg font-bold uppercase tracking-wider mb-4">
                  Customer Reviews
                </h2>

                {reviews.length === 0 && (
                  <p className="text-gray-500 text-sm">Chưa có đánh giá nào.</p>
                )}

                <div className="flex flex-col gap-4">
                  {reviews.map((review) => (
                    <div
                      key={review.reviewId}
                      className="bg-surface-dark/30 border border-border-dark p-4 rounded-sm"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-bold text-sm">{review.user?.fullName}</p>
                        <p className="text-primary text-sm">⭐ {review.rating}</p>
                      </div>
                      <p className="text-gray-400 text-sm">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Products Grid */}
              {suggestedProducts.length > 0 && (
                <div className="mt-2 pt-2 pb-20">
                  <div className="flex flex-col gap-2 mb-6">
                    <span className="text-primary text-[10px] font-black tracking-[0.4em] uppercase">Recommended for You</span>
                    <h2 className="text-3xl font-black uppercase tracking-tight text-white mb-2">You May Also Like</h2>
                    <div className="h-1 w-12 bg-primary"></div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                    {suggestedProducts.map((item) => (
                      <ProductCard
                        key={item.id}
                        id={item.id}
                        name={item.name}
                        price={item.price}
                        image={item.image}
                        images={item.images}
                        category={item.category}
                        status={item.status}
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          detailsTrigger({ productId: parseInt(item.id) });
                        }}
                        showHoverGallery={true}
                        className="scale-[0.8] origin-top-left transition-transform hover:scale-[0.85]"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* You May Also Like - Carousel */}
      {relatedProducts.length > 0 && (
        <section className="px-6 py-12 lg:px-24 bg-bg-dark border-t border-border-dark/30">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 relative">
            <div className="flex flex-col gap-4">
              <span className="text-primary text-[10px] font-black tracking-[0.4em] uppercase">Recommended for You</span>
              <h2 className="text-2xl lg:text-4xl font-black uppercase tracking-tighter text-white">You May Also Like</h2>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => scrollCarousel('left')}
                className="w-12 h-12 flex items-center justify-center rounded-full border border-border-dark hover:border-white hover:text-white text-gray-400 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <button
                onClick={() => scrollCarousel('right')}
                className="w-12 h-12 flex items-center justify-center rounded-full border border-border-dark hover:border-white hover:text-white text-gray-400 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>

          <div
            ref={carouselRef}
            className="flex gap-6 lg:gap-10 overflow-x-auto no-scrollbar scroll-smooth pb-8"
          >
            {relatedProducts.map((p, idx) => (
              <div
                key={p.productId}
                className="group flex-shrink-0 w-[280px] lg:w-[320px] flex flex-col gap-4 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${idx * 100}ms` }}
                onClick={() => {
                  setView('STORE_DETAIL');
                  detailsTrigger(p);
                }}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-surface-dark group">
                  {/* Primary Image */}
                  <img
                    src={getCloudinaryProductCard(p.images?.[0]?.imageUrl || '')}
                    alt={p.name}
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.05] group-hover:opacity-0"
                  />
                  {/* Secondary Image (Swap on Hover) */}
                  <img
                    src={getCloudinaryProductCard(p.images?.[1]?.imageUrl || p.images?.[0]?.imageUrl || '')}
                    alt={p.name}
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-700 scale-[1.05] opacity-0 group-hover:opacity-100"
                  />

                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  {/* Quick Actions overlay */}
                  <div className="absolute bottom-0 left-0 right-0 flex flex-col translate-y-full group-hover:translate-y-0 transition-transform duration-500 overflow-hidden">
                    <button className="h-12 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-colors">
                      Quick View
                    </button>
                    <button className="h-12 bg-black/80 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors">
                      Add to Bag
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-start">
                  <h3 className="text-xs font-bold text-white group-hover:text-primary transition-colors uppercase tracking-wider truncate w-full">{p.name}</h3>
                  <div className="flex gap-3 items-center">
                    <p className="text-xs font-medium text-gray-500">{new Intl.NumberFormat('vi-VN').format(p.basePrice)}đ</p>
                    {p.basePrice > 2000000 && (
                      <span className="text-[8px] font-black text-primary border border-primary/30 px-1.5 rounded-sm">MEMBERS ONLY</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};