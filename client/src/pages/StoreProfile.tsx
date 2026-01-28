import React from 'react';
import { StoreHeader } from '../components/StoreHeader';
import { ViewState, CategoryType } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface StoreProfileProps {
  setView: (v: ViewState) => void;
  setCategory: (c: CategoryType) => void;
}

export const StoreProfile: React.FC<StoreProfileProps> = ({ setView, setCategory }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
      logout();
      setView('STORE_HOME');
  };

  return (
    <div className="bg-bg-dark min-h-screen text-white font-sans">
      <StoreHeader setView={setView} setCategory={setCategory} />
      <div className="pt-32 px-6 md:px-12 max-w-4xl mx-auto">
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-8">My Account</h1>
        <div className="bg-surface-dark border border-white/5 p-8 rounded-sm animate-fade-in">
           <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center text-primary text-2xl font-bold border border-primary/20">
                 {user?.name?.charAt(0) || 'U'}
              </div>
              <div>
                 <h2 className="text-2xl font-bold">{user?.name}</h2>
                 <p className="text-gray-400">{user?.email}</p>
                 <span className="inline-block mt-2 px-2 py-1 bg-white/10 rounded text-[10px] font-bold uppercase tracking-widest text-primary">
                    Customer
                 </span>
              </div>
           </div>
           
           <div className="border-t border-white/10 pt-8 mb-8">
               <h3 className="text-lg font-bold uppercase tracking-wide mb-4">Recent Orders</h3>
               <div className="bg-black/20 rounded p-6 text-center border border-white/5">
                  <span className="material-symbols-outlined text-4xl text-white/20 mb-2">shopping_bag</span>
                  <p className="text-gray-500 text-sm">No active orders found.</p>
                  <button onClick={() => setView('STORE_COLLECTION')} className="mt-4 text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors">
                     Start Shopping
                  </button>
               </div>
           </div>

           <div>
               <button onClick={handleLogout} className="px-8 py-3 border border-white/20 hover:bg-white hover:text-black transition-colors text-xs font-bold uppercase tracking-widest">
                  Sign Out
               </button>
           </div>
        </div>
      </div>
    </div>
  );
};