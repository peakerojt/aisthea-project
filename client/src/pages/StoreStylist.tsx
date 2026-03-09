import React, { useState } from 'react';
import { StoreHeader } from '../components/StoreHeader';
import { ViewState, CategoryType, CartItem } from '../types';

interface StylistProduct {
   id: string;
   name: string;
   category: string;
   price: number;
   image: string;
}

interface StoreStylistProps {
   setView: (v: ViewState) => void;
   setCategory: (c: CategoryType) => void;
   onProductClick: (product: StylistProduct) => void;
}

const STYLE_TRENDS = [
   {
      id: 'minimalist',
      filter: 'Minimalist',
      title: 'The Silent Silhouette',
      description: 'A masterclass in reduction. Where clean lines and neutral palettes create a powerful, understated presence for the modern transition.',
      image: 'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?q=80&w=1000&auto=format&fit=crop',
      detailImage: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2000&auto=format&fit=crop',
      products: [
         { id: 'm1', name: 'Oversized Wool Coat', category: 'Outerwear / Camel', price: 890, image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=400&auto=format&fit=crop' },
         { id: 'm2', name: 'Cashmere Crew Neck', category: 'Tops / Black', price: 220, image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=400&auto=format&fit=crop' },
         { id: 'm3', name: 'Wide Leg Trouser', category: 'Bottoms / Charcoal', price: 340, image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=400&auto=format&fit=crop' }
      ]
   },
   {
      id: 'vintage',
      filter: 'Vintage',
      title: 'Retro Revival',
      description: 'An ode to the 70s with a contemporary edge. Featuring genuine leather textures contrasted with soft knits and sharp denim cuts.',
      image: 'https://images.unsplash.com/photo-1550614000-4b9519e02c61?q=80&w=1000&auto=format&fit=crop',
      detailImage: 'https://images.unsplash.com/photo-1559582798-678dfc71ccd8?q=80&w=2000&auto=format&fit=crop',
      products: [
         { id: 'v1', name: 'Classic Moto Leather Jacket', category: 'Outerwear / Cognac', price: 450, image: 'https://images.unsplash.com/photo-1551028919-38f42197624c?q=80&w=400&auto=format&fit=crop' },
         { id: 'v2', name: 'Cable Knit Wool Sweater', category: 'Tops / Cream', price: 180, image: 'https://images.unsplash.com/photo-1624423750209-75f9ffe96d6b?q=80&w=400&auto=format&fit=crop' },
         { id: 'v3', name: 'Slim Tapered Denim', category: 'Bottoms / Faded Black', price: 120, image: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?q=80&w=400&auto=format&fit=crop' }
      ]
   },
   {
      id: 'modern',
      filter: 'Modern',
      title: 'Neo-Corporate',
      description: 'Redefining the workspace. Sharp tailoring meets fluid functionality, designed for the ambitious metropolitan.',
      image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?q=80&w=1000&auto=format&fit=crop',
      detailImage: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=2000&auto=format&fit=crop',
      products: [
         { id: 'md1', name: 'Structured Grey Blazer', category: 'Outerwear / Slate', price: 550, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=400&auto=format&fit=crop' },
         { id: 'md2', name: 'Silk Button Down', category: 'Tops / White', price: 195, image: 'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?q=80&w=400&auto=format&fit=crop' },
         { id: 'md3', name: 'Pleated Midi Skirt', category: 'Bottoms / Slate', price: 280, image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?q=80&w=400&auto=format&fit=crop' }
      ]
   },
   {
      id: 'streetwear',
      filter: 'Streetwear',
      title: 'Utility & Chaos',
      description: 'Functional aesthetics for the concrete jungle. Heavyweight cottons, multiple pockets, and a disregard for tradition.',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop',
      detailImage: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=2000&auto=format&fit=crop',
      products: [
         { id: 's1', name: 'Oversized Hoodie', category: 'Tops / Charcoal', price: 140, image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=400&auto=format&fit=crop' },
         { id: 's2', name: 'Technical Cargo Pant', category: 'Bottoms / Black', price: 220, image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=400&auto=format&fit=crop' },
         { id: 's3', name: 'Ribbed Beanie', category: 'Accessories / Grey', price: 45, image: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?q=80&w=400&auto=format&fit=crop' }
      ]
   }
];

export const StoreStylist: React.FC<StoreStylistProps> = ({ setView, setCategory, onProductClick }) => {
   const [activeTrendId, setActiveTrendId] = useState('vintage');
   const activeTrend = STYLE_TRENDS.find(t => t.id === activeTrendId) || STYLE_TRENDS[1];
   const totalPrice = activeTrend.products.reduce((acc, curr) => acc + curr.price, 0);

   return (
      <div className="bg-bg-dark text-white font-sans min-h-screen flex flex-col overflow-x-hidden">
         <StoreHeader setView={setView} setCategory={setCategory} />

         <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 md:px-12 pt-28 pb-20">

            {/* SECTION 1: HEADER & WEATHER WIDGET */}
            <section className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-16 gap-8">
               <div>
                  <div className="flex items-center gap-2 mb-4">
                     <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                     <span className="text-primary text-xs font-bold uppercase tracking-[0.2em]">Daily Curation</span>
                  </div>
                  <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] text-white">
                     Style <br /> <span className="text-white/30">Forecast</span>
                  </h1>
                  <p className="mt-6 text-gray-400 max-w-lg text-lg leading-relaxed">
                     Expertly curated looks tailored to your local weather and the season's boldest movements.
                  </p>
               </div>

               {/* Weather Widget Card */}
               <div className="bg-surface-dark border border-white/10 p-6 md:p-8 rounded-sm w-full lg:w-[450px] shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110">
                     <span className="material-symbols-outlined text-[120px]">cloud</span>
                  </div>
                  <div className="flex items-center gap-6 mb-6 relative z-10">
                     <div className="w-16 h-16 bg-white/5 rounded flex items-center justify-center border border-white/10">
                        <span className="material-symbols-outlined text-4xl text-white">cloud</span>
                     </div>
                     <div>
                        <div className="text-4xl font-bold text-white flex gap-1">18°C <span className="text-lg font-medium text-gray-400 mt-1">Cloudy</span></div>
                        <div className="flex items-center gap-1 text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                           <span className="material-symbols-outlined text-sm">location_on</span> London, UK
                        </div>
                     </div>
                  </div>
                  <div className="border-t border-white/10 pt-4 relative z-10">
                     <p className="text-gray-300 italic font-serif text-lg leading-relaxed mb-4">
                        "Breezy conditions today. We recommend layering with structured outerwear."
                     </p>
                     <button className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-2">
                        View Weather Edit <span className="material-symbols-outlined text-sm">arrow_forward</span>
                     </button>
                  </div>
               </div>
            </section>

            {/* SECTION 2: TREND SELECTION GRID */}
            <section className="mb-20">
               {/* Filter Bar */}
               <div className="flex flex-wrap items-center gap-4 mb-8 border-b border-white/10 pb-6">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mr-4">Filter Trends:</span>
                  <button className="px-5 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-sm">All Trends</button>
                  {STYLE_TRENDS.map(trend => (
                     <button
                        key={trend.id}
                        onClick={() => setActiveTrendId(trend.id)}
                        className={`px-5 py-2 border text-xs font-bold uppercase tracking-widest rounded-sm transition-all ${activeTrendId === trend.id ? 'border-primary text-primary bg-primary/10' : 'border-white/10 text-gray-400 hover:border-white hover:text-white'}`}
                     >
                        {trend.filter}
                     </button>
                  ))}
               </div>

               {/* The Grid */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {STYLE_TRENDS.map((trend) => {
                     const isActive = activeTrendId === trend.id;
                     return (
                        <div
                           key={trend.id}
                           onClick={() => setActiveTrendId(trend.id)}
                           className={`group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-sm transition-all duration-300 ${isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg-dark' : 'hover:opacity-80'}`}
                        >
                           <img src={trend.image} alt={trend.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

                           {isActive && (
                              <div className="absolute top-4 right-4 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-lg">
                                 Selected
                              </div>
                           )}

                           {isActive && (
                              <div className="absolute top-4 left-4 bg-black/80 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm border border-white/20">
                                 {trend.filter}
                              </div>
                           )}

                           {!isActive && (
                              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm">
                                 {trend.filter}
                              </div>
                           )}

                           <div className="absolute bottom-6 left-6 right-6">
                              <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg">{trend.title}</h3>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </section>

            {/* SECTION 3: SHOP THE LOOK BUNDLE */}
            <section className="bg-surface-dark border border-white/5 rounded-sm overflow-hidden flex flex-col lg:flex-row min-h-[600px] shadow-2xl animate-fade-in">
               {/* Left Column: Editorial */}
               <div className="lg:w-1/2 relative min-h-[400px] lg:min-h-full overflow-hidden group">
                  <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.5s] group-hover:scale-105" style={{ backgroundImage: `url(${activeTrend.detailImage})` }}></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>

                  <div className="absolute bottom-10 left-10 lg:bottom-16 lg:left-16 max-w-md z-10">
                     <div className="flex items-center gap-3 mb-4">
                        <span className="bg-primary text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">Curated Selection</span>
                        <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{activeTrend.filter} Collection</span>
                     </div>
                     <h2 className="text-5xl lg:text-6xl font-black uppercase tracking-tighter text-white mb-6 leading-none drop-shadow-xl">{activeTrend.title}</h2>
                     <p className="text-gray-300 text-lg leading-relaxed border-l-2 border-primary pl-6 drop-shadow-md">
                        {activeTrend.description}
                     </p>
                  </div>
               </div>

               {/* Right Column: Product List */}
               <div className="lg:w-1/2 p-8 lg:p-12 flex flex-col bg-[#111]">
                  <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                     <h3 className="text-xl font-bold uppercase tracking-widest text-white">Shop The Look</h3>
                     <span className="text-primary font-bold text-sm tracking-wider">{activeTrend.products.length} ITEMS</span>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2 mb-8">
                     {activeTrend.products.map((product) => (
                        <div key={product.id} className="flex gap-5 items-center p-4 bg-white/[0.03] border border-white/5 rounded-sm hover:border-white/20 transition-all group cursor-pointer" onClick={() => onProductClick(product)}>
                           <div className="w-20 h-24 bg-surface-dark rounded-sm overflow-hidden shrink-0">
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           </div>
                           <div className="flex-1">
                              <h4 className="text-base font-bold text-white mb-1 group-hover:text-primary transition-colors">{product.name}</h4>
                              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">{product.category}</p>
                              <p className="text-sm font-bold text-white">${product.price.toFixed(2)}</p>
                           </div>
                           <button className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                              <span className="material-symbols-outlined text-lg">add</span>
                           </button>
                        </div>
                     ))}
                  </div>

                  <div className="mt-auto pt-6 border-t border-white/10">
                     <div className="flex justify-between items-end mb-6">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Total Look Price</span>
                        <span className="text-3xl font-black text-white tracking-tight">${totalPrice.toFixed(2)}</span>
                     </div>
                     <button className="w-full py-4 bg-primary hover:bg-red-700 text-white font-bold text-sm uppercase tracking-[0.15em] rounded-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group">
                        <span className="material-symbols-outlined">shopping_cart</span> Add All Items to Cart
                     </button>
                  </div>
               </div>
            </section>

         </main>
      </div>
   );
};