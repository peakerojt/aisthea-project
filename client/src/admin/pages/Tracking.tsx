import React from 'react';
import { Header } from '@/store/components/Header';
import { ViewState, CategoryType } from '@/types';

interface AdminTrackingProps {
   setView: (v: ViewState) => void;
   setCategory: (c: CategoryType) => void;
}

export const Tracking: React.FC<AdminTrackingProps> = ({ setView, setCategory }) => {
   return (
      <div className="flex flex-col h-screen w-full bg-bg-dark text-white font-display overflow-hidden relative">
         <Header setView={setView} setCategory={setCategory} />

         {/* Map Background Placeholder */}
         <div className="absolute inset-0 z-0 bg-neutral-900 overflow-hidden">
            <img
               src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2000&auto=format&fit=crop"
               className="w-full h-full object-cover opacity-30 grayscale mix-blend-overlay"
               alt="Map"
            />
            {/* SVG Path Animation Mock */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
               <path d="M 200 600 Q 500 400 800 300" stroke="#E2241D" strokeWidth="2" fill="none" strokeDasharray="10" className="animate-pulse" />
               <circle cx="800" cy="300" r="8" fill="#E2241D" className="animate-ping" />
               <circle cx="800" cy="300" r="4" fill="white" />
            </svg>
         </div>

         <div className="absolute top-28 left-8 md:top-32 md:left-12 w-[380px] z-20">
            <div className="bg-black/80 backdrop-blur-md p-5 rounded-lg shadow-2xl flex flex-col gap-5 border border-white/10">
               <div className="flex justify-between items-start">
                  <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-primary text-xs font-bold tracking-wider uppercase">Live Tracking</span>
                     </div>
                     <h2 className="text-white text-2xl font-bold">Order #29384</h2>
                  </div>
               </div>

               <div className="flex gap-4 items-center bg-white/5 p-3 rounded border border-white/5">
                  <div className="w-16 h-16 bg-white/10 rounded overflow-hidden">
                     <img src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=200" alt="Bag" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                     <h3 className="text-white text-sm font-medium truncate">Saint Laurent Medium Bag</h3>
                     <p className="text-gray-400 text-xs">Black Leather • Qty: 1</p>
                     <p className="text-white text-xs font-medium mt-1">Package moving to next checkpoint</p>
                  </div>
               </div>

               <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                     <span className="text-gray-400 text-xs font-medium">Est. Delivery</span>
                     <span className="text-primary text-sm font-bold">Today, 18:00</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-primary w-[75%] rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                     </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wide mt-1">
                     <span>Dispatched</span>
                     <span>Delivered</span>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3 mt-1">
                  <button className="flex items-center justify-center gap-2 h-10 rounded border border-white/10 hover:bg-white/5 text-white text-xs font-semibold transition-all">Support</button>
                  <button className="flex items-center justify-center gap-2 h-10 rounded bg-primary hover:bg-red-700 text-white text-xs font-semibold shadow-lg shadow-primary/20 transition-all">View Details</button>
               </div>
            </div>
         </div>
      </div>
   );
};