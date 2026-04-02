import React, { useMemo, useState } from 'react';
import { ArrowRight, ChevronRight, Layers3, MessageCircleMore, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/store/components/Header';
import { useProductsAPI } from '@/common/hooks/useProducts';
import { ProductCard } from '@/common/components/ProductCard';
import { ChatWidget } from '@/common/components/ChatWidget';
import { ProductItem } from '@/types';
import { Product } from '@/common/services/product.service';
import { useTranslation } from 'react-i18next';

type HomeTabKey = 'Unisex' | 'Men' | 'Women';

interface HomeCardProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  images?: { imageUrl: string; thumbnailUrl?: string }[];
  category: string;
  status: string;
}

const MEN_KEYWORDS = ['nam', 'men', 'man', 'male'];
const WOMEN_KEYWORDS = ['nu', 'women', 'woman', 'female'];
const SEASONAL_KEYWORDS: Record<number, string[]> = {
  0: ['jacket', 'sweater', 'hoodie', 'coat'],
  1: ['jacket', 'sweater', 'hoodie', 'coat'],
  2: ['shirt', 'dress', 'blazer', 'polo'],
  3: ['shirt', 'dress', 'blazer', 'polo'],
  4: ['tee', 'dress', 'shorts', 'polo'],
  5: ['tee', 'shorts', 'dress', 'accessory'],
  6: ['tee', 'shorts', 'dress', 'accessory'],
  7: ['tee', 'shorts', 'dress', 'accessory'],
  8: ['jacket', 'blazer', 'layer', 'shirt'],
  9: ['jacket', 'blazer', 'layer', 'pants'],
  10: ['jacket', 'hoodie', 'coat', 'pants'],
  11: ['jacket', 'sweater', 'hoodie', 'coat'],
};

