import React from 'react';
import { StoreHeader } from '../components/StoreHeader';
import { ViewState, CategoryType } from '../types';

interface StoreStylistProps {
    setView: (v: ViewState) => void;
    setCategory: (c: CategoryType) => void;
    onProductClick: (product: any) => void;
}

export const StoreStylist: React.FC<StoreStylistProps> = ({ setView, setCategory, onProductClick }) => {
  return (
    <div className="bg-bg-dark text-white font-display min-h-screen flex flex-col">
       <StoreHeader setView={setView} setCategory={setCategory} />
       <main className="flex-1 w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row mt-20">
          <div className="relative w-full lg:w-7/12 min-h-[50vh] lg:min-h-[calc(100vh-80px)] overflow-hidden bg-surface-dark group">
             <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[2s] ease-out group-hover:scale-105" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1549488497-29007c084bb9?q=80&w=1500&auto=format&fit=crop)' }}></div>
             <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent opacity-80 lg:opacity-40"></div>
             <div className="absolute bottom-8 left-8 lg:bottom-12 lg:left-12 max-w-md">
                <p className="text-primary text-xs font-bold tracking-[0.2em] mb-2 uppercase">Editorial</p>
                <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-white mb-4">URBAN <br/>TRANSITION</h1>
                <p className="text-gray-300 text-sm lg:text-base leading-relaxed hidden lg:block">Navigating the shift between seasons requires adaptability. This curated look combines structured tailoring with breathable fabrics perfect for mild city days.</p>
             </div>
          </div>

          <div className="w-full lg:w-5/12 bg-bg-dark border-l border-white/5 flex flex-col">
             <div className="p-8 lg:p-12 flex-1 overflow-y-auto">
                <div className="flex justify-between items-baseline mb-10">
                   <h2 className="text-xl font-bold tracking-widest text-white uppercase">Shop The Look</h2>
                   <span className="text-xs text-gray-500 font-mono">ID: #AI-2024-LUK</span>
                </div>
                <div className="space-y-6">
                   {[
                     { name: 'Oversized Wool Trench', price: 850, img: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=200&auto=format&fit=crop' },
                     { name: 'Ribbed Silk Turtle Neck', price: 220, img: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=200&auto=format&fit=crop' },
                     { name: 'Pleated High-Rise Trousers', price: 340, img: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=200&auto=format&fit=crop' },
                     { name: 'Leather Chelsea Boots', price: 495, img: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=200&auto=format&fit=crop' }
                   ].map((item, i) => (
                     <div key={i} onClick={() => onProductClick(item)} className="group flex gap-5 items-start p-4 rounded hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-pointer">
                        <div className="w-20 h-24 bg-surface-dark rounded overflow-hidden shrink-0 relative">
                           <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col h-full justify-between py-1">
                           <div className="flex justify-between items-start">
                              <h3 className="text-sm font-bold text-white uppercase tracking-wide">{item.name}</h3>
                              <span className="text-sm font-medium text-white">${item.price}</span>
                           </div>
                           <button className="self-start mt-3 text-[10px] uppercase font-bold text-gray-400 hover:text-white flex items-center gap-1 group-hover:text-primary transition-colors">
                              <span className="material-symbols-outlined text-sm">add</span> Add to Bag
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             <div className="border-t border-white/10 p-8 lg:p-12 bg-bg-dark sticky bottom-0 z-10">
                <div className="flex justify-between items-center mb-6">
                   <span className="text-gray-400 text-sm uppercase tracking-widest">Total Bundle (4 Items)</span>
                   <span className="text-2xl font-bold text-white tracking-tight">$1,905</span>
                </div>
                <button className="w-full h-14 bg-primary hover:bg-red-600 active:scale-[0.99] transition-all duration-200 text-white font-bold uppercase tracking-[0.15em] text-sm rounded flex items-center justify-center gap-3">
                   <span className="material-symbols-outlined">shopping_bag</span> Buy Entire Look
                </button>
             </div>
          </div>
       </main>
    </div>
  );
};