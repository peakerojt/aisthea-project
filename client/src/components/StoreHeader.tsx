import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { ViewState, CategoryType } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface StoreHeaderProps {
  setView: (view: ViewState) => void;
  setCategory?: (category: CategoryType) => void;
  transparent?: boolean;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({ setView, setCategory, transparent = false }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, role } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (item: string) => {
    if (item === 'Stylist') {
      setView('STORE_STYLIST');
    } else if (setCategory && (item === 'Men' || item === 'Women')) {
      setCategory(item as CategoryType);
    } else {
      setView('STORE_COLLECTION');
    }
  };

  const handleUserClick = () => {
    if (!user) {
      setView('AUTH_LOGIN');
    } else if (role === 'admin') {
      setView('ADMIN_DASHBOARD');
    } else {
      setView('STORE_PROFILE');
    }
  };

  // Determine background class based on transparency prop and scroll state
  const getHeaderClass = () => {
    if (isScrolled) {
      return 'bg-bg-dark/95 backdrop-blur-sm border-b border-border-dark';
    }
    if (transparent) {
      return 'bg-gradient-to-b from-black/80 to-transparent border-b border-transparent';
    }
    return 'bg-bg-dark/95 backdrop-blur-sm border-b border-border-dark';
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${getHeaderClass()}`}>
      <div className="px-6 md:px-12 w-full max-w-[1440px] mx-auto h-20 flex items-center justify-between">
        <button onClick={() => setView('STORE_HOME')}>
           <Logo className="text-xl" />
        </button>

        <nav className="hidden md:flex items-center gap-12">
          {['Men', 'Women', 'Stylist'].map((item) => (
             <button 
                key={item} 
                onClick={() => handleNavClick(item)}
                className="text-white/80 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all hover:after:w-full"
             >
               {item}
             </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button className="text-white/90 hover:text-white p-2">
            <span className="material-symbols-outlined">search</span>
          </button>
          <button onClick={() => setView('STORE_CART')} className="text-white/90 hover:text-white p-2 relative">
            <span className="material-symbols-outlined">shopping_bag</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
          </button>
          <button onClick={handleUserClick} className="text-white/90 hover:text-white p-2" title={user ? "Profile" : "Sign In"}>
            <span className="material-symbols-outlined">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};