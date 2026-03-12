import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/store/components/Header';
import { useProductsAPI } from '@/common/hooks/useProducts';
import { ProductCard } from '@/common/components/ProductCard';
import { ProductItem } from '@/types';
import { Product } from '@/common/services/product.service';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { data: rawProducts = [], isLoading: loading } = useProductsAPI();
  const [selectedGender, setSelectedGender] = useState<'Unisex' | 'Men' | 'Women'>('Unisex');

  const handleNavigate = (category: 'Men' | 'Women') => {
    navigate(`/category/${category.toLowerCase()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const currentMonth = monthNames[new Date().getMonth()];

  const seasonalKeywords: Record<number, string[]> = {
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
  const keywords = seasonalKeywords[new Date().getMonth()] ?? [];

  const scoreProduct = (p: typeof rawProducts[number]) => {
    const cat = (p.category?.name || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    return keywords.reduce((acc, kw) => acc + (cat.includes(kw) || name.includes(kw) ? 1 : 0), 0);
  };

  const menKeywords = ['nam', 'men', 'man', 'male'];
  const womenKeywords = ['nu', 'women', 'woman', 'female'];

  const sort4 = (pool: typeof rawProducts) =>
    pool.map((p) => ({ p, s: scoreProduct(p) })).sort((a, b) => b.s - a.s).slice(0, 4).map((x) => x.p);

  const menRaw = sort4(rawProducts.filter((p) => menKeywords.some((k) => (p.category?.name || '').toLowerCase().includes(k))));
  const womenRaw = sort4(rawProducts.filter((p) => womenKeywords.some((k) => (p.category?.name || '').toLowerCase().includes(k))));
  const fallback = sort4(rawProducts);

  const menFinal = menRaw.length >= 2 ? menRaw : fallback;
  const womenFinal = womenRaw.length >= 2 ? womenRaw : fallback;
  const unisexFinal = [...rawProducts]
    .map((p) => ({ p, s: scoreProduct(p) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 4)
    .map((x) => x.p);

  const toCards = (pool: typeof rawProducts) =>
    pool.map((p) => ({
      id: p.productId.toString(),
      name: p.name,
      price: Number(p.variants?.[0]?.price ?? p.basePrice),
      image: p.images?.[0]?.thumbnailUrl || p.images?.[0]?.imageUrl || '',
      images: p.images?.map((img) => ({ imageUrl: img.imageUrl, thumbnailUrl: img.thumbnailUrl || img.imageUrl })),
      category: p.category?.name || '',
      status: (p.variants?.[0]?.stockQuantity ?? 0) === 0 ? 'Out of Stock' : 'In Stock',
    }));

  const menProducts = toCards(menFinal);
  const womenProducts = toCards(womenFinal);
  const unisexProducts = toCards(unisexFinal);

  const handleProductClick = (product: ProductItem | Product) => {
    const id = (product as ProductItem).id ?? (product as Product).productId;
    navigate(`/product/${id}`);
  };

  const skeletonGrid = (
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

  const tabs = [
    { key: 'Unisex' as const, label: 'Unisex', raw: unisexFinal, products: unisexProducts },
    { key: 'Men' as const, label: 'Men', raw: menFinal, products: menProducts },
    { key: 'Women' as const, label: 'Women', raw: womenFinal, products: womenProducts },
  ];

  return (
    <div className="flex flex-col w-full bg-bg-dark font-sans overflow-x-hidden">
      <Header transparent={true} />

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
              Where architectural innovation meets fluid design.
            </p>
            <button
              onClick={() => navigate('/collection')}
              className="bg-primary hover:bg-red-700 text-white px-10 py-5 text-xs font-bold uppercase tracking-[0.2em] transition-all shadow-xl shadow-primary/20 flex items-center gap-3 group"
            >
              Explore Collection
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      <section className="w-full bg-bg-dark py-20 px-6 md:px-12 border-b border-white/5">
        <div className="container mx-auto">
          <div className="grid grid-cols-3 items-center mb-10">
            <div>
              <p className="text-primary text-[10px] font-black tracking-[0.35em] uppercase mb-2">Trending {currentMonth}</p>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                {selectedGender === 'Men' ? "Men's Picks" : selectedGender === 'Women' ? "Women's Picks" : 'Unisex Picks'}
              </h2>
            </div>

            <div className="flex justify-center">
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-sm p-1">
                {tabs.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedGender(key)}
                    className={`px-5 py-2 text-xs font-black uppercase tracking-widest transition-all duration-300 rounded-sm ${
                      selectedGender === key ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (selectedGender === 'Unisex') {
                    navigate('/collection');
                  } else {
                    navigate(`/category/${selectedGender.toLowerCase()}`);
                  }
                }}
                className="text-xs font-bold uppercase tracking-widest text-white hover:text-primary transition-colors flex items-center gap-2 group"
              >
                View all
                <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">arrow_forward</span>
              </button>
            </div>
          </div>

          {loading ? (
            skeletonGrid
          ) : (
            <div className="relative">
              {tabs.map(({ key, products, raw }) => {
                const isActive = selectedGender === key;
                return (
                  <div
                    key={key}
                    className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12 ${
                      isActive ? 'relative' : 'absolute inset-0 invisible pointer-events-none'
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
                        onClick={() => handleProductClick(raw[i])}
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

      <section className="relative h-screen w-full flex items-center cursor-pointer group overflow-hidden border-b border-white/5" onClick={() => handleNavigate('Men')}>
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.5s] group-hover:scale-105" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=2500&auto=format&fit=crop)' }} />
        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors duration-500" />
        <div className="relative z-10 container mx-auto px-6 md:px-12 flex items-center">
          <div className="max-w-xl transition-transform duration-700 group-hover:translate-x-4">
            <span className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4 block">Collection 01</span>
            <h2 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter mb-6">Men</h2>
          </div>
        </div>
      </section>

      <section className="relative h-screen w-full flex items-center justify-end cursor-pointer group overflow-hidden" onClick={() => handleNavigate('Women')}>
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.5s] group-hover:scale-105" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=2500&auto=format&fit=crop)' }} />
        <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/20 to-transparent group-hover:from-black/50 transition-colors duration-500" />
        <div className="relative z-10 container mx-auto px-6 md:px-12 flex flex-col items-end text-right">
          <div className="max-w-xl transition-transform duration-700 group-hover:-translate-x-4 flex flex-col items-end">
            <span className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4 block">Collection 02</span>
            <h2 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter mb-6">Women</h2>
          </div>
        </div>
      </section>

      <section className="relative h-screen w-full flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-[#8C8474]">
        <div className="absolute inset-0 bg-cover bg-center mix-blend-multiply opacity-80" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1574201635302-388dd92a4c3f?q=80&w=2500)' }} />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 max-w-4xl animate-fade-in flex flex-col items-center">
          <span className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-6">Curated Personal</span>
          <h2 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter mb-8 drop-shadow-lg">The Stylist</h2>
          <button
            onClick={() => navigate('/stylist')}
            className="bg-white text-black px-12 py-5 text-xs font-bold uppercase tracking-[0.25em] hover:bg-black hover:text-white transition-colors shadow-2xl"
          >
            View Curated Looks
          </button>
        </div>
      </section>
    </div>
  );
};
