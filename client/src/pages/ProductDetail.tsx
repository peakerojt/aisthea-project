import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';
import { ViewState, CartItem, CategoryType } from '../types';
import { ProductImageGallery } from '../components/ProductImageGallery';
import { fetchProductById, fetchProducts, Product as ApiProductType, ProductVariant } from '../services/product.service';
import { getCloudinaryProductCard } from '../utils/cloudinary';
import { useProducts } from '../contexts/ProductContext';
import { useAuth } from '../contexts/AuthContext';
import { ProductCard } from '../components/ProductCard/ProductCard';
import { StoreHeader } from '../components/StoreHeader';
import { getReviewsByProduct } from "../services/review.service";
import { getGuestCart, saveGuestCart } from '../services/cart.service';
import { useToast } from '../contexts/ToastContext';
import { useCart } from '../contexts/CartContext';
import { ProductVariantSelector } from '../components/Product/ProductVariantSelector';

interface ProductDetailProps {
  setView: (v: ViewState, id?: number) => void;
  setCategory: (c: CategoryType) => void;
  addToCart: (item: CartItem) => void;
  cartCount: number;
  product?: any;
  setSearchTerm: (term: string) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ setView, setCategory, addToCart, cartCount, product: initialProduct, setSearchTerm }) => {
  const [productDetails, setProductDetails] = useState<ApiProductType | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const carouselRef = React.useRef<HTMLDivElement>(null);

  // Active variant resolved by ProductVariantSelector
  const [activeVariant, setActiveVariant] = useState<ProductVariant | null>(null);
  // Gallery image index to sync on color change
  const [galleryIndex, setGalleryIndex] = useState(0);

  const { products } = useProducts();
  const { user } = useAuth();
  const { showToast, showCartToast } = useToast();
  const { addItem } = useCart();
  const [reviews, setReviews] = useState<any[]>([]);
  const productId = initialProduct?.id
    ? Number(initialProduct.id)
    : initialProduct?.productId
      ? Number(initialProduct.productId)
      : null;

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
        const resData = data as any;
        const fetchedReviews = resData.reviews ?? resData.data?.reviews ?? [];
        setReviews(fetchedReviews);
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
    return <div className="min-h-screen bg-bg-dark text-white flex items-center justify-center">Không tìm thấy sản phẩm.</div>;
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

        // Related products

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

  // ── Add to cart (called by ProductVariantSelector) ───────────────────────
  const handleAddToCart = useCallback(async (variant: ProductVariant, qty: number) => {
    if (!variant?.variantId) return;

    if (!user) {
      // Guest mode
      const guestItems = getGuestCart();
      const existing = guestItems.find(i => i.variantId === variant.variantId);
      if (existing) {
        existing.quantity += qty;
      } else {
        const sizeAttr = variant.attributes?.find(a => a.attributeName === 'Size' || a.attributeName === 'Kích thước') ||
          variant.variantAttributes?.find((a: any) => a.value?.attribute?.name === 'Size' || a.value?.attribute?.name === 'Kích thước');
        const colorAttr = variant.attributes?.find(a => a.attributeName === 'Color' || a.attributeName === 'Màu' || a.attributeName === 'Màu sắc') ||
          variant.variantAttributes?.find((a: any) => a.value?.attribute?.name === 'Color' || a.value?.attribute?.name === 'Màu' || a.value?.attribute?.name === 'Màu sắc');

        guestItems.push({
          variantId: variant.variantId,
          quantity: qty,
          productName: productDetails?.name || basicInfo.name,
          price: Number(variant.price || productDetails?.basePrice || basicInfo.price),
          imageUrl: basicInfo.image || productDetails?.images?.[0]?.imageUrl || '',
          stockQuantity: variant.stockQuantity ?? 99999,
          size: sizeAttr?.attributeValue || (sizeAttr as any)?.value?.value || (sizeAttr as any)?.value || 'N/A',
          color: colorAttr?.attributeValue || (colorAttr as any)?.value?.value || (colorAttr as any)?.value || 'N/A',
        });
      }
      saveGuestCart(guestItems);
      // Dispatch storage event to notify other components (like CartContext) to re-read localStorage
      window.dispatchEvent(new Event('storage'));

      showCartToast(productDetails?.name || basicInfo.name, 'Đăng nhập để hoàn tất mua hàng');
      return;
    }

    try {
      await addItem(variant.variantId, qty, {
        productName: productDetails?.name || basicInfo.name,
        price: Number(variant.price || productDetails?.basePrice || basicInfo.price),
        imageUrl: basicInfo.image || productDetails?.images?.[0]?.imageUrl || '',
        stockQuantity: variant.stockQuantity,
      });
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'INSUFFICIENT_STOCK') {
        const available = err?.response?.data?.available ?? 0;
        showToast({ type: 'error', title: 'Không đủ hàng', subtitle: `Chỉ còn ${available} sản phẩm trong kho.`, duration: 3500 });
      } else {
        showToast({ type: 'error', title: 'Thêm thất bại', subtitle: 'Vui lòng thử lại.', duration: 3000 });
      }
    }
  }, [user, productDetails, basicInfo, addItem, showToast, showCartToast]);

  // ── Variant change → sync gallery ────────────────────────────────────────
  const handleVariantChange = useCallback((variant: ProductVariant | null) => {
    setActiveVariant(variant);
    if (!variant || !productDetails?.images?.length) return;
    // Try to find an image associated with the primary attr value of this variant
    const primaryAttrVal =
      variant.attributes?.[0]?.attributeValue ||
      variant.variantAttributes?.[0]?.value?.value;
    if (!primaryAttrVal) return;
    const idx = productDetails.images.findIndex(
      img => (img as any).associatedAttributeValue === primaryAttrVal
    );
    if (idx >= 0) setGalleryIndex(idx);
  }, [productDetails]);

  const stockLevel = activeVariant?.stockQuantity ?? null;

  function detailsTrigger(p: any) {
    setProductDetails(null);
    setIsLoading(true);
    const loadData = async () => {
      try {
        const details = await fetchProductById(p.productId || p.id);
        setProductDetails(details);
        if (details.categoryId) {
          const related = await fetchProducts({ category: details.category?.name });
          setRelatedProducts(related.filter(item => item.productId !== (p.productId || p.id)).slice(0, 8));
        }
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); window.scrollTo(0, 0); }
    };
    loadData();
  }

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: productDetails?.name || basicInfo.name,
          url: url
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      showToast({ type: 'success', title: 'Đã sao chép liên kết', subtitle: 'Bạn có thể chia sẻ liên kết này.', duration: 3000 });
    }
  };

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
              viewLabels={['MẶT TRƯỚC', 'MẶT CẠNH', 'MẶT SAU']}
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

          <div className="flex-1 flex flex-col w-full z-10 pt-20">

            <div className="px-5 py-2 lg:px-10 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex justify-end items-start">
                  <div className="flex gap-4">
                    <button onClick={handleShare} className="w-10 h-10 flex items-center justify-center bg-black/50 backdrop-blur-md rounded-full border border-border-dark hover:border-white hover:text-white text-gray-400 transition-all cursor-pointer z-50 pointer-events-auto"><span className="material-symbols-outlined text-xl">share</span></button>
                  </div>
                </div>

                <h1 className="text-xl lg:text-3xl font-black leading-[1.1] tracking-tight uppercase text-white animate-fade-in-up mt-0">
                  {productDetails?.name || basicInfo.name}
                </h1>

                {/* Price and stock are now driven by ProductVariantSelector below */}

                <p className="text-gray-400 leading-relaxed text-xs max-w-lg">
                  {productDetails?.description || "Được chế tác từ những vật liệu cao cấp, sản phẩm này định nghĩa lại sự sang trọng hiện đại. Nổi bật với kiểu dáng được cắt may tỉ mỉ, phụ kiện tinh tế và thiết kế cấu trúc mang tính biểu tượng của Aisthea."}
                </p>
              </div>

              {/* ── ProductVariantSelector (Pro Max) ──────────────────── */}
              <div className="border-t border-border-dark/50 pt-6">
                <ProductVariantSelector
                  variants={productDetails?.variants || initialProduct?.variants || []}
                  basePrice={Number(productDetails?.basePrice || basicInfo.price)}
                  images={productDetails?.images as any}
                  onVariantChange={handleVariantChange}
                  onAddToCart={handleAddToCart}
                  showQuantity={true}
                />
              </div>

              {/* Stylist CTA */}
              <div className="bg-surface-dark/30 border border-border-dark/50 p-3 rounded-sm flex flex-col md:flex-row items-center justify-between gap-2 group hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 group-hover:border-primary/50 transition-colors">
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&h=200&fit=crop" alt="Stylist" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-white font-bold text-xs tracking-tight">Cần hỗ trợ phối đồ?</p>
                    <p className="text-gray-500 text-[10px]">Các stylist của chúng tôi luôn sẵn sàng tư vấn chuyên nghiệp.</p>
                  </div>
                </div>
                <button className="px-6 py-2 border border-white text-[8px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all whitespace-nowrap">
                  TRÒ CHUYỆN CÙNG STYLIST
                </button>
              </div>

              <div className="flex flex-col divide-y divide-border-dark border-y border-border-dark mt-4 mb-4">
                {['ĐẶC ĐIỂM SẢN PHẨM', 'CHẤT LIỆU & BẢO QUẢN', 'VẬN CHUYỂN & ĐỔI TRẢ'].map(item => (
                  <details key={item} className="group py-4 cursor-pointer">
                    <summary className="flex items-center justify-between font-black text-[10px] uppercase tracking-[0.2em] list-none select-none text-white/80 group-hover:text-white transition-colors">
                      {item} <span className="material-symbols-outlined text-gray-500 transition-transform group-open:rotate-180">expand_more</span>
                    </summary>
                    <div className="pt-6 text-sm text-gray-400 leading-relaxed max-w-2xl animate-fade-in">
                      <p>{item === 'ĐẶC ĐIỂM SẢN PHẨM' ? 'Được thiết kế với sự chú ý tỉ mỉ đến từng chi tiết tại xưởng chính của chúng tôi.' : item === 'CHẤT LIỆU & BẢO QUẢN' ? '100% Wool siêu nhẹ cao cấp. Chỉ giặt khô. Ủi ở nhiệt độ thấp nếu cần thiết.' : 'Miễn phí giao hàng nhanh cho mọi đơn hàng từ 5.000.000đ. Đổi trả dễ dàng trong vòng 14 ngày sau khi nhận hàng.'}</p>
                    </div>
                  </details>
                ))}
              </div>

              {/* Recently Viewed Strip */}
              {recentProducts.length > 0 && (
                <div className="py-4 border-t border-border-dark/30">
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">VỪA MỚI XEM</span>
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
                  Đánh giá của khách hàng
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
                    <span className="text-primary text-[10px] font-black tracking-[0.4em] uppercase">GỢI Ý CHO BẠN</span>
                    <h2 className="text-3xl font-black uppercase tracking-tight text-white mb-2">CÓ THỂ BẠN SẼ THÍCH</h2>
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
              <span className="text-primary text-[10px] font-black tracking-[0.4em] uppercase">GỢI Ý MUA SẮM</span>
              <h2 className="text-2xl lg:text-4xl font-black uppercase tracking-tighter text-white">SẢN PHẨM TƯƠNG TỰ</h2>
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
                      XEM NHANH
                    </button>
                    <button className="h-12 bg-black/80 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors">
                      THÊM VÀO GIỎ
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-start">
                  <h3 className="text-xs font-bold text-white group-hover:text-primary transition-colors uppercase tracking-wider truncate w-full">{p.name}</h3>
                  <div className="flex gap-3 items-center">
                    <p className="text-xs font-medium text-gray-500">{new Intl.NumberFormat('vi-VN').format(p.basePrice)}đ</p>
                    {p.basePrice > 2000000 && (
                      <span className="text-[8px] font-black text-primary border border-primary/30 px-1.5 rounded-sm">DÀNH CHO THÀNH VIÊN</span>
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