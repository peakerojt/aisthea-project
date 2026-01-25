import React from 'react';
import { StoreHeader } from '../components/StoreHeader';
import { ViewState, CategoryType } from '../types';

interface StoreHomeProps {
  setView: (v: ViewState) => void;
  setCategory: (c: CategoryType) => void;
  setCollection: (c: string) => void;
  onProductClick: (product: any) => void;
}

export const StoreHome: React.FC<StoreHomeProps> = ({ setView, setCategory, setCollection, onProductClick }) => {

  const handleNavigate = (category: CategoryType) => {
    setCategory(category);
    setView('STORE_CATEGORY');
    window.scrollTo(0, 0);
  };

  const curatedProducts = [
    { id: 'c1', name: 'Structured Wool Coat', price: 850, image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=800&auto=format&fit=crop' },
    { id: 'c2', name: 'Noir Silk Blouse', price: 320, image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800&auto=format&fit=crop' },
    { id: 'c3', name: 'Urban Tech Ensemble', price: 540, image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=800&auto=format&fit=crop' },
    { id: 'c4', name: 'Evening Drape Dress', price: 890, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop' },
  ];

  return (
    <div className="flex flex-col w-full bg-bg-dark font-sans overflow-x-hidden">
      <StoreHeader setView={setView} setCategory={setCategory} transparent={true} />
      
      {/* SECTION 1: HERO - B&W Female Model */}
      <section className="relative h-screen w-full flex items-center">
        {/* Background */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2500&auto=format&fit=crop)' }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent"></div>
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 md:px-12 pt-20">
          <div className="max-w-4xl animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl lg:text-9xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-8">
              Redefining <br/> 
              Modern Elegance
            </h1>
            <div className="h-1 w-24 bg-primary mb-8"></div>
            <p className="text-gray-200 text-lg md:text-xl max-w-xl mb-12 leading-relaxed font-light border-l-2 border-white/20 pl-6">
              Where architectural innovation meets fluid design. We curate the essential wardrobe for those who speak without words.
            </p>
            <button 
              onClick={() => handleNavigate('Women')}
              className="bg-primary hover:bg-red-700 text-white px-10 py-5 text-xs font-bold uppercase tracking-[0.2em] transition-all shadow-xl shadow-primary/20 flex items-center gap-3 group"
            >
              Explore Collection 
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
            </button>
            
            {/* Scroll Indicator */}
            <div className="absolute bottom-10 right-10 hidden md:flex flex-col items-center gap-2 animate-bounce cursor-pointer" onClick={() => window.scrollTo({top: window.innerHeight, behavior: 'smooth'})}>
               <span className="text-[10px] uppercase tracking-widest text-white/50">Scroll</span>
               <span className="material-symbols-outlined text-white/50">keyboard_arrow_down</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: CURATED EDIT */}
      <section className="w-full bg-bg-dark py-24 px-6 md:px-12 border-b border-white/5">
         <div className="container mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
               <div>
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                     Curated Edit <span className="text-white/20">/</span> October Highlights
                  </h2>
               </div>
               <button 
                 onClick={() => setView('STORE_COLLECTION')}
                 className="text-xs font-bold uppercase tracking-widest text-white hover:text-primary transition-colors flex items-center gap-2 group"
               >
                  View All Arrivals <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">arrow_forward</span>
               </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
               {curatedProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="group cursor-pointer flex flex-col gap-4"
                    onClick={() => onProductClick(product)}
                  >
                     <div className="aspect-[3/4] overflow-hidden relative bg-surface-dark">
                        <img 
                          src={product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                             <span className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1.5">Quick View</span>
                        </div>
                     </div>
                     <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-white group-hover:text-primary transition-colors">{product.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">${product.price.toFixed(2)}</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </section>

      {/* SECTION 3: MEN - Dark/Moody */}
      <section 
        className="relative h-screen w-full flex items-center cursor-pointer group overflow-hidden border-b border-white/5"
        onClick={() => handleNavigate('Men')}
      >
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.5s] group-hover:scale-105" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=2500&auto=format&fit=crop)' }}></div>
        <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors duration-500"></div>

        <div className="relative z-10 container mx-auto px-6 md:px-12 flex items-center">
           <div className="max-w-xl transition-transform duration-700 group-hover:translate-x-4">
              <span className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4 block">Collection 01</span>
              <h2 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter mb-6">Men</h2>
              <div className="h-px w-20 bg-white/30 mb-8"></div>
              <p className="text-gray-300 text-lg mb-10 leading-relaxed max-w-md border-l border-white/20 pl-4">
                 Architectural cuts and refined staples, designed for the modern metropolitan life.
              </p>
              <button className="border border-white text-white px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all">
                 Shop Menswear
              </button>
           </div>
        </div>
      </section>

      {/* SECTION 4: WOMEN - Warm/Golden */}
      <section 
        className="relative h-screen w-full flex items-center justify-end cursor-pointer group overflow-hidden"
        onClick={() => handleNavigate('Women')}
      >
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.5s] group-hover:scale-105" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=2500&auto=format&fit=crop)' }}></div>
        <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/20 to-transparent group-hover:from-black/50 transition-colors duration-500"></div>

        <div className="relative z-10 container mx-auto px-6 md:px-12 flex flex-col items-end text-right">
           <div className="max-w-xl transition-transform duration-700 group-hover:-translate-x-4 flex flex-col items-end">
              <span className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4 block">Collection 02</span>
              <h2 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter mb-6">Women</h2>
              <div className="h-px w-20 bg-white/30 mb-8"></div>
              <p className="text-gray-200 text-lg mb-10 leading-relaxed border-r border-white/20 pr-4">
                 Fluid silhouettes, flowing structure and precision elegance redefined for the contemporary woman.
              </p>
              <button className="border border-white text-white px-10 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all">
                 Shop Womenswear
              </button>
           </div>
        </div>
      </section>

      {/* SECTION 5: THE STYLIST - Beige/Brown Tone with Bust */}
      <section className="relative h-screen w-full flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-[#8C8474]">
           {/* Background with Classical Bust */}
           <div 
             className="absolute inset-0 bg-cover bg-center mix-blend-multiply opacity-80" 
             style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1574201635302-388dd92a4c3f?q=80&w=2500)' }}
           ></div>
           
           <div className="absolute inset-0 bg-black/20"></div>
           
           <div className="relative z-10 max-w-4xl animate-fade-in flex flex-col items-center">
               <span className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-6">Curated Personal</span>
               <h2 className="text-7xl md:text-9xl font-black text-white uppercase tracking-tighter mb-8 drop-shadow-lg">The Stylist</h2>
               <div className="h-1 w-24 bg-white mb-8"></div>
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
       
       <footer className="bg-black py-12 border-t border-white/10 z-10 relative">
          <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-widest uppercase text-white">Aisthea</span>
             </div>
             <div className="flex flex-wrap justify-center gap-8">
                {['Men', 'Women', 'Stylist', 'Journal', 'Contact'].map(link => (
                    <button key={link} className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-white after:transition-all hover:after:w-full">
                      {link}
                    </button>
                ))}
             </div>
             <p className="text-[10px] text-gray-600 uppercase tracking-widest">© 2024 Aisthea Inc.</p>
          </div>
       </footer>
    </div>
  );
};