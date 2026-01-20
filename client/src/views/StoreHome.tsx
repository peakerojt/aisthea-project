import React, { useEffect, useRef, useState } from 'react';
import { StoreHeader } from '../components/StoreHeader';
import { ViewState, CategoryType } from '../types';

interface StoreHomeProps {
    setView: (v: ViewState) => void;
    setCategory: (c: CategoryType) => void;
    setCollection: (c: string) => void;
    onProductClick: (product: any) => void;
}

export const StoreHome: React.FC<StoreHomeProps> = ({ setView, setCategory, setCollection, onProductClick }) => {
  const [scrollY, setScrollY] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const essentials = [
    { id: 1, name: 'The Obsidian Coat', price: 1250, img: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=600&auto=format&fit=crop', tag: 'Best Seller' },
    { id: 2, name: 'Silk Palazzo Pant', price: 450, img: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=600&auto=format&fit=crop', tag: 'New' },
    { id: 3, name: 'Structure Blazer', price: 890, img: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format&fit=crop' },
    { id: 4, name: 'Noir Combat Boot', price: 620, img: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=600&auto=format&fit=crop' },
    { id: 5, name: 'Cashmere Wrap', price: 320, img: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=600&auto=format&fit=crop', tag: 'Limited' }
  ];

  return (
    <div className="relative min-h-screen flex flex-col bg-bg-dark text-white overflow-x-hidden font-sans">
      <StoreHeader setView={setView} setCategory={setCategory} transparent={true} />
      
      {/* 1. HERO SECTION: Immersive Video/Image */}
      <section className="relative h-screen w-full overflow-hidden shrink-0">
        <div className="absolute inset-0 z-0 bg-black">
          <img 
            src="https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=2573&auto=format&fit=crop" 
            alt="Hero Fashion" 
            className="w-full h-full object-cover opacity-70 transition-transform duration-[2000ms] ease-out will-change-transform"
            style={{ transform: `scale(${1 + scrollY * 0.0002})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/20 to-transparent z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-10"></div>
        </div>

        <div className="relative z-20 h-full flex flex-col justify-end px-6 md:px-16 pb-24 md:pb-32 max-w-[1600px] mx-auto">
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-4 mb-4">
              <span className="h-px w-12 bg-primary"></span>
              <span className="text-primary text-xs font-bold tracking-[0.3em] uppercase">Fall / Winter 2025</span>
            </div>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-[0.9] tracking-tighter uppercase mb-6 mix-blend-lighten">
              Ethereal <br /> Structure
            </h1>
            <p className="max-w-lg text-gray-300 text-lg font-light leading-relaxed mb-10">
              Where architectural silhouette meets fluid draping. A collection designed for the modern avant-garde.
            </p>
            <div className="flex gap-6">
              <button 
                onClick={() => setCollection('Outerwear')}
                className="bg-white text-black hover:bg-primary hover:text-white font-bold text-sm uppercase tracking-[0.15em] px-10 py-4 transition-all duration-300"
              >
                Shop The Campaign
              </button>
              <button 
                onClick={() => setView('STORE_STYLIST')}
                className="border border-white/30 hover:border-white text-white font-bold text-sm uppercase tracking-[0.15em] px-10 py-4 transition-all duration-300 backdrop-blur-sm"
              >
                View Lookbook
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MARQUEE: Brand Statement */}
      <section className="py-8 border-y border-white/5 bg-surface-dark overflow-hidden relative z-20">
        <div className="whitespace-nowrap flex gap-12 animate-marquee">
           {[1,2,3,4,5,6].map(i => (
             <div key={i} className="flex items-center gap-12 opacity-30">
                <span className="text-4xl font-thin uppercase tracking-widest text-white">Aisthea Luxury</span>
                <span className="material-symbols-outlined text-2xl text-primary">diamond</span>
             </div>
           ))}
        </div>
      </section>

      {/* 3. INTRO: The Philosophy (Editorial Text) */}
      <section className="py-24 px-6 md:px-16 max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">The Atelier</h2>
          <h3 className="text-3xl md:text-5xl font-light leading-tight mb-8">
            Redefining luxury through a <span className="text-white font-bold italic">digital-first</span> lens.
          </h3>
        </div>
        <div>
          <p className="text-gray-400 text-lg leading-relaxed mb-6 font-light">
             We believe in the power of the silhouette. Every piece in the Aisthea collection is crafted with a focus on longevity, utilizing sustainable Japanese wools and Italian leathers.
          </p>
          <a href="#" className="text-white text-xs font-bold uppercase tracking-widest border-b border-white/30 pb-1 hover:border-primary hover:text-primary transition-colors inline-block">
            Read Our Story
          </a>
        </div>
      </section>

      {/* 4. MOSAIC CATEGORIES: "Bento Box" Layout */}
      <section className="py-12 px-6 md:px-12 max-w-[1600px] mx-auto w-full">
         <div className="flex justify-between items-end mb-12">
            <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-tighter">Curated Departments</h2>
            <button onClick={() => setView('STORE_CATEGORY')} className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
               All Categories <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-auto md:h-[800px]">
             {/* Large Feature - Women */}
             <div 
               className="md:col-span-8 h-[500px] md:h-full relative group overflow-hidden cursor-pointer"
               onClick={() => setCategory('Women')}
             >
                <img src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1200" alt="Women" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                <div className="absolute bottom-0 left-0 p-8 md:p-12">
                   <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-2">Womenswear</h3>
                   <span className="inline-block px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">Shop Now</span>
                </div>
             </div>

             <div className="md:col-span-4 flex flex-col gap-4 h-full">
                {/* Top Right - Men */}
                <div 
                   className="flex-1 relative group overflow-hidden cursor-pointer min-h-[300px]"
                   onClick={() => setCategory('Men')}
                >
                   <img src="https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=800" alt="Men" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                   <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                   <div className="absolute bottom-0 left-0 p-8">
                      <h3 className="text-3xl font-bold uppercase tracking-tighter text-white mb-1">Menswear</h3>
                      <p className="text-xs font-bold uppercase tracking-widest text-white/70">Tailoring & Casual</p>
                   </div>
                </div>

                {/* Bottom Right - Accessories */}
                <div 
                   className="flex-1 relative group overflow-hidden cursor-pointer min-h-[300px]"
                   onClick={() => setCollection('Accessories')}
                >
                   <img src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800" alt="Accessories" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                   <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                   <div className="absolute bottom-0 left-0 p-8">
                      <h3 className="text-3xl font-bold uppercase tracking-tighter text-white mb-1">Accessories</h3>
                      <p className="text-xs font-bold uppercase tracking-widest text-white/70">Bags, Jewelry & More</p>
                   </div>
                </div>
             </div>
         </div>
      </section>

      {/* 5. EDITORIAL CAMPAIGN: Full Width Break */}
      <section className="my-24 relative h-[70vh] w-full overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-fixed bg-center bg-cover" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2574)' }}></div>
        <div className="absolute inset-0 bg-black/60"></div>
        <div className="relative z-10 text-center max-w-4xl px-6">
           <p className="text-primary text-sm font-bold uppercase tracking-[0.3em] mb-6">Exclusive Drop</p>
           <h2 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter mb-8 leading-none">The Midnight <br/> Collection</h2>
           <p className="text-white/80 text-lg md:text-xl font-light mb-10 max-w-2xl mx-auto">
             A study in monochromes. Discover the limited edition pieces designed for the evening hours.
           </p>
           <button 
             onClick={() => setCollection('Outerwear')} 
             className="bg-transparent border border-white text-white hover:bg-white hover:text-black font-bold text-sm uppercase tracking-[0.2em] px-12 py-4 transition-all"
           >
             Explore The Drop
           </button>
        </div>
      </section>

      {/* 6. ESSENTIALS: Horizontal Scroll Carousel */}
      <section className="py-12 px-6 md:px-12 max-w-[1600px] mx-auto w-full mb-20">
         <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <span className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-3 block">Wardrobe Builders</span>
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">The Essentials</h2>
            </div>
            <div className="flex gap-4 mt-6 md:mt-0">
               <button 
                  onClick={() => scrollContainerRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                  className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-colors"
               >
                  <span className="material-symbols-outlined">arrow_back</span>
               </button>
               <button 
                  onClick={() => scrollContainerRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                  className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-colors"
               >
                  <span className="material-symbols-outlined">arrow_forward</span>
               </button>
            </div>
         </div>

         {/* Scroll Container */}
         <div 
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-12 no-scrollbar"
         >
            {essentials.map((item) => (
              <div 
                key={item.id} 
                className="min-w-[280px] md:min-w-[350px] snap-start group cursor-pointer" 
                onClick={() => onProductClick(item)}
              >
                 <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-dark mb-4">
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    
                    {/* Tags */}
                    {item.tag && (
                      <span className={`absolute top-4 left-4 px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${item.tag === 'Best Seller' ? 'bg-white text-black' : 'bg-primary text-white'}`}>
                        {item.tag}
                      </span>
                    )}

                    {/* Quick Add Overlay */}
                    <div className="absolute inset-x-4 bottom-4 translate-y-[120%] group-hover:translate-y-0 transition-transform duration-300">
                       <button className="w-full h-12 bg-white text-black font-bold uppercase tracking-widest text-xs flex items-center justify-center hover:bg-gray-200 shadow-xl">
                          Quick Add
                       </button>
                    </div>
                 </div>
                 <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-white uppercase tracking-wide group-hover:text-primary transition-colors">{item.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">Available in 3 Colors</p>
                    </div>
                    <span className="text-sm font-medium text-white">${item.price}</span>
                 </div>
              </div>
            ))}
         </div>
      </section>

      {/* 7. NEWSLETTER: Dedicated Section */}
      <section className="bg-primary/5 border-t border-white/5 py-32 px-6">
         <div className="max-w-3xl mx-auto text-center">
            <span className="material-symbols-outlined text-4xl text-primary mb-6">mark_email_read</span>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6 text-white">Join The Inner Circle</h2>
            <p className="text-gray-400 mb-10 text-lg font-light">
              Subscribe to receive early access to new drops, exclusive editorial content, and private sale invitations.
            </p>
            <div className="flex flex-col md:flex-row gap-4 max-w-md mx-auto">
               <input 
                 type="email" 
                 placeholder="Enter your email address" 
                 className="flex-1 bg-bg-dark border border-white/10 px-6 py-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
               />
               <button className="bg-white text-black font-bold uppercase tracking-[0.15em] px-8 py-4 hover:bg-gray-200 transition-colors">
                 Subscribe
               </button>
            </div>
            <p className="text-gray-600 text-xs mt-6">By subscribing you agree to our Terms & Privacy Policy.</p>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-white/10 pt-20 pb-10 px-6 md:px-12">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
           <div className="md:col-span-1">
              <div className="flex items-center gap-2 font-bold tracking-widest uppercase text-2xl mb-6">
                <span className="material-symbols-outlined text-primary text-3xl">diamond</span>
                <span>Aisthea</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                Redefining luxury through a digital-first lens. Sustainable materials, avant-garde silhouettes, and timeless elegance.
              </p>
           </div>
           
           <div>
              <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Shop</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                 <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setCollection('Outerwear')}>New Arrivals</li>
                 <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setCategory('Women')}>Women</li>
                 <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setCategory('Men')}>Men</li>
                 <li className="hover:text-white cursor-pointer transition-colors" onClick={() => setCollection('Accessories')}>Accessories</li>
              </ul>
           </div>

           <div>
              <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                 <li className="hover:text-white cursor-pointer transition-colors">Contact Us</li>
                 <li className="hover:text-white cursor-pointer transition-colors">Shipping & Returns</li>
                 <li className="hover:text-white cursor-pointer transition-colors">Size Guide</li>
                 <li className="hover:text-white cursor-pointer transition-colors">FAQ</li>
              </ul>
           </div>

           <div>
              <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-6">Client Services</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                 <li className="hover:text-white cursor-pointer transition-colors">Book an Appointment</li>
                 <li className="hover:text-white cursor-pointer transition-colors">Personal Styling</li>
                 <li className="hover:text-white cursor-pointer transition-colors">Gift Cards</li>
              </ul>
           </div>
        </div>
        <div className="max-w-[1440px] mx-auto border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600 uppercase tracking-wider">
           <p>© 2025 Aisthea. All rights reserved.</p>
           <div className="flex gap-6">
              <span className="cursor-pointer hover:text-gray-400 transition-colors">Privacy Policy</span>
              <span className="cursor-pointer hover:text-gray-400 transition-colors">Terms of Service</span>
           </div>
        </div>
      </footer>
    </div>
  );
};