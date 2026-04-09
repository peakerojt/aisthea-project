import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProductImageGallery } from '@/common/components/ProductImageGallery';
import {
  fetchProductById,
  fetchProducts,
  Product as ApiProductType,
  ProductVariant,
  FlatVariantAttribute,
  NestedVariantAttribute,
  ProductImage,
} from '@/common/services/product.service';
import { getCloudinaryProductCard } from '@/common/utils/cloudinary';
import { useProductsAPI } from '@/common/hooks/useProducts';
import { Header } from '@/store/components/Header';
import { getReviewsByProduct } from "@/common/services/review.service";
import { useToast } from '@/common/contexts/ToastContext';
import { useCart } from '@/common/contexts/CartContext';
import { ProductVariantSelector } from '@/common/components/ProductVariantSelector';
import { ChatWidget } from '@/common/components/ChatWidget';
import { getPrimaryAttrValue } from '@/common/utils/groupVariantsHelper';

const RECENTLY_VIEWED_KEY = 'aisthea_recently_viewed_v1';
const MAX_RECENTLY_VIEWED = 10;

interface ReviewItem {
  reviewId: number;
  rating: number;
  comment: string;
  user?: { fullName: string };
}

interface ProductCardItem {
  id: string;
  name: string;
  price: number;
  image: string;
  images?: { imageUrl: string; thumbnailUrl?: string }[];
  category: string;
  status: 'In Stock' | 'Out of Stock';
}

interface RecommendationItem {
  id: number;
  name: string;
  price: number;
  images: { imageUrl: string; thumbnailUrl?: string }[];
}

const SIZE_ATTRIBUTE_NAMES = new Set(['size', 'kich thuoc', 'kích thước']);
const COLOR_ATTRIBUTE_NAMES = new Set(['color', 'mau', 'màu', 'màu sắc']);

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const getVariantAttributeValue = (
  variant: ProductVariant,
  candidates: Set<string>,
): string | undefined => {
  const fromFlat = variant.attributes?.find((attr) => {
    const name = normalizeText(attr.attributeName ?? attr.attribute?.name ?? '');
    return candidates.has(name);
  });
  if (fromFlat) {
    return fromFlat.attributeValue ?? fromFlat.value;
  }

  const fromNested = variant.variantAttributes?.find((attr) => {
    const name = normalizeText(attr.value?.attribute?.name ?? attr.attribute?.name ?? '');
    return candidates.has(name);
  });

  return fromNested?.value?.value ?? fromNested?.attributeValue;
};

type PrimaryAttributeInput = {
  attributeName?: string;
  attributeValue?: string;
};

const isPrimaryAttributeInput = (
  attribute: PrimaryAttributeInput,
): attribute is Required<PrimaryAttributeInput> =>
  Boolean(attribute.attributeName && attribute.attributeValue);

const toPrimaryAttributeInput = (variant: ProductVariant): PrimaryAttributeInput[] => {
  const fromFlat =
    variant.attributes?.map((attribute: FlatVariantAttribute) => ({
      attributeName: attribute.attributeName ?? attribute.attribute?.name,
      attributeValue: attribute.attributeValue ?? attribute.value,
    })) ?? [];

  const fromNested =
    variant.variantAttributes?.map((attribute: NestedVariantAttribute) => ({
      attributeName: attribute.attribute?.name ?? attribute.value?.attribute?.name,
      attributeValue: attribute.value?.value ?? attribute.attributeValue,
    })) ?? [];

  return [...fromFlat, ...fromNested].filter(isPrimaryAttributeInput);
};

const isStorefrontVisible = (status?: string) => status === 'Active';

