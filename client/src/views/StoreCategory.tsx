import React from 'react';
import { StoreHeader } from '../components/StoreHeader';
import { ViewState, CategoryType } from '../types';

interface StoreCategoryProps {
  setView: (v: ViewState) => void;
  category: CategoryType;
  setCategory: (c: CategoryType) => void;
  setCollection: (c: string) => void;
  onProductClick: (product: any) => void;
}

const CATEGORY_IMAGES = {
  Men: {
    Outerwear: 'https://images.unsplash.com/photo-1544642899-f0d6e5f6ed6f?q=80&w=1200&auto=format&fit=crop',
    Tops: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=1200&auto=format&fit=crop',
    Bottoms: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?q=80&w=1200&auto=format&fit=crop',
    Shoes: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?q=80&w=1200&auto=format&fit=crop',
  },
  Women: {
    Outerwear: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=1200&auto=format&fit=crop',
    Tops: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=1200&auto=format&fit=crop',
    Bottoms: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1200&auto=format&fit=crop',
    Shoes: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1200&auto=format&fit=crop',
  },
  Accessories: {
    Bags: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1200&auto=format&fit=crop',
    Jewelry: 'https://images.unsplash.com/photo-1599643478518-17488fbbcd75?q=80&w=1200&auto=format&fit=crop',
    Eyewear: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1200&auto=format&fit=crop',
    Watches: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=1200&auto=format&fit=crop',
  }
};

const TRENDING_DATA = {
  Men: [
      { id: 'm1', name: 'Obsidian Leather Jacket', price: 450, image: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=800&auto=format&fit=crop', category: 'Outerwear', tag: 'Best Seller' },
      { id: 'm2', name: 'Raw Edge Denim', price: 220, image: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?q=80&w=800&auto=format&fit=crop', category: 'Bottoms' },
      { id: 'm3', name: 'Cashmere Turtleneck', price: 180, image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=800&auto=format&fit=crop', category: 'Tops', tag: 'New Arrival' },
      { id: 'm4', name: 'Derby Classic', price: 310, image: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?q=80&w=800&auto=format&fit=crop', category: 'Shoes' }
  ],
  Women: [
      { id: 'w1', name: 'Structured Wool Coat', price: 850, image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=800&auto=format&fit=crop', category: 'Outerwear', tag: 'Trending' },
      { id: 'w2', name: 'Noir Silk Blouse', price: 320, image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800&auto=format&fit=crop', category: 'Tops' },
      { id: 'w3', name: 'Evening Drape Dress', price: 890, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop', category: 'Dresses', tag: 'Limited' },
      { id: 'w4', name: 'Ankle Chelsea Boot', price: 420, image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop', category: 'Shoes' }
  ],
  Accessories: [
      { id: 'a1', name: 'Mini Leather Tote', price: 550, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop', category: 'Bags' },
      { id: 'a2', name: 'Gold Link Chain', price: 280, image: 'https://images.unsplash.com/photo-1599643478518-17488fbbcd75?q=80&w=800&auto=format&fit=crop', category: 'Jewelry', tag: 'Best Seller' },
      { id: 'a3', name: 'Aviator Sunglasses', price: 190, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=800&auto=format&fit=crop', category: 'Eyewear' },
      { id: 'a4', name: 'Chronograph Watch', price: 450, image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=800&auto=format&fit=crop', category: 'Watches' }
  ]
};

export const StoreCategory: React.FC<StoreCategoryProps> = ({ setView, category, setCategory, setCollection, onProductClick }) => {
  const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Men'];
  const sections = Object.keys(images);
  const trendingItems = TRENDING_DATA[category] || TRENDING_DATA['Men'];

  return (
    <div className="w-full bg-bg-dark font-sans text-white overflow-x-hidden min-h-screen flex flex-col">
      <StoreHeader setView={setView} setCategory={setCategory} transparent={true} />
      
      {/* Hero Section - 4 Columns Visual Sub-Categories */}
      <div className="flex flex-col md:flex-row h-screen w-full">
        {sections.map((section) => (
          <div 
            key={section} 
            className="relative flex-1 h-full group cursor-pointer overflow-hidden border-b md:border-b-0 md:border-r border-white/10 last:border-0"
            onClick={() => setCollection(section)}
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