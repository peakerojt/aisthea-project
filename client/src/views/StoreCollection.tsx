import React, { useState, useEffect } from 'react';
import { StoreHeader } from '../components/StoreHeader';
import { ViewState, CategoryType } from '../types';

interface StoreCollectionProps {
  setView: (v: ViewState) => void;
  category?: CategoryType;
  setCategory: (c: CategoryType) => void;
  collection?: string;
  onProductClick: (product: any) => void;
}

const HERO_IMAGES = {
  Outerwear: 'https://images.unsplash.com/photo-1544642899-f0d6e5f6ed6f?q=80&w=2574&auto=format&fit=crop',
  Tops: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=2574&auto=format&fit=crop',
  Bottoms: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=2574&auto=format&fit=crop',
  Shoes: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?q=80&w=2574&auto=format&fit=crop',
  Accessories: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=2574&auto=format&fit=crop',
  Default: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?q=80&w=2574&auto=format&fit=crop'
};

const INITIAL_PRODUCTS = [
  { id: '1', name: 'The Moto Racer', price: 850, image: 'https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1000&auto=format&fit=crop', tag: 'Best Seller', type: 'Leather Jackets' },
  { id: '2', name: 'Vintage Bomber', price: 920, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1000&auto=format&fit=crop', tag: 'New', type: 'Bombers' },
  { id: '3', name: 'Suede Shearling', price: 1200, image: 'https://images.unsplash.com/photo-1551028919-38f42197624c?q=80&w=1000&auto=format&fit=crop', type: 'Leather Jackets' },
  { id: '4', name: 'Cropped Biker', price: 780, image: 'https://images.unsplash.com/photo-1559582798-678dfc71ccd8?q=80&w=1000&auto=format&fit=crop', type: 'Leather Jackets' },
  { id: '5', name: 'Midnight Rider', price: 890, image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?q=80&w=1000&auto=format&fit=crop', tag: 'Sale', type: 'Denim' },
  { id: '6', name: 'Classic Aviator', price: 1050, image: 'https://images.unsplash.com/photo-1515347619252-60a6bf4fffce?q=80&w=1000&auto=format&fit=crop', type: 'Leather Jackets' },
  { id: '7', name: 'Redline Racer', price: 950, image: 'https://images.unsplash.com/photo-1550246140-5119ae4790b8?q=80&w=1000&auto=format&fit=crop', tag: 'Limited', type: 'Leather Jackets' },
  { id: '8', name: 'Stealth Bomber', price: 880, image: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=1000&auto=format&fit=crop', type: 'Bombers' },
  { id: '9', name: 'Architectural Blazer', price: 720, image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=1000&auto=format&fit=crop', type: 'Blazers' },
  { id: '10', name: 'Alpine Puffer', price: 1400, image: 'https://images.unsplash.com/photo-1512353087810-25dfcd100962?q=80&w=1000&auto=format&fit=crop', type: 'Puffer' },
];

export const StoreCollection: React.FC<StoreCollectionProps> = ({ setView, category = 'Men', setCategory, collection = 'Outerwear', onProductClick }) => {
  const heroImage = HERO_IMAGES[collection as keyof typeof HERO_IMAGES] || HERO_IMAGES.Default;
  
  // State for Filters
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [sortOption, setSortOption] = useState('Featured');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  
  // Apply Filters
  const filteredProducts = INITIAL_PRODUCTS.filter(product => {
      // 1. Category Filter (Horizontal Bar)
      if (activeCategoryFilter !== 'All' && product.type !== activeCategoryFilter) return false;

      // 2. Price Filter
      if (product.price < priceRange[0] || product.price > priceRange[1]) return false;

      // 3. Size Filter (Mock logic - assume all products have all sizes for now, or just pass if empty)
      // In a real app, product would have sizes array.
      if (selectedSizes.length > 0) {
          // Mock: return true to simulate functionality without complex data
          return true; 
      }

      return true;
  }).sort((a, b) => {
      switch (sortOption) {
          case 'Price: Low to High': return a.price - b.price;
          case 'Price: High to Low': return b.price - a.price;
          case 'Newest': return b.tag === 'New' ? 1 : -1; // Simple mock sort
          default: return 0; // Featured
      }
  });

  const toggleSize = (size: string) => {
      setSelectedSizes(prev => 
          prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
      );
  };

  return (
    <div className="min-h-screen bg-bg-dark flex flex-col text-white relative">
      <StoreHeader setView={setView} setCategory={setCategory} transparent={true} />
      
      {/* Filter Drawer Overlay */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsFilterDrawerOpen(false)}></div>
            <div className="relative w-full max-w-sm bg-surface-dark h-full shadow-2xl p-8 overflow-y-auto animate-fade-in border-l border-white/10">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold uppercase tracking-widest">Filters</h2>
                    <button onClick={() => setIsFilterDrawerOpen(false)} className="hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-3xl">close</span>
                    </button>
                </div>

                <div className="space-y-8">
                    {/* Sort */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Sort By</h3>
                        <div className="space-y-3">
                            {['Featured', 'Newest', 'Price: Low to High', 'Price: High to Low'].map(option => (
                                <label key={option} className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${sortOption === option ? 'border-primary' : 'border-white/20 group-hover:border-white'}`}>
                                        {sortOption === option && <div className="w-2 h-2 rounded-full bg-primary"></div>}
                                    </div>
                                    <input type="radio" name="sort" className="hidden" checked={sortOption === option} onChange={() => setSortOption(option)} />
                                    <span className={`text-sm ${sortOption === option ? 'text-white font-bold' : 'text-gray-400 group-hover:text-white'}`}>{option}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Price Range */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Price Range</h3>
                        <div className="flex items-center justify-between text-sm mb-4 font-mono">
                            <span>${priceRange[0]}</span>
                            <span>${priceRange[1]}</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="2000" 
                            step="50"
                            value={priceRange[1]}
                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                            className="w-full accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Sizes */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Size</h3>
                        <div className="grid grid-cols-4 gap-2">
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                                <button 
                                    key={size}
                                    onClick={() => toggleSize(size)}
                                    className={`h-10 text-xs font-bold border transition-colors ${selectedSizes.includes(size) ? 'bg-white text-black border-white' : 'border-white/10 text-gray-400 hover:border-white hover:text-white'}`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Clear Button */}
                    <button 
                        onClick={() => {
                            setSortOption('Featured');
                            setPriceRange([0, 2000]);
                            setSelectedSizes([]);
                            setActiveCategoryFilter('All');
                        }}
                        className="w-full py-4 border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors mt-8"
                    >
                        Reset All Filters
                    </button>
                    
                    <button 
                         onClick={() => setIsFilterDrawerOpen(false)}
                         className="w-full py-4 bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-primary/20"
                    >
                        View {filteredProducts.length} Results
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Hero */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImage})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/20 to-transparent"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pt-20 animate-fade-in-up">
           <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">{collection} Collection</h1>
           <p className="max-w-2xl text-gray-300 text-lg leading-relaxed">
             Curated essentials for modern wardrobes. Discover timeless silhouettes redefined with premium materials.
           </p>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center -mt-20 relative z-10 w-full">
        <div className="w-full max-w-[1600px] px-6 lg:px-10">

          {/* Filters Bar */}
          <div className="sticky top-20 z-40 mb-12 w-full border-b border-border-dark bg-bg-dark/95 backdrop-blur-md">
            <div className="flex flex-col md:flex-row items-center justify-between py-4 gap-4">
              <div className="flex items-center gap-6 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
                <button 
                    onClick={() => setActiveCategoryFilter('All')}
                    className={`text-sm font-bold uppercase tracking-widest transition-colors pb-1 whitespace-nowrap ${activeCategoryFilter === 'All' ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-white border-b-2 border-transparent'}`}
                >
                    All
                </button>
                {['Leather Jackets', 'Denim', 'Bombers', 'Blazers', 'Puffer'].map(filter => (
                  <button 
                    key={filter} 
                    onClick={() => setActiveCategoryFilter(filter)}
                    className={`text-sm font-bold uppercase tracking-widest transition-colors pb-1 whitespace-nowrap ${activeCategoryFilter === filter ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-white border-b-2 border-transparent'}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 ml-auto">
                 <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{filteredProducts.length} Products</span>
                 <div className="h-4 w-px bg-white/20"></div>
                 <button 
                    onClick={() => setIsFilterDrawerOpen(true)}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white hover:text-primary transition-colors"
                 >
                    Filters <span className="material-symbols-outlined text-base">tune</span>
                 </button>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-16 pb-32">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="group flex flex-col gap-5 cursor-pointer" onClick={() => onProductClick(product)}>
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-900">
                      {product.tag && (
                        <div className={`absolute top-4 left-4 z-10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${product.tag === 'Best Seller' ? 'bg-white text-black' : product.tag === 'Sale' ? 'bg-primary text-white' : 'bg-black/50 backdrop-blur-md text-white border border-white/20'}`}>
                          {product.tag}
                        </div>
                      )}
                      <div className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${product.image})` }}></div>
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      <button className="absolute bottom-4 left-4 right-4 h-11 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-100 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center shadow-xl">
                          Add to Bag
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors uppercase tracking-wide">{product.name}</h3>
                        <p className="text-sm font-medium text-white">${product.price}</p>
                      </div>
                      {product.tag === 'Sale' && <p className="text-xs text-primary font-bold uppercase">Extra 20% Off</p>}
                    </div>
                  </div>
                ))}
              </div>
          ) : (
              <div className="flex flex-col items-center justify-center py-20">
                  <span className="material-symbols-outlined text-6xl text-white/20 mb-4">checkroom</span>
                  <h3 className="text-xl font-bold uppercase tracking-wide text-white mb-2">No Products Found</h3>
                  <p className="text-gray-500 mb-6">Try adjusting your filters or search criteria.</p>
                  <button 
                    onClick={() => {
                        setSortOption('Featured');
                        setPriceRange([0, 2000]);
                        setSelectedSizes([]);
                        setActiveCategoryFilter('All');
                    }}
                    className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    Clear Filters
                  </button>
              </div>
          )}

          {/* Pagination */}
          {filteredProducts.length > 0 && (
            <div className="flex justify-center border-t border-border-dark py-12">
                <div className="flex items-center gap-2">
                <button className="w-10 h-10 flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                <button className="w-10 h-10 flex items-center justify-center bg-primary text-white text-sm font-bold">1</button>
                <button className="w-10 h-10 flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium">2</button>
                <button className="w-10 h-10 flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium">3</button>
                <button className="w-10 h-10 flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                </div>
            </div>
          )}
        </div>
      </main>

      {/* Mini Footer for Collection */}
      <footer className="py-8 border-t border-white/10 text-center">
         <div className="flex justify-center gap-6 mb-4">
             {['Privacy', 'Terms', 'Shipping', 'Contact'].map(link => (
                 <a key={link} href="#" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white">{link}</a>
             ))}
         </div>
         <p className="text-[10px] text-gray-600 uppercase tracking-widest">© 2024 Aisthea Inc.</p>
      </footer>
    </div>
  );
};