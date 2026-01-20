import React from 'react';
import { StoreHeader } from '../components/StoreHeader';
import { ViewState, CategoryType } from '../types';

interface StoreCategoryProps {
  setView: (v: ViewState) => void;
  category: CategoryType;
  setCategory: (c: CategoryType) => void;
  setCollection: (c: string) => void;
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
    Bags: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1200',
    Jewelry: 'https://images.unsplash.com/photo-1599643478518-17488fbbcd75?q=80&w=1200',
    Eyewear: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1200',
    Watches: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=1200',
  }
};

export const StoreCategory: React.FC<StoreCategoryProps> = ({ setView, category, setCategory, setCollection }) => {
  const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Men'];
  const sections = Object.keys(images);

  return (
    <div className="h-screen w-full bg-bg-dark flex flex-col overflow-hidden">
      <StoreHeader setView={setView} setCategory={setCategory} transparent={true} />
      
      <main className="flex-1 flex flex-col md:flex-row h-full">
        {sections.map((section, index) => (
          <div 
            key={section} 
            className="relative flex-1 group cursor-pointer overflow-hidden border-b md:border-b-0 md:border-r border-white/10 last:border-0"
            onClick={() => setCollection(section)}
          >
            {/* Background Image using img tag for lazy loading */}
            <img 
              src={images[section as keyof typeof images]} 
              alt={`${category} ${section}`}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 group-hover:scale-110 ease-out"
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500"></div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12 pb-16 md:pb-24">
               <h2 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-white translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                 {section}
               </h2>
               <div className="overflow-hidden h-0 group-hover:h-auto opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                  <p className="text-sm font-bold uppercase tracking-widest text-white mt-4 flex items-center gap-2">
                    Explore Collection <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </p>
               </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};