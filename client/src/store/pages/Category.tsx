import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/store/components/Header';
import { useTranslation } from 'react-i18next';
import { useProductsAPI } from '@/common/hooks/useProducts';
import { Product } from '@/common/services/product.service';
import { getCloudinaryProductCard } from '@/common/utils/cloudinary';

const CATEGORY_IMAGES = {
  Men: {
    Outerwear: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=2574&auto=format&fit=crop',
    Tops: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=2574&auto=format&fit=crop',
    Bottoms: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=2574&auto=format&fit=crop',
    Shoes: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=2574&auto=format&fit=crop',
  },
  Women: {
    Outerwear: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=2574&auto=format&fit=crop',
    Tops: 'https://images.unsplash.com/photo-1485218126466-34e6392ec754?q=80&w=2574&auto=format&fit=crop',
    Bottoms: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?q=80&w=2574&auto=format&fit=crop',
    Shoes: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=2574&auto=format&fit=crop',
  },
  Accessories: {
    Bags: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=2574&auto=format&fit=crop',
    Jewelry: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=2574&auto=format&fit=crop',
    Eyewear: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?q=80&w=2574&auto=format&fit=crop',
    Watches: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=2574&auto=format&fit=crop',
  }
};

const GENDER_KEYWORDS = {
  Men: ['nam', 'men', 'man', 'male'],
  Women: ['nu', 'nữ', 'women', 'woman', 'female'],
  Accessories: ['phu kien', 'phụ kiện', 'accessories', 'bag', 'tui', 'túi', 'jewelry', 'trang suc', 'trang sức', 'watch', 'dong ho', 'đồng hồ', 'eyewear', 'kinh', 'kính'],
};

const TRENDING_KEYWORDS = {
  Men: {
    Outerwear: ['ao khoac', 'áo khoác', 'jacket', 'coat', 'blazer', 'hoodie'],
    Tops: ['ao', 'áo', 'shirt', 'tee', 't-shirt', 'polo', 'sweater'],
    Bottoms: ['quan', 'quần', 'pants', 'trouser', 'jeans', 'shorts'],
    Shoes: ['giay', 'giày', 'shoe', 'sneaker', 'loafer', 'boot'],
  },
  Women: {
    Outerwear: ['ao khoac', 'áo khoác', 'jacket', 'coat', 'blazer', 'cardigan'],
    Tops: ['ao', 'áo', 'shirt', 'tee', 'blouse', 'crop', 'knit'],
    Bottoms: ['quan', 'quần', 'pants', 'skirt', 'jeans', 'shorts'],
    Shoes: ['giay', 'giày', 'shoe', 'heel', 'sandal', 'sneaker'],
  },
  Accessories: {
    Bags: ['tui', 'túi', 'bag', 'mini bag', 'tote', 'crossbody'],
    Jewelry: ['trang suc', 'trang sức', 'jewelry', 'necklace', 'ring', 'bracelet'],
    Eyewear: ['kinh', 'kính', 'eyewear', 'glasses', 'sunglasses'],
    Watches: ['dong ho', 'đồng hồ', 'watch', 'chrono'],
  },
};

const formatPrice = (price: number): string => new Intl.NumberFormat('vi-VN').format(price);

const SECTION_LABELS: Record<string, string> = {
  Outerwear: 'Áo khoác',
  Tops: 'Áo',
  Bottoms: 'Quần',
  Shoes: 'Giày',
  Accessories: 'Phụ kiện',
  Bags: 'Túi xách',
  Jewelry: 'Trang sức',
  Eyewear: 'Kính mắt',
  Watches: 'Đồng hồ',
};

const translateProductTag = (tag?: string): string => {
  if (tag === 'Best Seller') return 'Bán chạy';
  if (tag === 'Sale') return 'Giảm giá';
  if (tag === 'New') return 'Mới';
  return tag || '';
};

