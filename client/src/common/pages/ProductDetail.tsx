import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ViewState, CartItem, CategoryType } from '@/types';
import { ProductImageGallery } from '@/common/components/ProductImageGallery';
import { fetchProductById, fetchProducts, Product as ApiProductType, ProductVariant } from '@/common/services/product.service';
import { getCloudinaryProductCard } from '@/common/utils/cloudinary';
import { useProductsAPI } from '@/common/hooks/useProducts';
import { useAuth } from '@/common/contexts/AuthContext';
import { ProductCard } from '@/common/components/ProductCard';
import { Header } from '@/store/components/Header';
import { getReviewsByProduct } from "@/common/services/review.service";
import { getGuestCart, saveGuestCart } from '@/common/services/cart.service';
import { useToast } from '@/common/contexts/ToastContext';
import { useCart } from '@/common/contexts/CartContext';
import { ProductVariantSelector } from '@/common/components/ProductVariantSelector';
import { getPrimaryAttrValue } from '@/common/utils/groupVariantsHelper';

interface ReviewItem {
  reviewId: number;
  rating: number;
  comment: string;
  user?: { fullName: string };
}

interface ProductDetailProps {
  setView: (v: ViewState, id?: number) => void;
  setCategory: (c: CategoryType) => void;
  setCollection: (c: string) => void;
  addToCart: (item: CartItem) => void;
  cartCount: number;
  product?: unknown;
  setSearchTerm: (term: string) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  setView,
  setCategory,
  setCollection,
  addToCart,
  cartCount,
  product,
  setSearchTerm,
}) => {
  const { t } = useTranslation('products');

  const initialProduct = product as Partial<ApiProductType> & {
    productId?: number | string;
    id?: number | string;
    ref?: string;
    img?: string;
    image?: string;
    price?: number;
    category?: string | { name: string };
  } | undefined;

  const [productDetails, setProductDetails] = useState<ApiProductType | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ApiProductType[]>([]);
  const [recentProducts, setRecentProducts] = useState<ApiProductType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const recentRef = React.useRef<HTMLDivElement>(null);

  const [activeVariant, setActiveVariant] = useState<ProductVariant | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const { data: rawAPIProducts = [] } = useProductsAPI();
  // Map API Product[] to the ProductItem shape used by suggestedProducts
  const products = rawAPIProducts.map(p => ({
    id: p.productId.toString(),
    name: p.name,
    price: Number(p.variants?.[0]?.price ?? p.basePrice),
    image: p.images?.[0]?.thumbnailUrl || p.images?.[0]?.imageUrl || '',
    images: p.images?.map(img => ({ imageUrl: img.imageUrl, thumbnailUrl: img.thumbnailUrl || img.imageUrl })),
    category: p.category?.name || '',
    status: (p.variants?.[0]?.stockQuantity ?? 0) === 0 ? 'Out of Stock' : 'In Stock',
  }));
  const { user } = useAuth();
  const { showToast, showCartToast } = useToast();
  const { addItem } = useCart();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  const productId = initialProduct?.id
    ? Number(initialProduct.id)
    : initialProduct?.productId
      ? Number(initialProduct.productId)
      : null;

  // ── Review fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!productId) return;

    const fetchReviews = async () => {
      try {
        const data = await getReviewsByProduct(productId);
        const resData = data as { reviews?: ReviewItem[], data?: { reviews?: ReviewItem[] } };
        const fetchedReviews = resData.reviews ?? resData.data?.reviews ?? [];
        setReviews(fetchedReviews);
      } catch (err) {
        console.error('Error fetching reviews:', err);
      }
    };

    fetchReviews();

    const handleReviewSubmitted = (e: Event) => {
      const { productId: submittedProductId } = (e as CustomEvent).detail ?? {};
      if (submittedProductId === productId) fetchReviews();
    };
    window.addEventListener('review-submitted', handleReviewSubmitted);
    return () => window.removeEventListener('review-submitted', handleReviewSubmitted);
  }, [productId]);

  if (!initialProduct) {
    return (
      <div className="min-h-screen bg-bg-dark text-white flex items-center justify-center">
        {t('pdp.notFound')}
      </div>
    );
  }

  // ── Normalize product data ────────────────────────────────────────────────
  const basicInfo = {
    ...initialProduct,
    image: initialProduct?.image || initialProduct?.img || '',
    ref: initialProduct?.ref || `SKU-${Date.now()}`,
    id: initialProduct?.id || initialProduct?.productId || `temp-${Date.now()}`,
    name: initialProduct?.name || 'Unknown Product',
    price: initialProduct?.price || initialProduct?.basePrice || 0,
    category:
      typeof initialProduct?.category === 'string'
        ? initialProduct.category
        : initialProduct?.category?.name || '',
  };

  const currentActiveId = useMemo(() => {
    return (productDetails?.productId || basicInfo.id).toString();
  }, [productDetails, basicInfo]);

  // ── Recently Viewed tracking ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentActiveId || isNaN(Number(currentActiveId))) return;

    const trackAndLoadRecent = async () => {
      try {
        const id = currentActiveId.toString();
        const storageKey = 'aisthea_recent_views';
        const stored = localStorage.getItem(storageKey);
        let recentIds: string[] = stored
          ? JSON.parse(stored).map((rid: string | number) => rid.toString())
          : [];
        recentIds = [id, ...recentIds.filter(rid => rid !== id)].slice(0, 10);
        localStorage.setItem(storageKey, JSON.stringify(recentIds));

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

  // ── Fetch product details and related products ────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const id =
          typeof basicInfo.id === 'string'
            ? parseInt(basicInfo.id)
            : (basicInfo.id as number);
        const details = await fetchProductById(id);
        setProductDetails(details);
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

  // ── Preload all product images so color-switch is instant ──────────────────
  useEffect(() => {
    if (!productDetails?.images?.length) return;
    productDetails.images.forEach(img => {
      if (img.imageUrl) {
        const preload = new Image();
        preload.src = img.imageUrl;
      }
      if (img.thumbnailUrl) {
        const thumb = new Image();
        thumb.src = img.thumbnailUrl;
      }
    });
  }, [productDetails?.images]);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.clientWidth * 0.8;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // ── Suggested products ────────────────────────────────────────────────────
  const suggestedProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const currentCategory = (
      productDetails?.category?.name ||
      basicInfo.category ||
      ''
    )
      .toString()
      .toLowerCase()
      .trim();
    const currentId = currentActiveId;
    const otherProducts = products.filter(p => p.id.toString() !== currentId);
    const poolA = otherProducts
      .filter(p => (p.category || '').toString().toLowerCase().trim() === currentCategory)
      .sort(() => 0.5 - Math.random());
    const poolB = otherProducts
      .filter(p => (p.category || '').toString().toLowerCase().trim() !== currentCategory)
      .sort(() => 0.5 - Math.random());
    const selectedA = poolA.slice(0, 4);
    const selectedB = poolB.slice(0, 8 - selectedA.length);
    const combined = [...selectedA, ...selectedB];
    if (combined.length < 8 && otherProducts.length > combined.length) {
      const combinedIds = new Set(combined.map(p => p.id));
      const remaining = otherProducts
        .filter(p => !combinedIds.has(p.id))
        .sort(() => 0.5 - Math.random());
      combined.push(...remaining.slice(0, 8 - combined.length));
    }
    return combined.sort(() => 0.5 - Math.random());
  }, [products, productDetails, basicInfo, currentActiveId]);

  // ── All recommendations: merge suggested + related, deduplicated ──────────
  // suggestedProducts are ProductItem (have .id), relatedProducts are ApiProductType (have .productId)
  const allRecommendations = useMemo(() => {
    const seen = new Set<number | string>();
    type RecItem = {
      id?: number | string;
      productId?: number;
      name: string;
      basePrice?: number;
      price?: number;
      images?: { imageUrl: string; thumbnailUrl?: string }[];
    };
    const merged: RecItem[] = [];

    for (const p of suggestedProducts) {
      const id = p.id;
      if (id !== undefined && !seen.has(id)) {
        seen.add(id);
        merged.push({
          id: p.id,
          name: p.name,
          basePrice: p.price,
          price: p.price,
          images: p.images,
        });
      }
    }
    for (const p of relatedProducts) {
      const id = p.productId;
      if (id !== undefined && !seen.has(id)) {
        seen.add(id);
        merged.push({
          id: p.productId,
          productId: p.productId,
          name: p.name,
          basePrice: p.basePrice,
          price: p.basePrice,
          images: p.images,
        });
      }
    }
    return merged.slice(0, 10);

  }, [suggestedProducts, relatedProducts]);

  // ── Add to cart ───────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(async (variant: ProductVariant, qty: number) => {
    if (!variant?.variantId) return;

    if (!user) {
      const guestItems = getGuestCart();
      const existing = guestItems.find(i => i.variantId === variant.variantId);
      if (existing) {
        existing.quantity += qty;
      } else {
        const sizeAttr =
          variant.attributes?.find(
            a => a.attributeName === 'Size' || a.attributeName === 'Kích thước'
          ) ||
          variant.variantAttributes?.find(
            (a: any) =>
              a.value?.attribute?.name === 'Size' ||
              a.value?.attribute?.name === 'Kích thước'
          );
        const colorAttr =
          variant.attributes?.find(
            a =>
              a.attributeName === 'Color' ||
              a.attributeName === 'Màu' ||
              a.attributeName === 'Màu sắc'
          ) ||
          variant.variantAttributes?.find(
            (a: any) =>
              a.value?.attribute?.name === 'Color' ||
              a.value?.attribute?.name === 'Màu' ||
              a.value?.attribute?.name === 'Màu sắc'
          );
        guestItems.push({
          variantId: variant.variantId,
          quantity: qty,
          productName: productDetails?.name || basicInfo.name,
          price: Number(variant.price || productDetails?.basePrice || basicInfo.price),
          imageUrl: basicInfo.image || productDetails?.images?.[0]?.imageUrl || '',
          stockQuantity: variant.stockQuantity ?? 99999,
          size:
            sizeAttr?.attributeValue ||
            (sizeAttr as any)?.value?.value ||
            (sizeAttr as any)?.value ||
            'N/A',
          color:
            colorAttr?.attributeValue ||
            (colorAttr as any)?.value?.value ||
            (colorAttr as any)?.value ||
            'N/A',
        });
      }
      saveGuestCart(guestItems);
      window.dispatchEvent(new Event('storage'));
      showCartToast(
        productDetails?.name || basicInfo.name,
        t('pdp.guestCartSubtitle')
      );
      return;
    }

    try {
      await addItem(variant.variantId, qty, {
        productName: productDetails?.name || basicInfo.name,
        price: Number(variant.price || productDetails?.basePrice || basicInfo.price),
        imageUrl: basicInfo.image || productDetails?.images?.[0]?.imageUrl || '',
        stockQuantity: variant.stockQuantity,
      });
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { code?: string; available?: number } };
      };
      const code = error.response?.data?.code;
      if (code === 'INSUFFICIENT_STOCK') {
        const available = error.response?.data?.available ?? 0;
        showToast({
          type: 'error',
          title: t('pdp.insufficientStock'),
          subtitle: t('pdp.insufficientStockSub', { count: available }),
          duration: 3500,
        });
      } else {
        showToast({
          type: 'error',
          title: t('pdp.addFailed'),
          subtitle: t('pdp.addFailedSub'),
          duration: 3000,
        });
      }
    }
  }, [user, productDetails, basicInfo, addItem, showToast, showCartToast, t]);

  // ── Variant change → sync gallery ─────────────────────────────────────────
  const handleVariantChange = useCallback((variant: ProductVariant | null) => {
    setActiveVariant(variant);
    // Reset gallery index when switching variants
    setGalleryIndex(0);
  }, []);

  const galleryImages = useMemo(() => {
    let images = productDetails?.images || [];
    const variants = productDetails?.variants;
    if (!activeVariant || !images.length || !variants) return images;

    // Use the flexible helper — same logic as groupVariantsHelper / EditProduct
    // It prefers a known color attribute, otherwise falls back to the first attribute.
    const selectedPrimaryVal = getPrimaryAttrValue(
      (activeVariant.attributes as any[]) ?? (activeVariant.variantAttributes as any[]) ?? []
    );

    if (!selectedPrimaryVal) return images;

    // Collect ALL variantIds whose primary attribute value matches the selection
    const matchingVariantIds = (variants as any[])
      .filter(v => {
        const val = getPrimaryAttrValue(
          (v.attributes as any[]) ?? (v.variantAttributes as any[]) ?? []
        );
        return val === selectedPrimaryVal;
      })
      .map((v: any) => v.variantId);

    const specificImages = images.filter((img: any) => img.variantId && matchingVariantIds.includes(img.variantId));
    // Fallback to general (non-variant) images when no specific images are found
    return specificImages.length > 0
      ? specificImages
      : images.filter((img: any) => !img.variantId);
  }, [productDetails?.images, productDetails?.variants, activeVariant]);

  // ── Internal navigation helper ────────────────────────────────────────────
  function detailsTrigger(p: { productId?: number; id?: number | string }) {
    setProductDetails(null);
    setIsLoading(true);
    const loadData = async () => {
      try {
        const fetchId = Number(p.productId || p.id);
        const details = await fetchProductById(fetchId);
        setProductDetails(details);
        if (details.categoryId) {
          const related = await fetchProducts({ category: details.category?.name });
          setRelatedProducts(related.filter(item => item.productId !== fetchId).slice(0, 8));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
        window.scrollTo(0, 0);
      }
    };
    loadData();
  }

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: productDetails?.name || basicInfo.name, url });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      showToast({
        type: 'success',
        title: t('pdp.copyLinkSuccess'),
        subtitle: t('pdp.copyLinkSubtitle'),
        duration: 3000,
      });
    }
  };

  // ── Accordion items ───────────────────────────────────────────────────────
  const accordionItems = [
    {
      label: t('pdp.accordion.features'),
      body: t('pdp.accordion.featuresBody'),
    },
    {
      label: t('pdp.accordion.material'),
      body: t('pdp.accordion.materialBody'),
    },
    {
      label: t('pdp.accordion.shipping'),
      body: t('pdp.accordion.shippingBody'),
    },
  ];

  const viewLabels = [
    t('pdp.viewLabels.0'),
    t('pdp.viewLabels.1'),
    t('pdp.viewLabels.2'),
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen w-full bg-bg-dark text-white">

      {/* ── Header (fixed, full-width) ──────────────────────────────────── */}
      <Header
        setView={setView}
        setCategory={setCategory}
        setCollection={setCollection}
        transparent={false}
        setSearchTerm={setSearchTerm}
        onProductClick={detailsTrigger}
        cartCount={cartCount}
      />

      {/* Two-column zone (sticky gallery + scrollable details) */}
      <div className="flex flex-col lg:flex-row w-full mt-[4rem]">

        {/* LEFT — Sticky Gallery */}
        <div className="w-full lg:w-[48%] xl:w-1/2 lg:sticky lg:top-[4rem] lg:self-start lg:h-[calc(100vh-4rem)] bg-black relative z-40 overflow-hidden">
          {isLoading ? (
            <div className="w-full h-[55vw] lg:h-full bg-black animate-pulse" />
          ) : (
            <ProductImageGallery
              images={galleryImages}
              productName={productDetails?.name || basicInfo.name}
              className="w-full h-[55vw] lg:h-full"
              enableZoom={true}
              showThumbnails={true}
              viewLabels={viewLabels}
            />
          )}

          {/* Fashionable Back button */}
          <button
            onClick={() => setView('STORE_COLLECTION')}
            title={t('pdp.back')}
            className="absolute top-8 left-8 w-12 h-12 flex items-center justify-center 
                       bg-black/20 backdrop-blur-md rounded-full text-white/70 border border-white/10
                       hover:bg-white hover:text-black hover:border-white transition-all duration-500 cursor-pointer z-50 group"
          >
            <span className="material-symbols-outlined text-lg font-light group-hover:scale-110 transition-transform">
              arrow_back_ios_new
            </span>
          </button>
        </div>

        {/* RIGHT — Scrollable product details */}
        <div className="w-full lg:w-[52%] xl:w-1/2 flex flex-col bg-bg-dark
                        lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
          <div className="pl-6 pr-10 py-10 lg:pl-10 lg:pr-14 xl:pl-16 xl:pr-24 flex flex-col gap-8">

            {/* Header row: name + share */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {/* Category breadcrumb */}
                {(productDetails?.category?.name || basicInfo.category) && (
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                    {productDetails?.category?.name || basicInfo.category}
                  </span>
                )}
                <h1 className="text-2xl lg:text-[2rem] font-black leading-[1.05] tracking-tight uppercase text-white">
                  {productDetails?.name || basicInfo.name}
                </h1>
              </div>

              <button
                onClick={handleShare}
                title={t('pdp.share')}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-black/50 backdrop-blur-md
                           rounded-full border border-border-dark hover:border-white hover:text-white
                           text-gray-400 transition-all cursor-pointer z-10"
              >
                <span className="material-symbols-outlined text-xl">share</span>
              </button>
            </div>

            {/* Description */}
            <p className="text-gray-400 leading-relaxed text-sm max-w-xl">
              {productDetails?.description || t('pdp.defaultDesc')}
            </p>

            {/* Divider */}
            <div className="h-px bg-border-dark/40" />

            {/* ── Variant Selector ─────────────────────────────────────── */}
            <ProductVariantSelector
              variants={productDetails?.variants || initialProduct?.variants || []}
              basePrice={Number(productDetails?.basePrice || basicInfo.price)}
              images={productDetails?.images as unknown as { imageUrl: string }[]}
              onVariantChange={handleVariantChange}
              onAddToCart={handleAddToCart}
              showQuantity={true}
            />

            {/* ── Stylist CTA ───────────────────────────────────────────── */}
            <div className="bg-surface-dark/30 border border-border-dark/50 p-4 rounded-sm
                            flex flex-col sm:flex-row items-center justify-between gap-3
                            group hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 group-hover:border-primary/50 transition-colors flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&h=200&fit=crop"
                    alt="Stylist"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-white font-bold text-xs tracking-tight">
                    {t('pdp.stylist.heading')}
                  </p>
                  <p className="text-gray-500 text-[10px]">
                    {t('pdp.stylist.subheading')}
                  </p>
                </div>
              </div>
              <button className="px-6 py-2 border border-white text-[8px] font-black uppercase tracking-[0.2em]
                                 hover:bg-white hover:text-black transition-all whitespace-nowrap">
                {t('pdp.stylist.cta').toUpperCase()}
              </button>
            </div>

            {/* ── Accordion ─────────────────────────────────────────────── */}
            <div className="flex flex-col divide-y divide-border-dark border-y border-border-dark">
              {accordionItems.map(item => (
                <details key={item.label} className="group py-5 cursor-pointer">
                  <summary className="flex items-center justify-between font-black text-xs
                                      uppercase tracking-[0.15em] list-none select-none
                                      text-white/80 group-hover:text-white transition-colors">
                    {item.label}
                    <span className="material-symbols-outlined text-gray-500 transition-transform group-open:rotate-180">
                      expand_more
                    </span>
                  </summary>
                  <div className="pt-4 text-sm text-gray-400 leading-relaxed max-w-2xl animate-fade-in">
                    <p>{item.body}</p>
                  </div>
                </details>
              ))}
            </div>


            {/* ── Customer Reviews ──────────────────────────────────────── */}
            <div className="mt-4 pb-10">
              <h2 className="text-base font-bold uppercase tracking-wider mb-4 flex items-center gap-3">
                <Star size={14} className="text-primary" />
                {t('pdp.reviews.title')}
              </h2>

              {reviews.length === 0 ? (
                <p className="text-gray-500 text-sm">{t('pdp.reviews.empty')}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {reviews.map(review => (
                    <div
                      key={review.reviewId}
                      className="bg-surface-dark/30 border border-border-dark p-4 rounded-sm"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-bold text-sm">{review.user?.fullName}</p>
                        <div className="flex items-center gap-1 text-primary text-xs font-bold">
                          <Star size={10} fill="currentColor" />
                          {review.rating}
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          FULL-WIDTH sections — below the two-column hero
      ══════════════════════════════════════════════════════════════════ */}

      {/* ── Recently Viewed — full-width carousel with side arrows ──────── */}
      <AnimatePresence>
        {recentProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full border-t border-border-dark/30 bg-surface-dark/10 py-10"
          >
            <div className="px-6 lg:px-16 xl:px-24">

              {/* Section header */}
              <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 whitespace-nowrap">
                    {t('pdp.recentlyViewed')}
                  </span>
                  <div className="h-px flex-1 bg-border-dark/30" />
                </div>
                {/* Nav arrows */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => recentRef.current?.scrollBy({ left: -(recentRef.current.clientWidth * 0.75), behavior: 'smooth' })}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-border-dark
                               hover:border-white hover:text-white text-gray-500 transition-all active:scale-90"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                  </button>
                  <button
                    onClick={() => recentRef.current?.scrollBy({ left: recentRef.current.clientWidth * 0.75, behavior: 'smooth' })}
                    className="w-8 h-8 flex items-center justify-center rounded-full border border-border-dark
                               hover:border-white hover:text-white text-gray-500 transition-all active:scale-90"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </button>
                </div>
              </div>

              {/* Carousel with side overlay buttons */}
              <div className="relative group/carousel">
                {/* Left arrow overlay */}
                <button
                  onClick={() => recentRef.current?.scrollBy({ left: -(recentRef.current.clientWidth * 0.75), behavior: 'smooth' })}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 -translate-x-3
                             w-9 h-9 flex items-center justify-center
                             bg-black/70 backdrop-blur-sm border border-border-dark/60
                             hover:border-white hover:text-white text-gray-400
                             rounded-full transition-all opacity-0 group-hover/carousel:opacity-100 active:scale-90"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>

                {/* Scrollable row */}
                <div ref={recentRef} className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
                  {recentProducts.map(rp => (
                    <button
                      key={rp.productId}
                      onClick={() => detailsTrigger(rp as { productId?: number; id?: number | string })}
                      className="flex-shrink-0 flex items-center gap-4 p-4 w-[280px]
                                 bg-surface-dark/20 border border-border-dark/20
                                 hover:border-primary/50 transition-all rounded-sm group"
                    >
                      <div className="w-20 h-20 overflow-hidden bg-surface-dark ring-1 ring-white/5 flex-shrink-0 rounded-sm">
                        <img
                          src={getCloudinaryProductCard(rp.images?.[0]?.imageUrl || '')}
                          alt={rp.name}
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                        />
                      </div>
                      <div className="flex flex-col items-start gap-1.5 min-w-0">
                        <span className="text-[11px] font-bold text-white uppercase tracking-wide
                                         group-hover:text-primary transition-colors line-clamp-2 text-left leading-snug">
                          {rp.name}
                        </span>
                        <span className="text-xs text-gray-400 font-semibold">
                          {new Intl.NumberFormat('vi-VN').format(rp.basePrice)}đ
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Right arrow overlay */}
                <button
                  onClick={() => recentRef.current?.scrollBy({ left: recentRef.current.clientWidth * 0.75, behavior: 'smooth' })}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 translate-x-3
                             w-9 h-9 flex items-center justify-center
                             bg-black/70 backdrop-blur-sm border border-border-dark/60
                             hover:border-white hover:text-white text-gray-400
                             rounded-full transition-all opacity-0 group-hover/carousel:opacity-100 active:scale-90"
                >
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── You Might Also Like — full-width carousel with side arrows ───── */}
      {allRecommendations.length > 0 && (
        <section className="w-full border-t border-border-dark/30 bg-bg-dark py-14 lg:py-20">
          <div className="px-6 lg:px-16 xl:px-24">

            {/* Section header */}
            <div className="flex items-end justify-between mb-8 gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-primary text-[10px] font-black tracking-[0.4em] uppercase">
                  {t('pdp.youMightLike.label')}
                </span>
                <h2 className="text-2xl lg:text-4xl font-black uppercase tracking-tight text-white leading-none">
                  {t('pdp.youMightLike.title').toUpperCase()}
                </h2>
                <div className="h-1 w-10 bg-primary mt-1" />
              </div>

              {/* Header nav arrows */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => scrollCarousel('left')}
                  className="w-9 h-9 flex items-center justify-center rounded-full
                             border border-border-dark hover:border-white hover:text-white
                             text-gray-400 transition-all active:scale-90"
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                </button>
                <button
                  onClick={() => scrollCarousel('right')}
                  className="w-9 h-9 flex items-center justify-center rounded-full
                             border border-border-dark hover:border-white hover:text-white
                             text-gray-400 transition-all active:scale-90"
                >
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Carousel with side overlay buttons */}
            <div className="relative group/recrousel">
              {/* Left edge arrow */}
              <button
                onClick={() => scrollCarousel('left')}
                className="absolute left-0 top-[40%] -translate-y-1/2 z-10 -translate-x-3
                           w-10 h-10 flex items-center justify-center
                           bg-black/70 backdrop-blur-sm border border-border-dark/60
                           hover:border-white hover:text-white text-gray-400
                           rounded-full transition-all opacity-0 group-hover/recrousel:opacity-100 active:scale-90"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>

              {/* Horizontal scroll row */}
              <div
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto no-scrollbar pb-2"
              >
                {allRecommendations.map((item, idx) => {
                  const pid = item.productId ?? (item as any).id;
                  const name = item.name ?? (item as any).name;
                  const price = item.basePrice ?? (item as any).price;
                  const images = item.images ?? (item as any).images;
                  const primaryImg = getCloudinaryProductCard(images?.[0]?.imageUrl || '');
                  const secondaryImg = getCloudinaryProductCard(
                    images?.[1]?.imageUrl || images?.[0]?.imageUrl || ''
                  );

                  return (
                    <motion.div
                      key={`rec-${pid}-${idx}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                      className="group flex-shrink-0 flex flex-col gap-3 cursor-pointer w-[200px] sm:w-[220px] lg:w-[240px]"
                      onClick={() => {
                        detailsTrigger({ productId: pid, id: pid });
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      {/* Image */}
                      <div className="relative aspect-[3/4] overflow-hidden bg-surface-dark">
                        <img
                          src={primaryImg}
                          alt={name}
                          className="absolute inset-0 w-full h-full object-cover
                                     transition-all duration-700 group-hover:scale-[1.04] group-hover:opacity-0"
                        />
                        <img
                          src={secondaryImg}
                          alt={name}
                          className="absolute inset-0 w-full h-full object-cover
                                     transition-all duration-700 scale-[1.04] opacity-0 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Quick action strip */}
                        <div className="absolute bottom-0 left-0 right-0 flex flex-col
                                        translate-y-full group-hover:translate-y-0
                                        transition-transform duration-500 overflow-hidden">
                          <button className="h-10 bg-white text-black text-[9px] font-black uppercase tracking-widest
                                             hover:bg-primary hover:text-white transition-colors">
                            XEM NHANH
                          </button>
                          <button className="h-10 bg-black/80 text-white text-[9px] font-black uppercase tracking-widest
                                             hover:bg-black transition-colors">
                            THÊM VÀO GIỎ
                          </button>
                        </div>

                        {price > 2000000 && (
                          <div className="absolute top-2 left-2 text-[8px] font-black text-primary
                                          border border-primary/40 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-sm">
                            {t('pdp.youMightLike.memberBadge').toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex flex-col gap-1">
                        <h3 className="text-[11px] font-bold text-white group-hover:text-primary
                                       transition-colors uppercase tracking-wider truncate">
                          {name}
                        </h3>
                        <p className="text-[11px] font-medium text-gray-500">
                          {new Intl.NumberFormat('vi-VN').format(price)}đ
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Right edge arrow */}
              <button
                onClick={() => scrollCarousel('right')}
                className="absolute right-0 top-[40%] -translate-y-1/2 z-10 translate-x-3
                           w-10 h-10 flex items-center justify-center
                           bg-black/70 backdrop-blur-sm border border-border-dark/60
                           hover:border-white hover:text-white text-gray-400
                           rounded-full transition-all opacity-0 group-hover/recrousel:opacity-100 active:scale-90"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};