export const ProductDetail: React.FC = () => {
  const { t } = useTranslation('products');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const paramId = id ? Number(id) : null;

  const [productDetails, setProductDetails] = useState<ApiProductType | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ApiProductType[]>([]);
  const [recentProducts, setRecentProducts] = useState<ApiProductType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const recentRef = React.useRef<HTMLDivElement>(null);

  const [activeVariant, setActiveVariant] = useState<ProductVariant | null>(null);
  const productId = useMemo(() => {
    if (!paramId || !Number.isFinite(paramId)) return null;
    return paramId;
  }, [paramId]);

  const { data: rawAPIProducts = [] } = useProductsAPI();
  const products = useMemo<ProductCardItem[]>(() => {
    return rawAPIProducts
      .filter((product) => isStorefrontVisible(product.status))
      .map((product) => ({
      id: product.productId.toString(),
      name: product.name,
      price: Number(product.variants?.[0]?.price ?? product.basePrice),
      image: product.images?.[0]?.thumbnailUrl || product.images?.[0]?.imageUrl || '',
      images: product.images?.map((image) => ({
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl || image.imageUrl,
      })),
        category: product.category?.name || '',
      status: (product.variants?.[0]?.stockQuantity ?? 0) === 0 ? 'Out of Stock' : 'In Stock',
      }));
  }, [rawAPIProducts]);

  const { showToast } = useToast();
  const { addItem } = useCart();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  const basicInfo = useMemo(() => {
    return {
      image: productDetails?.images?.[0]?.thumbnailUrl || productDetails?.images?.[0]?.imageUrl || '',
        ref: `SKU-${productId ?? 'unknown'}`,
        id: productDetails?.productId ?? productId ?? 'temp-product',
      name: productDetails?.name || 'Sản phẩm chưa xác định',
      price: Number(productDetails?.basePrice ?? 0),
      category: productDetails?.category?.name || '',
    };
  }, [productDetails, productId]);

  const currentActiveId = useMemo(() => {
    return (productDetails?.productId ?? productId ?? basicInfo.id)?.toString();
  }, [productDetails?.productId, productId, basicInfo.id]);

  // â”€â”€ Review fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // Fetch product details and related products
  useEffect(() => {
    if (!productId) return;
    const loadData = async () => {
      try {
        setIsLoading(true);
        const details = await fetchProductById(productId);
        if (!isStorefrontVisible(details.status)) {
          navigate('/collection', { replace: true });
          return;
        }
        setProductDetails(details);
        if (details.category?.slug) {
          const related = await fetchProducts({ category: details.category.slug });
          setRelatedProducts(related.filter(p => p.productId !== productId).slice(0, 8));
        } else {
          setRelatedProducts([]);
        }
      } catch (error) {
        console.error('Failed to load product details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    window.scrollTo(0, 0);
  }, [navigate, productId]);

  useEffect(() => {
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentProducts(
          parsed.filter(
            (item) =>
              item &&
              typeof item.productId === 'number' &&
              isStorefrontVisible(item.status),
          ),
        );
      }
    } catch (error) {
      console.error('Failed to parse recently viewed products:', error);
    }
  }, []);

  useEffect(() => {
    if (!productDetails?.productId) return;

    let parsed: ApiProductType[] = [];
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);

    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (Array.isArray(data)) {
          parsed = data as ApiProductType[];
        }
      } catch (error) {
        console.error('Failed to parse recently viewed products:', error);
      }
    }

    const deduped = parsed.filter(
      item =>
        item &&
        item.productId !== productDetails.productId &&
        isStorefrontVisible(item.status),
    );
    const next = [productDetails, ...deduped].slice(0, MAX_RECENTLY_VIEWED);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
    setRecentProducts(
      next.filter(
        (item) => item.productId !== productDetails.productId && isStorefrontVisible(item.status),
      ),
    );
  }, [productDetails]);

  // Preload all product images so color-switch is instant
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

  const scrollRecent = (direction: 'left' | 'right') => {
    if (recentRef.current) {
      const scrollAmount = recentRef.current.clientWidth * 0.8;
      recentRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // â”€â”€ Suggested products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ All recommendations: merge suggested + related, deduplicated â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // suggestedProducts are ProductItem (have .id), relatedProducts are ApiProductType (have .productId)
  const allRecommendations = useMemo<RecommendationItem[]>(() => {
    const seen = new Set<number>();
    const merged: RecommendationItem[] = [];

    for (const product of suggestedProducts) {
      const id = Number(product.id);
      if (!Number.isFinite(id) || seen.has(id)) continue;

      seen.add(id);
      merged.push({
        id,
        name: product.name,
        price: product.price,
        images: product.images ?? [],
      });
    }

    for (const product of relatedProducts) {
      const id = product.productId;
      if (!id || seen.has(id)) continue;

      seen.add(id);
      merged.push({
        id,
        name: product.name,
        price: Number(product.basePrice),
        images: product.images ?? [],
      });
    }

    return merged.slice(0, 10);
  }, [suggestedProducts, relatedProducts]);

  // â”€â”€ Add to cart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleAddToCart = useCallback(async (variant: ProductVariant, qty: number) => {
    if (!variant?.variantId || qty <= 0) {
      return;
    }

    const sizeValue = getVariantAttributeValue(variant, SIZE_ATTRIBUTE_NAMES) ?? 'N/A';
    const colorValue = getVariantAttributeValue(variant, COLOR_ATTRIBUTE_NAMES) ?? 'N/A';

    await addItem(variant.variantId, qty, {
      productName: productDetails?.name || basicInfo.name,
      price: Number(variant.price || productDetails?.basePrice || basicInfo.price),
      imageUrl: basicInfo.image || productDetails?.images?.[0]?.imageUrl || '',
      stockQuantity: variant.stockQuantity,
      size: sizeValue,
      color: colorValue,
    });
  }, [productDetails, basicInfo, addItem]);

  // â”€â”€ Variant change â†’ sync gallery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleVariantChange = useCallback((variant: ProductVariant | null) => {
    setActiveVariant(variant);
  }, []);

  const galleryImages = useMemo(() => {
    const images: ProductImage[] = productDetails?.images ?? [];
    const variants = productDetails?.variants ?? [];
    if (!activeVariant || images.length === 0 || variants.length === 0) return images;

    // Use the flexible helper â€” same logic as groupVariantsHelper / EditProduct
    // It prefers a known color attribute, otherwise falls back to the first attribute.
    const selectedPrimaryVal = getPrimaryAttrValue(toPrimaryAttributeInput(activeVariant));

    if (!selectedPrimaryVal) return images;

    // Collect ALL variantIds whose primary attribute value matches the selection
    const matchingVariantIds = variants
      .filter((variant) => {
        const value = getPrimaryAttrValue(toPrimaryAttributeInput(variant));
        return value === selectedPrimaryVal;
      })
      .map((variant) => variant.variantId);

    const specificImages = images.filter(
      (image) => image.variantId != null && matchingVariantIds.includes(image.variantId),
    );
    // Fallback to general (non-variant) images when no specific images are found
    return specificImages.length > 0 ? specificImages : images.filter((image) => image.variantId == null);
  }, [productDetails?.images, productDetails?.variants, activeVariant]);

  // â”€â”€ Internal navigation helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function detailsTrigger(p: { productId?: number; id?: number | string }) {
    const fetchId = Number(p.productId || p.id);
    if (!Number.isFinite(fetchId)) return;
    setProductDetails(null);
    setRelatedProducts([]);
    setRecentProducts([]);
    setIsLoading(true);
    navigate(`/product/${fetchId}`);
    window.scrollTo(0, 0);
  }

  // â”€â”€ Share â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Accordion items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // RENDER
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="flex flex-col min-h-screen w-full bg-bg-dark text-white">

      {/* â”€â”€ Header (fixed, full-width) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Header />

      {/* Two-column zone (sticky gallery + scrollable details) */}
      <div className="flex flex-col lg:flex-row w-full mt-[4rem]">

        {/* LEFT â€” Sticky Gallery */}
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
            onClick={() => navigate('/collection')}
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

        {/* RIGHT â€” Scrollable product details */}
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

            {/* â”€â”€ Variant Selector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <ProductVariantSelector
              variants={productDetails?.variants ?? []}
              basePrice={Number(productDetails?.basePrice || basicInfo.price)}
              images={productDetails?.images ?? []}
              sizeGuide={productDetails?.sizeGuide}
              onVariantChange={handleVariantChange}
              onAddToCart={handleAddToCart}
              onRequestSizeAdvice={() => navigate('/stylist')}
              showQuantity={true}
            />

            {/* â”€â”€ Stylist CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="bg-surface-dark/30 border border-border-dark/50 p-4 rounded-sm
                            flex flex-col sm:flex-row items-center justify-between gap-3
                            group hover:border-primary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20 group-hover:border-primary/50 transition-colors flex-shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&h=200&fit=crop"
                      alt="Chuyên gia tư vấn AISTHEA"
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
              <button
                onClick={() => navigate('/stylist')}
                className="px-6 py-2 border border-white text-[8px] font-black uppercase tracking-[0.2em]
                                 hover:bg-white hover:text-black transition-all whitespace-nowrap"
              >
                {t('pdp.stylist.cta').toUpperCase()}
              </button>
            </div>

            {/* â”€â”€ Accordion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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


            {/* â”€â”€ Customer Reviews â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          FULL-WIDTH sections â€” below the two-column hero
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}

      {/* â”€â”€ Recently Viewed â€” full-width carousel with side arrows â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {recentProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full border-t border-border-dark/30 bg-bg-dark py-14 lg:py-20"
          >
            <div className="px-6 lg:px-16 xl:px-24">

              {/* Section header */}
              <div className="flex items-end justify-between mb-8 gap-6">
                <div className="flex flex-col gap-2">
                  <span className="text-primary text-[10px] font-black tracking-[0.4em] uppercase">
                    {t('pdp.recentlyViewed')}
                  </span>
                  <h2 className="text-2xl lg:text-4xl font-black uppercase tracking-tight text-white leading-none">
                    {t('pdp.recentlyViewed').toUpperCase()}
                  </h2>
                  <div className="h-1 w-10 bg-primary mt-1" />
                </div>

                {/* Header nav arrows */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => scrollRecent('left')}
                    className="w-9 h-9 flex items-center justify-center rounded-full
                               border border-border-dark hover:border-white hover:text-white
                               text-gray-400 transition-all active:scale-90"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                  </button>
                  <button
                    onClick={() => scrollRecent('right')}
                    className="w-9 h-9 flex items-center justify-center rounded-full
                               border border-border-dark hover:border-white hover:text-white
                               text-gray-400 transition-all active:scale-90"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </button>
                </div>
              </div>

              {/* Carousel with side overlay buttons */}
              <div className="relative group/recent">
                {/* Left edge arrow */}
                <button
                  onClick={() => scrollRecent('left')}
                  className="absolute left-0 top-[40%] -translate-y-1/2 z-10 -translate-x-3
                             w-10 h-10 flex items-center justify-center
                             bg-black/70 backdrop-blur-sm border border-border-dark/60
                             hover:border-white hover:text-white text-gray-400
                             rounded-full transition-all opacity-0 group-hover/recent:opacity-100 active:scale-90"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                {/* Horizontal scroll row */}
                <div
                  ref={recentRef}
                  className="flex gap-4 overflow-x-auto no-scrollbar pb-2"
                >
                  {recentProducts.map((item, idx) => {
                    const pid = item.productId;
                    const name = item.name;
                    const price = Number(item.basePrice);
                    const images = item.images ?? [];
                    const primaryImg = getCloudinaryProductCard(images?.[0]?.imageUrl || '');
                    const secondaryImg = getCloudinaryProductCard(
                      images?.[1]?.imageUrl || images?.[0]?.imageUrl || ''
                    );

                    return (
                      <motion.div
                        key={`recent-${pid}-${idx}`}
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
                  onClick={() => scrollRecent('right')}
                  className="absolute right-0 top-[40%] -translate-y-1/2 z-10 translate-x-3
                             w-10 h-10 flex items-center justify-center
                             bg-black/70 backdrop-blur-sm border border-border-dark/60
                             hover:border-white hover:text-white text-gray-400
                             rounded-full transition-all opacity-0 group-hover/recent:opacity-100 active:scale-90"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* â”€â”€ You Might Also Like â€” full-width carousel with side arrows â”€â”€â”€â”€â”€ */}
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
                  const pid = item.id;
                  const name = item.name;
                  const price = item.price;
                  const images = item.images;
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

      {productId ? <ChatWidget page="product" productId={productId} productName={productDetails?.name} /> : null}
    </div>
  );
};









