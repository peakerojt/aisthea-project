import React from 'react';
import { Header } from '@/store/components/Header';
import { ViewState, CategoryType, ProductItem } from '@/types';
import { Product } from '@/common/services/product.service';

interface StoreCategoryProps {
  setView: (v: ViewState, id?: number) => void;
  category: CategoryType;
  setCategory: (c: CategoryType) => void;
  setCollection: (c: string) => void;
  onProductClick: (product: ProductItem | Product) => void;
  setSearchTerm: (term: string) => void;
}

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

const TRENDING_DATA = {
  Men: [],
  Women: [],
  Accessories: []
};

export const Category: React.FC<StoreCategoryProps> = ({ setView, category, setCategory, setCollection, onProductClick, setSearchTerm }) => {
  const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Men'];
  const sections = Object.keys(images);
  const trendingItems = TRENDING_DATA[category] || TRENDING_DATA['Men'];

  return (
    <div className="w-full bg-bg-dark font-sans text-white overflow-x-hidden min-h-screen flex flex-col">
      <Header setView={setView} setCategory={setCategory} setCollection={setCollection} transparent={true} setSearchTerm={setSearchTerm} onProductClick={onProductClick} />

      {/* Hero Section - 4 Columns Visual Sub-Categories */}
      <div className="flex flex-col md:flex-row h-screen w-full">
        {sections.map((section) => (
          <div
            key={section}
            className="relative flex-1 h-full group cursor-pointer overflow-hidden border-b md:border-b-0 md:border-r border-white/10 last:border-0"
            onClick={() => {
              setCollection(section);
              setView('STORE_COLLECTION');
            }}
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
                {section}
              </h2>
              <div className="overflow-hidden h-0 group-hover:h-8 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white mt-2">
                  Shop Now <span className="material-symbols-outlined text-sm">arrow_forward</span>
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
            <span className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3 block">Curated For You</span>
            <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">Trending Now</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <button className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest border border-white/20 px-6 py-3 hover:bg-white hover:text-black transition-all rounded-sm">
                Sort by Popularity <span className="material-symbols-outlined text-base">expand_more</span>
              </button>
            </div>
            <button className="w-[42px] h-[42px] border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all rounded-sm">
              <span className="material-symbols-outlined text-xl">tune</span>
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
          {trendingItems.map((product) => (
            <div key={product.id} className="group cursor-pointer flex flex-col gap-5" onClick={() => onProductClick(product)}>
              <div className="aspect-[3/4] overflow-hidden relative bg-surface-dark w-full">
                {product.tag && (
                  <div className={`absolute top-4 left-4 z-10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${product.tag === 'Best Seller' ? 'bg-white text-black' : 'bg-primary text-white'}`}>
                    {product.tag}
                  </div>
                )}
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <button className="absolute bottom-0 left-0 w-full py-4 bg-white text-black text-xs font-bold uppercase tracking-widest translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center shadow-xl z-20 hover:bg-gray-100">
                  Quick View
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <h4 className="text-base font-bold text-white uppercase tracking-wide group-hover:text-primary transition-colors">{product.name}</h4>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{product.category}</span>
                  <span className="text-sm font-bold text-white">${product.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-24 text-center">
          <button
            onClick={() => setView('STORE_COLLECTION')}
            className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] border-b border-white pb-2 hover:text-primary hover:border-primary transition-all group"
          >
            View All Collections <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">arrow_forward</span>
          </button>
        </div>
      </section>
    </div>
  );
};