const toHomeCardProducts = (pool: Product[]): HomeCardProduct[] =>
  pool.map((product) => ({
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

export const Home: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'home' });
  const navigate = useNavigate();
  const { data: rawProducts = [], isLoading: loading } = useProductsAPI();
  const [selectedGender, setSelectedGender] = useState<HomeTabKey>('Unisex');
  const sectionBorderClass = 'border-white/6';
  const cardBorderClass = 'border-white/12';
  const chipBorderClass = 'border-white/8';

  const handleNavigate = (category: 'Men' | 'Women') => {
    navigate(`/category/${category.toLowerCase()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCollectionNavigate = (category: 'Men' | 'Women', collection: 'Outerwear' | 'Tops' | 'Bottoms' | 'Accessories') => {
    navigate(`/collection/${category.toLowerCase()}/${collection.toLowerCase()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const monthNames = useMemo(
    () => [
      t('months.january'),
      t('months.february'),
      t('months.march'),
      t('months.april'),
      t('months.may'),
      t('months.june'),
      t('months.july'),
      t('months.august'),
      t('months.september'),
      t('months.october'),
      t('months.november'),
      t('months.december'),
    ],
    [t]
  );
  const currentMonth = monthNames[new Date().getMonth()];
  const keywords = useMemo(() => SEASONAL_KEYWORDS[new Date().getMonth()] ?? [], []);

  const { menFinal, womenFinal, unisexFinal } = useMemo(() => {
    const scoreProduct = (product: Product) => {
      const categoryName = (product.category?.name || '').toLowerCase();
      const productName = (product.name || '').toLowerCase();

      return keywords.reduce(
        (score, keyword) => score + (categoryName.includes(keyword) || productName.includes(keyword) ? 1 : 0),
        0,
      );
    };

    const sort4 = (pool: Product[]) =>
      pool
        .map((product) => ({ product, score: scoreProduct(product) }))
        .sort((left, right) => right.score - left.score)
        .slice(0, 4)
        .map((item) => item.product);

    const menRaw = sort4(
      rawProducts.filter((product) =>
        MEN_KEYWORDS.some((keyword) => (product.category?.name || '').toLowerCase().includes(keyword))
      )
    );
    const womenRaw = sort4(
      rawProducts.filter((product) =>
        WOMEN_KEYWORDS.some((keyword) => (product.category?.name || '').toLowerCase().includes(keyword))
      )
    );
    const fallback = sort4(rawProducts);

    return {
      menFinal: menRaw.length >= 2 ? menRaw : fallback,
      womenFinal: womenRaw.length >= 2 ? womenRaw : fallback,
      unisexFinal: [...rawProducts]
        .map((product) => ({ product, score: scoreProduct(product) }))
        .sort((left, right) => right.score - left.score)
        .slice(0, 4)
        .map((item) => item.product),
    };
  }, [keywords, rawProducts]);

  const menProducts = useMemo(() => toHomeCardProducts(menFinal), [menFinal]);
  const womenProducts = useMemo(() => toHomeCardProducts(womenFinal), [womenFinal]);
  const unisexProducts = useMemo(() => toHomeCardProducts(unisexFinal), [unisexFinal]);

  const handleProductClick = (product: ProductItem | Product) => {
    const id = (product as ProductItem).id ?? (product as Product).productId;
    navigate(`/product/${id}`);
  };

  const tabs = useMemo(
    () => [
      { key: 'Unisex' as const, label: t('tabs.unisex'), raw: unisexFinal, products: unisexProducts },
      { key: 'Men' as const, label: t('tabs.men'), raw: menFinal, products: menProducts },
      { key: 'Women' as const, label: t('tabs.women'), raw: womenFinal, products: womenProducts },
    ],
    [menFinal, menProducts, t, unisexFinal, unisexProducts, womenFinal, womenProducts]
  );
  const activeTab = useMemo(
    () => tabs.find((tab) => tab.key === selectedGender) ?? tabs[0],
    [selectedGender, tabs]
  );

  const brandValues = useMemo(
    () => [
      {
        icon: Sparkles,
        title: t('brandStrip.items.materials.title'),
        description: t('brandStrip.items.materials.description'),
      },
      {
        icon: Layers3,
        title: t('brandStrip.items.fits.title'),
        description: t('brandStrip.items.fits.description'),
      },
      {
        icon: ShieldCheck,
        title: t('brandStrip.items.support.title'),
        description: t('brandStrip.items.support.description'),
      },
      {
        icon: Sparkles,
        title: t('support.items.curated.title'),
        description: t('support.items.curated.description'),
      },
      {
        icon: Layers3,
        title: t('support.items.silhouettes.title'),
        description: t('support.items.silhouettes.description'),
      },
      {
        icon: ShieldCheck,
        title: t('support.items.styling.title'),
        description: t('support.items.styling.description'),
      },
    ],
    [t]
  );
  const brandMarqueeValues = useMemo(() => [...brandValues, ...brandValues], [brandValues]);

  const categoryCards = useMemo(
    () => [
      {
        key: 'Men' as const,
        label: t('category.cards.men.label'),
        title: t('category.cards.men.title'),
        description: t('category.cards.men.description'),
        image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=1600&auto=format&fit=crop',
        links: [
          { label: t('category.cards.men.links.tailoring'), collection: 'Outerwear' as const },
          { label: t('category.cards.men.links.shirts'), collection: 'Tops' as const },
          { label: t('category.cards.men.links.essentials'), collection: 'Accessories' as const },
        ],
      },
      {
        key: 'Women' as const,
        label: t('category.cards.women.label'),
        title: t('category.cards.women.title'),
        description: t('category.cards.women.description'),
        image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1600&auto=format&fit=crop',
        links: [
          { label: t('category.cards.women.links.outerwear'), collection: 'Outerwear' as const },
          { label: t('category.cards.women.links.knitwear'), collection: 'Tops' as const },
          { label: t('category.cards.women.links.essentials'), collection: 'Accessories' as const },
        ],
      },
    ],
    [t]
  );

  const stylingBenefits = useMemo(
    () => [
      t('styling.benefits.occasion'),
      t('styling.benefits.preference'),
      t('styling.benefits.mixMatch'),
    ],
    [t]
  );

  const stylingPrompts = useMemo(
    () => [
      t('styling.prompts.office'),
      t('styling.prompts.rain'),
      t('styling.prompts.weekend'),
    ],
    [t]
  );

  const skeletonGrid = (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="flex flex-col gap-4 animate-pulse">
          <div className="aspect-[4/5] rounded-[1.75rem] bg-surface-dark" />
          <div className="space-y-3">
            <div className="h-4 w-2/3 rounded bg-surface-dark" />
            <div className="h-3 w-1/3 rounded bg-surface-dark" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex w-full flex-col overflow-x-hidden bg-bg-dark font-sans text-white">
      <Header transparent />

      <section className={`relative isolate min-h-screen overflow-hidden border-b bg-[#050505] ${sectionBorderClass}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_24%,rgba(226,36,29,0.3),transparent_32%),linear-gradient(180deg,rgba(5,5,5,0.28),rgba(5,5,5,0.94))]" />
        <div className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(90deg,rgba(0,0,0,0.54),transparent_60%,rgba(0,0,0,0.18))]" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-6 pb-12 pt-28 md:px-12 md:pb-16 md:pt-32">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-20">
            <div className="max-w-[38rem]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary/90">
                {t('hero.eyebrow')}
              </p>

              <h1 className="mt-6 font-sans text-[clamp(3.2rem,6.6vw,5.35rem)] font-extrabold leading-[0.96] tracking-[-0.06em] text-white">
                <span className="block whitespace-nowrap">{t('hero.titleLine1')}</span>
                <span className="block whitespace-nowrap pl-[0.46em] text-white/92 md:pl-[0.82em]">{t('hero.titleLine2')}</span>
                <span className="block whitespace-nowrap pl-[0.92em] text-white/84 md:pl-[1.66em]">{t('hero.titleLine3')}</span>
              </h1>

              <p className="mt-8 max-w-[31rem] font-sans text-[15px] leading-7 text-white/68 md:text-[16px] md:leading-8">
                {t('hero.subtitle')}
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={() => navigate('/collection')}
                  aria-label={t('hero.ctaPrimary')}
                  className="inline-flex h-12 min-w-[250px] cursor-pointer items-center justify-center gap-3 whitespace-nowrap rounded-full bg-primary px-7 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-all duration-300 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2 focus:ring-offset-[#050505]"
                >
                  <span>{t('hero.ctaPrimary')}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>

                <button
                  onClick={() => navigate('/stylist')}
                  aria-label={t('hero.ctaSecondary')}
                  className="inline-flex h-12 min-w-[190px] cursor-pointer items-center justify-center gap-3 whitespace-nowrap rounded-full border border-white/16 bg-white/[0.01] px-6 font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-white transition-all duration-300 hover:border-white/28 hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-white/25 focus:ring-offset-2 focus:ring-offset-[#050505]"
                >
                  <span>{t('hero.ctaSecondary')}</span>
                  <MessageCircleMore size={15} aria-hidden="true" />
                </button>
              </div>

            </div>

            <div className="relative mx-auto w-full max-w-[42rem] lg:mx-0 lg:justify-self-end">
              <div className="relative h-[27rem] overflow-hidden rounded-[2.5rem] border border-white/10 bg-black md:h-[34rem] lg:h-[min(70vh,42rem)]">
                <img
                  src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2500&auto=format&fit=crop"
                  alt="Luxury fashion editorial"
                  width={2500}
                  height={3125}
                  fetchPriority="high"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.1),rgba(8,8,8,0.32)_56%,rgba(8,8,8,0.54)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.18),transparent_34%,rgba(0,0,0,0.26))]" />

                <div className="absolute left-5 bottom-5 w-[16.25rem] rounded-[1.6rem] border border-white/12 bg-black/30 px-5 py-5 backdrop-blur-[6px] md:left-8 md:bottom-7 md:w-[18rem] md:px-6 md:py-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/90">
                    {t('hero.editorialCard.label')}
                  </p>
                  <h2 className="mt-4 max-w-[13.4ch] font-sans text-[1.46rem] font-medium leading-[1.08] tracking-[-0.018em] text-white/95 [text-wrap:balance] md:text-[1.58rem]">
                    {t('hero.editorialCard.title')}
                  </h2>
                  <p className="mt-4 max-w-[24ch] text-[12px] leading-[1.72] text-white/66 [text-wrap:pretty]">
                    {t('hero.editorialCard.copy')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`border-b bg-bg-dark ${sectionBorderClass}`}>
        <div className="mx-auto w-full max-w-[1440px] px-6 py-24 md:px-12">
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-8">
            <div className="max-w-2xl">
              <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-primary/90">
                {t('trending.label', { month: currentMonth })}
              </p>

              <div className="mt-4">
                <h2 className="font-sans text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] text-white md:text-[48px]">
                  {t('trending.heading')}
                </h2>
              </div>

              <p className="mt-5 max-w-[520px] font-sans text-lg leading-8 text-white/70">
                {t('trending.description')}
              </p>
            </div>

            <div className="flex flex-col gap-4 lg:justify-self-end lg:items-end lg:pt-4">
              <div className="inline-flex flex-wrap items-center rounded-full border border-white/12 bg-white/[0.02] p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedGender(tab.key)}
                    aria-pressed={selectedGender === tab.key}
                    className={`min-h-11 cursor-pointer rounded-full px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-all duration-300 ${
                      selectedGender === tab.key
                        ? 'bg-white text-black shadow-sm'
                        : 'text-white/62 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  if (selectedGender === 'Unisex') {
                    navigate('/collection');
                    return;
                  }

                  handleNavigate(selectedGender);
                }}
                className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-white/76 transition-colors duration-300 hover:text-white"
              >
                <span>{t('trending.viewAll')}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="mt-12">
            {loading ? (
              skeletonGrid
            ) : activeTab.products.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {activeTab.products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    image={product.image}
                    images={product.images}
                    category={product.category}
                    status={product.status}
                    onClick={() => handleProductClick(activeTab.raw[index])}
                    showHoverGallery={true}
                    variant="editorial"
                  />
                ))}
              </div>
            ) : (
              <div className={`rounded-[1.25rem] border bg-white/[0.03] px-6 py-10 text-center text-sm text-white/60 ${cardBorderClass}`}>
                {t('trending.empty')}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={`border-b bg-[#090909] ${sectionBorderClass}`}>
        <div className="mx-auto w-full max-w-[1440px] px-6 py-24 md:px-12">
          <div className="group/brand-marquee relative py-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-7 bg-gradient-to-r from-[#090909] via-[#090909]/94 to-transparent md:w-16" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-7 bg-gradient-to-l from-[#090909] via-[#090909]/94 to-transparent md:w-16" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.035),transparent_58%)] opacity-70" />

            <div className="-my-4 overflow-hidden py-4">
              <div className="flex">
                <div className="brand-marquee-track flex min-w-max shrink-0 gap-5 group-hover/brand-marquee:[animation-play-state:paused]">
                {brandMarqueeValues.map(({ icon: Icon, title, description }, index) => (
                  <div
                    key={`${title}-${index}`}
                    aria-hidden={index >= brandValues.length}
                    className={`w-[18.5rem] shrink-0 rounded-[28px] border px-7 py-6 transition-all duration-500 md:w-[22rem] ${
                      index % brandValues.length === 1
                        ? 'border-white/16 bg-white/[0.055] shadow-[0_20px_60px_rgba(0,0,0,0.24)]'
                        : 'border-white/8 bg-white/[0.018]'
                    } ${cardBorderClass}`}
                  >
                    <div className="flex items-start gap-5">
                      <span
                        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-primary ${
                          index % brandValues.length === 1
                            ? 'border-white/14 bg-white/[0.055]'
                            : 'border-white/8 bg-white/[0.025]'
                        }`}
                      >
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className={`text-[22px] font-semibold ${index % brandValues.length === 1 ? 'text-white' : 'text-white/88'}`}>
                          {title}
                        </h3>
                        <p className={`mt-2 max-w-[280px] text-[15px] leading-7 ${index % brandValues.length === 1 ? 'text-white/70' : 'text-white/56'}`}>
                          {description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`border-b bg-bg-dark ${sectionBorderClass}`}>
        <div className="mx-auto w-full max-w-[1440px] px-6 py-24 md:px-12">
          <div className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-primary/90">
              {t('category.label')}
            </p>
            <h2 className="mt-4 font-serif text-[40px] leading-[1.02] tracking-[-0.03em] text-white md:text-[48px]">
              {t('category.title')}
            </h2>
            <p className="mt-5 max-w-[520px] font-sans text-lg leading-8 text-white/70">
              {t('category.description')}
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {categoryCards.map((card) => (
              <article
                key={card.key}
                className={`group relative min-h-[27rem] overflow-hidden rounded-[2rem] border bg-black/25 ${cardBorderClass}`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${card.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/50 to-black/18" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/68 via-black/24 to-transparent" />
                <div className="absolute left-8 bottom-8 max-w-[420px] md:left-10 md:bottom-10">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-primary/90">
                    {card.label}
                  </p>
                  <h3 className="mt-4 font-serif text-[48px] leading-[0.95] tracking-[-0.03em] text-white md:text-[56px]">
                    {card.title}
                  </h3>
                  <p className="mt-4 max-w-sm text-[15px] leading-7 text-white/72">
                    {card.description}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {card.links.map((link) => (
                      <button
                        key={`${card.key}-${link.collection}`}
                        onClick={() => handleCollectionNavigate(card.key, link.collection)}
                        className="min-h-11 cursor-pointer rounded-full border border-white/22 bg-black/10 px-4 text-xs font-medium text-white/85 transition-all duration-300 hover:bg-white/[0.08] hover:text-white"
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleNavigate(card.key)}
                    className="mt-6 inline-flex w-fit cursor-pointer items-center gap-3 font-sans text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors duration-300 hover:text-white/80"
                  >
                    <span>{t('category.cta')}</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#070707]">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-24 md:px-12">
          <div className={`overflow-hidden rounded-[2rem] border bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] shadow-[0_30px_90px_rgba(0,0,0,0.35)] ${cardBorderClass}`}>
            <div className="grid gap-10 p-8 md:p-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:p-12">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-primary/90">
                  {t('styling.label')}
                </p>
                <h2 className="mt-4 max-w-[520px] font-serif text-[48px] leading-[1.02] tracking-[-0.03em] text-white md:text-[56px]">
                  <span className="block">{t('styling.titleLine1')}</span>
                  <span className="block">{t('styling.titleLine2')}</span>
                  <span className="block">{t('styling.titleLine3')}</span>
                </h2>
                <p className="mt-6 max-w-[520px] font-sans text-lg leading-8 text-white/78">
                  {t('styling.copy')}
                </p>

                <ul className="mt-8 space-y-5">
                  {stylingBenefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <ShieldCheck size={14} aria-hidden="true" />
                      </span>
                      <p className="text-[15px] leading-7 text-white/76">{benefit}</p>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate('/stylist')}
                  className="mt-10 inline-flex h-14 min-w-[220px] cursor-pointer items-center justify-center gap-3 whitespace-nowrap rounded-full bg-primary px-8 font-sans text-sm font-semibold uppercase tracking-[0.08em] text-white transition-all duration-300 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-primary/70 focus:ring-offset-2 focus:ring-offset-[#070707]"
                >
                  <span>{t('styling.cta')}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>

              <div className={`rounded-[32px] border bg-black/35 p-8 backdrop-blur-sm ${cardBorderClass}`}>
                <div className={`flex items-start justify-between gap-4 border-b pb-5 ${chipBorderClass}`}>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/90">
                      {t('styling.preview.eyebrow')}
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-white">
                      {t('styling.preview.title')}
                    </h3>
                    <p className="mt-3 max-w-[30ch] text-sm leading-6 text-white/60">
                      {t('styling.preview.copy')}
                    </p>
                  </div>

                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full border bg-white/5 text-primary ${chipBorderClass}`}>
                    <MessageCircleMore size={18} aria-hidden="true" />
                  </span>
                </div>

                <div className="mt-8 space-y-4">
                  {stylingPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => navigate('/stylist')}
                      className={`group flex h-14 w-full cursor-pointer items-center justify-between gap-4 rounded-full border border-white/16 bg-white/[0.02] px-6 text-left transition-all duration-300 hover:border-white/24 hover:bg-white/[0.04]`}
                    >
                      <span className="text-sm leading-6 text-white/88">{prompt}</span>
                      <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-white/45 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ChatWidget page="home" />
    </div>
  );
};
