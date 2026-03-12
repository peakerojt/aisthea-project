import React, { useState } from 'react';
import { Header } from '@/store/components/Header';
import { ViewState, CategoryType } from '@/types';
import { useProductsAPI } from '@/common/hooks/useProducts';
import { ProductCard } from '@/common/components/ProductCard';
import { ProductItem } from '@/types';
import { Product } from '@/common/services/product.service';

interface StoreHomeProps {
   setView: (v: ViewState, id?: number) => void;
   setCategory: (c: CategoryType) => void;
   setCollection: (c: string) => void;
   onProductClick: (product: ProductItem | Product) => void;
   setSearchTerm: (term: string) => void;
}

export const Home: React.FC<StoreHomeProps> = ({ setView, setCategory, setCollection, onProductClick, setSearchTerm }) => {
   const { data: rawProducts = [], isLoading: loading } = useProductsAPI();
   const [selectedGender, setSelectedGender] = useState<'Unisex' | 'Men' | 'Women'>('Unisex');

   const handleNavigate = (category: CategoryType) => {
      setCategory(category);
      setView('STORE_CATEGORY');
      window.scrollTo(0, 0);
   };

   // ── Month name ───────────────────────────────────────────────────────────────
   const MONTH_NAMES = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
   ];
   const currentMonth = MONTH_NAMES[new Date().getMonth()];

   // ── Seasonal keyword scoring ─────────────────────────────────────────────────
   const SEASONAL_KEYWORDS: Record<number, string[]> = {
      0: ['khoác', 'len', 'sweater', 'hoodie', 'áo ấm', 'jacket'],
      1: ['khoác', 'len', 'sweater', 'hoodie', 'áo ấm', 'jacket'],
      2: ['sơ mi', 'áo nhẹ', 'váy', 'chân váy', 'blazer', 'polo'],
      3: ['sơ mi', 'váy', 'chân váy', 'áo nhẹ', 'polo', 'quần short'],
      4: ['áo thun', 'polo', 'váy', 'quần short', 'đầm'],
      5: ['áo thun', 'quần short', 'đầm', 'phụ kiện', 'vest'],
      6: ['áo thun', 'quần short', 'đầm', 'phụ kiện'],
      7: ['áo thun', 'quần short', 'đầm', 'phụ kiện'],
      8: ['jacket', 'blazer', 'khoác nhẹ', 'sơ mi', 'áo layer'],
      9: ['jacket', 'blazer', 'khoác', 'áo layer', 'quần dài'],
      10: ['khoác', 'len', 'hoodie', 'jacket', 'quần dài'],
      11: ['khoác', 'len', 'sweater', 'hoodie', 'áo ấm', 'jacket'],
   };
   const keywords = SEASONAL_KEYWORDS[new Date().getMonth()] ?? [];

   const scoreProduct = (p: typeof rawProducts[number]) => {
      const cat = (p.category?.name || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return keywords.reduce((acc, kw) => acc + (cat.includes(kw) || name.includes(kw) ? 1 : 0), 0);
   };

   // ── Gender split ─────────────────────────────────────────────────────────────
   const MEN_KW = ['nam', 'men', 'man', 'male'];
   const WOMEN_KW = ['nữ', 'nu', 'women', 'woman', 'female'];

   const sort4 = (pool: typeof rawProducts) =>
      pool.map(p => ({ p, s: scoreProduct(p) })).sort((a, b) => b.s - a.s).slice(0, 4).map(x => x.p);

   const menRaw = sort4(rawProducts.filter(p => MEN_KW.some(k => (p.category?.name || '').toLowerCase().includes(k))));
   const womenRaw = sort4(rawProducts.filter(p => WOMEN_KW.some(k => (p.category?.name || '').toLowerCase().includes(k))));
   const fallback = sort4(rawProducts);

   const menFinal = menRaw.length >= 2 ? menRaw : fallback;
   const womenFinal = womenRaw.length >= 2 ? womenRaw : fallback;
   const unisexFinal = [...rawProducts]
      .map(p => ({ p, s: scoreProduct(p) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map(x => x.p);

   const toCards = (pool: typeof rawProducts) => pool.map(p => ({
      id: p.productId.toString(),
      name: p.name,
      price: Number(p.variants?.[0]?.price ?? p.basePrice),
      image: p.images?.[0]?.thumbnailUrl || p.images?.[0]?.imageUrl || '',
      images: p.images?.map(img => ({ imageUrl: img.imageUrl, thumbnailUrl: img.thumbnailUrl || img.imageUrl })),
      category: p.category?.name || '',
      status: (p.variants?.[0]?.stockQuantity ?? 0) === 0 ? 'Out of Stock' : 'In Stock',
   }));

   const menProducts = toCards(menFinal);
   const womenProducts = toCards(womenFinal);
   const unisexProducts = toCards(unisexFinal);

   // ── Skeleton ─────────────────────────────────────────────────────────────────
   const SkeletonGrid = () => (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
         {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col gap-4 animate-pulse">
               <div className="aspect-[3/4] bg-surface-dark rounded-lg" />
               <div>
                  <div className="h-4 bg-surface-dark w-3/4 mb-2 rounded" />
                  <div className="h-3 bg-surface-dark w-1/4 rounded" />
               </div>
            </div>
         ))}
      </div>
   );

   // ── JSX ──────────────────────────────────────────────────────────────────────
   const TABS = [
      { key: 'Unisex' as const, label: 'Unisex', raw: unisexFinal, products: unisexProducts },
      { key: 'Men' as const, label: 'Nam', raw: menFinal, products: menProducts },
      { key: 'Women' as const, label: 'Nữ', raw: womenFinal, products: womenProducts },
   ];

   return (
      <div className="flex flex-col w-full bg-bg-dark font-sans overflow-x-hidden">
         <Header setView={setView} setCategory={setCategory} transparent={true} setSearchTerm={setSearchTerm} onProductClick={onProductClick} />

         {/* SECTION 1: HERO */}
         <section className="relative h-screen w-full flex items-center">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2500&auto=format&fit=crop)' }} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
            <div className="relative z-10 container mx-auto px-6 md:px-12 pt-20">
               <div className="max-w-4xl animate-fade-in-up">
                  <h1 className="text-5xl md:text-7xl lg:text-9xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-8">
                     Redefining <br />Modern Elegance
                  </h1>
                  <div className="h-1 w-24 bg-primary mb-8" />
                  <p className="text-gray-200 text-lg md:text-xl max-w-xl mb-12 leading-relaxed font-light border-l-2 border-white/20 pl-6">
                     Where architectural innovation meets fluid design. We curate the essential wardrobe for those who speak without words.
                  </p>
                  <button
                     onClick={() => { setCategory('All' as any); setCollection('All'); setView('STORE_COLLECTION'); }}
                     className="bg-primary hover:bg-red-700 text-white px-10 py-5 text-xs font-bold uppercase tracking-[0.2em] transition-all shadow-xl shadow-primary/20 flex items-center gap-3 group"
                  >
                     Explore Collection
                     <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                  </button>
                  <div className="absolute bottom-10 right-10 hidden md:flex flex-col items-center gap-2 animate-bounce cursor-pointer" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
                     <span className="text-[10px] uppercase tracking-widest text-white/50">Scroll</span>
                     <span className="material-symbols-outlined text-white/50">keyboard_arrow_down</span>
                  </div>
               </div>
            </div>
         </section>

         {/* SECTION 2: GENDER-TABBED TRENDING PICKS */}
         <section className="w-full bg-bg-dark py-20 px-6 md:px-12 border-b border-white/5">
            <div className="container mx-auto">

               {/* ── Header row: 3-column grid so tabs sit exactly in center ── */}
               <div className="grid grid-cols-3 items-center mb-10">

                  {/* Left: title */}
                  <div>
                     <p className="text-primary text-[10px] font-black tracking-[0.35em] uppercase mb-2">Xu Hướng {currentMonth}</p>
                     <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                        {selectedGender === 'Men' ? "Men's Picks" : selectedGender === 'Women' ? "Women's Picks" : 'Unisex Picks'}
                     </h2>
                  </div>

                  {/* Center: tabs */}
                  <div className="flex justify-center">
                     <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-sm p-1">
                        {TABS.map(({ key, label }) => (
                           <button
                              key={key}
                              onClick={() => setSelectedGender(key)}
                              className={`px-5 py-2 text-xs font-black uppercase tracking-widest transition-all duration-300 rounded-sm ${selectedGender === key ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'
                                 }`}
                           >
                              {label}
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Right: view-all */}
                  <div className="flex justify-end">
                     <button
                        onClick={() => {
                           if (selectedGender === 'Unisex') {
                              setCategory('All' as any); setCollection('All'); setView('STORE_COLLECTION');
                           } else {
                              setCategory(selectedGender); setView('STORE_CATEGORY');
                           }
                        }}
                        className="text-xs font-bold uppercase tracking-widest text-white hover:text-primary transition-colors flex items-center gap-2 group"
                     >
                        Xem tất cả {selectedGender === 'Men' ? 'Nam' : selectedGender === 'Women' ? 'Nữ' : 'Bộ Sưu Tập'}
                        <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">arrow_forward</span>
                     </button>
                  </div>
               </div>

               {/* ── Product grids ──
                   All 3 tabs rendered simultaneously. Active tab = position:relative (in flow).
                   Inactive tabs = position:absolute + invisible — ZERO layout impact.
                   Page never shifts height when switching tabs. ── */}
               {loading ? <SkeletonGrid /> : (
                  <div className="relative">
                     {TABS.map(({ key, products, raw }) => {
                        const isActive = selectedGender === key;
                        return (
                           <div
                              key={key}
                              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12 ${isActive
                                    ? 'relative'
                                    : 'absolute inset-0 invisible pointer-events-none'
                                 }`}
                           >
                              {products.map((product, i) => (
                                 <ProductCard
                                    key={product.id}
                                    id={product.id}
                                    name={product.name}
                                    price={product.price}
                                    image={product.image}
                                    images={product.images}
                                    category={product.category}
                                    status={product.status}
                                    onClick={() => onProductClick(raw[i])}
                                    showHoverGallery={true}
                                 />
                              ))}
                           </div>
                        );
                     })}
                  </div>
               )}
            </div>
         </section>

         {/* SECTION 3: MEN - Dark/Moody hero */}
         <section
            className="relative h-screen w-full flex items-center cursor-pointer group overflow-hidden border-b border-white/5"
            onClick={() => handleNavigate('Men')}
         >
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.5s] group-hover:scale-105" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=2500&auto=format&fit=crop)' }} />
            <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors duration-500" />
            <div className="relative z-10 container mx-auto px-6 md:px-12 flex items-center">
               <div className="max-w-xl transition-transform duration-700 group-hover:translate-x-4">
                  <span className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4 block">Collection 01</span>
                  <h2 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter mb-6">Men</h2>
                  <div className="h-px w-20 bg-white/30 mb-8" />
                  <p className="text-gray-300 text-lg mb-10 leading-relaxed max-w-md border-l border-white/20 pl-4">
                     Architectural cuts and refined staples, designed for the modern metropolitan life.
                  </p>
                  <button className="border border-white text-white px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all">
                     Shop Menswear
                  </button>
               </div>
            </div>
         </section>

         {/* SECTION 4: WOMEN - Warm/Golden hero */}
         <section
            className="relative h-screen w-full flex items-center justify-end cursor-pointer group overflow-hidden"
            onClick={() => handleNavigate('Women')}
         >
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.5s] group-hover:scale-105" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=2500&auto=format&fit=crop)' }} />
            <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/20 to-transparent group-hover:from-black/50 transition-colors duration-500" />
            <div className="relative z-10 container mx-auto px-6 md:px-12 flex flex-col items-end text-right">
               <div className="max-w-xl transition-transform duration-700 group-hover:-translate-x-4 flex flex-col items-end">
                  <span className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4 block">Collection 02</span>
                  <h2 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter mb-6">Women</h2>
                  <div className="h-px w-20 bg-white/30 mb-8" />
                  <p className="text-gray-200 text-lg mb-10 leading-relaxed border-r border-white/20 pr-4">
                     Fluid silhouettes, flowing structure and precision elegance redefined for the contemporary woman.
                  </p>
                  <button className="border border-white text-white px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all">
                     Shop Womenswear
                  </button>
               </div>
            </div>
         </section>

         {/* SECTION 5: THE STYLIST */}
         <section className="relative h-screen w-full flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-[#8C8474]">
            <div className="absolute inset-0 bg-cover bg-center mix-blend-multiply opacity-80" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1574201635302-388dd92a4c3f?q=80&w=2500)' }} />
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10 max-w-4xl animate-fade-in flex flex-col items-center">
               <span className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-6">Curated Personal</span>
               <h2 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter mb-8 drop-shadow-lg">The Stylist</h2>
               <div className="h-1 w-24 bg-white mb-8" />
               <p className="text-white text-xl md:text-2xl mb-12 leading-relaxed max-w-2xl mx-auto drop-shadow-md">
                  Personalized curation for your unique aesthetic. Discover outfits handpicked by our experts to match your persona.
               </p>
               <button
                  onClick={() => setView('STORE_STYLIST')}
                  className="bg-white text-black px-12 py-5 text-xs font-bold uppercase tracking-[0.25em] hover:bg-black hover:text-white transition-colors shadow-2xl"
               >
                  View Curated Looks
               </button>
            </div>
         </section>
      </div>
   );
};