const translateSectionLabel = (section: string): string => SECTION_LABELS[section] || section;
const normalizeText = (value?: string | null): string => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const Category: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'category' });
  const navigate = useNavigate();
  const { data: rawProducts = [], isLoading } = useProductsAPI();
  const { gender = 'men' } = useParams<{ gender: string }>();
  const category = (gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase()) as keyof typeof CATEGORY_IMAGES;
  const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Men'];
  const sections = Object.keys(images);
  const genderKeywords = GENDER_KEYWORDS[category] || GENDER_KEYWORDS['Men'];
  const categoryKeywordGroups = TRENDING_KEYWORDS[category] || TRENDING_KEYWORDS['Men'];
  const fallbackImage = images[sections[0] as keyof typeof images];

  const getProductScore = (product: Product): number => {
    const haystack = normalizeText([
      product.name,
      product.slug,
      product.description,
      product.category?.name,
      product.brand?.name,
    ].filter(Boolean).join(' '));

    const genderScore = genderKeywords.reduce((score, keyword) => score + (haystack.includes(keyword) ? 4 : 0), 0);
    const sectionScore = sections.reduce((score, section) => {
      const keywords = categoryKeywordGroups[section as keyof typeof categoryKeywordGroups] || [];
      return score + keywords.reduce((sectionTotal, keyword) => sectionTotal + (haystack.includes(keyword) ? 2 : 0), 0);
    }, 0);
    const stockScore = (product.variants?.[0]?.stockQuantity ?? 0) > 0 ? 2 : 0;
    const imageScore = product.images?.length ? 1 : 0;

    return genderScore + sectionScore + stockScore + imageScore;
  };

  const getProductTag = (product: Product, rank: number): string | undefined => {
    if (rank === 0) return 'Best Seller';

    const createdAt = new Date(product.createdAt);
    if (!Number.isNaN(createdAt.getTime())) {
      const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (ageInDays <= 45) return 'New';
    }

    return undefined;
  };

  const mappedTrendingItems = rawProducts
    .map((product) => ({ product, score: getProductScore(product) }))
    .filter(({ score }) => score > 0);

  const rankedTrendingProducts = (mappedTrendingItems.length >= 4 ? mappedTrendingItems : rawProducts.map((product) => ({ product, score: getProductScore(product) })))
    .sort((left, right) => right.score - left.score || right.product.productId - left.product.productId)
    .slice(0, 4);

  const trendingItems = rankedTrendingProducts.map(({ product }, index) => ({
    id: product.productId.toString(),
    name: product.name,
    price: Number(product.variants?.[0]?.price ?? product.basePrice),
    image: product.images?.[0]?.imageUrl || product.images?.[0]?.thumbnailUrl || fallbackImage,
    category: product.category?.name || translateSectionLabel(sections[index % sections.length]),
    tag: getProductTag(product, index),
  }));
  const hasTrendingItems = trendingItems.length > 0;
  let trendingSectionContent: React.ReactNode;
  if (isLoading) {
    trendingSectionContent = (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-5 animate-pulse">
            <div className="aspect-[3/4] bg-white/5 w-full rounded-sm" />
            <div className="space-y-3">
              <div className="h-4 bg-white/10 rounded w-2/3" />
              <div className="flex justify-between items-center gap-4">
                <div className="h-3 bg-white/10 rounded w-1/3" />
                <div className="h-3 bg-white/10 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  } else if (hasTrendingItems) {
    trendingSectionContent = (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
        {trendingItems.map((product) => (
          <div key={product.id} className="group cursor-pointer flex flex-col gap-5" onClick={() => navigate(`/product/${product.id}`)}>

            <div className="aspect-[3/4] overflow-hidden relative bg-surface-dark w-full">
              {product.tag && (
                <div className={`absolute top-4 left-4 z-10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${product.tag === 'Best Seller' ? 'bg-white text-black' : 'bg-primary text-white'}`}>
                  {translateProductTag(product.tag)}
                </div>
              )}
              <img
                src={getCloudinaryProductCard(product.image)}
                alt={product.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <button className="absolute bottom-0 left-0 w-full py-4 bg-white text-black text-xs font-bold uppercase tracking-widest translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center shadow-xl z-20 hover:bg-gray-100">
                {t('quickView')}
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <h4 className="text-base font-bold text-white uppercase tracking-wide group-hover:text-primary transition-colors">{product.name}</h4>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{product.category}</span>
                <span className="text-sm font-bold text-white">{formatPrice(product.price)}đ</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  } else {
    trendingSectionContent = (
      <div className="border border-white/10 bg-white/[0.02] px-8 py-14 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-white/45 mb-4">{t('curatedForYou')}</p>
        <h4 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-4">{t('trendingNow')}</h4>
        <p className="text-sm md:text-base text-white/60 max-w-2xl mx-auto leading-relaxed">
          {t('fallbackDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-bg-dark font-sans text-white overflow-x-hidden min-h-screen flex flex-col">
      <Header transparent={true} />

      {/* Hero Section - 4 Columns Visual Sub-Categories */}
      <div className="flex flex-col md:flex-row h-screen w-full">
        {sections.map((section) => (
          <div
            key={section}
            className="relative flex-1 h-full group cursor-pointer overflow-hidden border-b md:border-b-0 md:border-r border-white/10 last:border-0"
            onClick={() => navigate(`/collection/${gender.toLowerCase()}/${section.toLowerCase()}`)}
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.2s] ease-out group-hover:scale-105"
              style={{ backgroundImage: `url(${images[section as keyof typeof images]})` }}
            ></div>

            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors duration-500"></div>

            {/* Content - Bottom Aligned */}
            <div className="absolute inset-0 flex flex-col justify-end p-8 pb-12 items-start">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-white translate-y-2 group-hover:translate-y-0 transition-transform duration-500 drop-shadow-xl">
                {translateSectionLabel(section)}
              </h2>
              <div className="overflow-hidden h-0 group-hover:h-8 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white mt-2">
                  {t('shopNow')} <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Trending Section */}
      <section className="py-24 px-6 md:px-12 max-w-[1600px] mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <span className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3 block">{t('curatedForYou')}</span>
            <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">{t('trendingNow')}</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <button className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest border border-white/20 px-6 py-3 hover:bg-white hover:text-black transition-all rounded-sm">
                {t('sortByPopularity')} <span className="material-symbols-outlined text-base">expand_more</span>
              </button>
            </div>
            <button className="w-[42px] h-[42px] border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all rounded-sm">
              <span className="material-symbols-outlined text-xl">tune</span>
            </button>
          </div>
        </div>

        {trendingSectionContent}

        <div className="mt-24 text-center">
          <button
            onClick={() => navigate('/collection')}
            className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] border-b border-white pb-2 hover:text-primary hover:border-primary transition-all group"
          >
            {t('viewAllCollections')} <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">arrow_forward</span>
          </button>
        </div>
      </section>
    </div>
  );
};
