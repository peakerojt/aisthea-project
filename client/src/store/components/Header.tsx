import React, { useState, useEffect } from 'react';
import { Logo } from '@/common/components/Logo';
import { ViewState, CategoryType, ProductItem } from '@/types';
import { useAuth } from '@/common/contexts/AuthContext';
import { fetchProducts, Product } from '@/common/services/product.service';
import { getCloudinaryProductCard } from '@/common/utils/cloudinary';

interface StoreHeaderProps {
  setView: (view: ViewState) => void;
  setCategory?: (category: CategoryType) => void;
  transparent?: boolean;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  onProductClick?: (product: Product | ProductItem) => void;
  cartCount?: number;
}

export const Header: React.FC<StoreHeaderProps> = ({ setView, setCategory, transparent = false, searchTerm = '', setSearchTerm, onProductClick, cartCount = 0 }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, role } = useAuth();

  // Search States
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchTermLocal, setSearchTermLocal] = useState(searchTerm);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }
  }, []);

  const saveSearchTerm = (term: string) => {
    if (!term.trim()) return;
    const newRecent = [term.trim(), ...recentSearches.filter(t => t !== term.trim())].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    if (setSearchTerm) setSearchTerm(term.trim());
  };

  const removeRecentSearch = (term: string) => {
    const newRecent = recentSearches.filter(t => t !== term);
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Debounced search
  useEffect(() => {
    if (!searchTermLocal.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await fetchProducts({ search: searchTermLocal });
        setSearchResults(data.slice(0, 5));
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTermLocal]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchActive(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSearchTermLocal(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (item: string) => {
    if (setSearchTerm) setSearchTerm('');
    if (item === 'Stylist') {
      setView('STORE_STYLIST');
    } else if (setCategory && (item === 'Men' || item === 'Women')) {
      setCategory(item as CategoryType);
      setView('STORE_CATEGORY');
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
          <Logo className="text-3xl" />
        </button>

        <nav className="hidden md:flex items-center gap-12">
          {['Men', 'Women', 'Stylist'].map((item) => (
            <button
              key={item}
              onClick={() => handleNavClick(item)}
              className="text-white/80 hover:text-white text-sm font-bold uppercase tracking-widest transition-colors relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-0.5 after:bg-primary after:transition-all hover:after:w-full"
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="relative flex items-center" ref={searchRef}>
            <button
              onClick={() => setIsSearchActive(!isSearchActive)}
              className="text-white/90 hover:text-white p-2 transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">search</span>
            </button>

            {isSearchActive && (
              <input
                autoFocus
                type="text"
                value={searchTermLocal}
                onChange={(e) => setSearchTermLocal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTermLocal.trim()) {
                    saveSearchTerm(searchTermLocal);
                    setView('STORE_COLLECTION');
                    setIsSearchActive(false);
                  }
                }}
                placeholder="Tìm kiếm sản phẩm..."
                className="bg-transparent border-b border-white/30 text-white text-sm py-1 px-2 focus:outline-none focus:border-white animate-fade-in w-32 md:w-64"
              />
            )}

            {/* Search Results / Recent Searches Dropdown */}
            {isSearchActive && (searchTermLocal.trim() !== '' || isSearching || recentSearches.length > 0) && (
              <div className="absolute top-full right-0 mt-4 w-72 md:w-96 bg-surface-dark border border-white/10 shadow-2xl rounded-sm overflow-hidden animate-fade-in">
                {isSearching ? (
                  <div className="p-4 text-center text-gray-400 text-xs uppercase tracking-widest">Đang tìm kiếm...</div>
                ) : searchTermLocal.trim() === '' && recentSearches.length > 0 ? (
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tìm kiếm gần đây</span>
                      <button
                        onClick={clearAllRecentSearches}
                        className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-white transition-colors"
                      >
                        Xóa tất cả
                      </button>
                    </div>
                    {recentSearches.map((term, index) => (
                      <div key={index} className="flex items-center justify-between group hover:bg-white/5 transition-colors border-b border-white/5 last:border-none">
                        <button
                          onClick={() => {
                            setSearchTermLocal(term);
                            saveSearchTerm(term);
                            setView('STORE_COLLECTION');
                            setIsSearchActive(false);
                          }}
                          className="flex-1 px-4 py-3 text-left flex items-center gap-3"
                        >
                          <span className="material-symbols-outlined text-sm text-gray-500">history</span>
                          <span className="text-white text-[10px] font-bold uppercase tracking-wider">{term}</span>
                        </button>
                        <button
                          onClick={() => removeRecentSearch(term)}
                          className="px-4 py-3 text-gray-500 hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="flex flex-col">
                    {searchResults.map((result) => (
                      <button
                        key={result.productId}
                        onClick={() => {
                          saveSearchTerm(result.name);
                          setIsSearchActive(false);
                          if (onProductClick) onProductClick(result);
                        }}
                        className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none text-left w-full"
                      >
                        <div className="w-12 h-12 bg-white/5 rounded-sm overflow-hidden flex-shrink-0">
                          {result.images?.[0] && (
                            <img
                              src={getCloudinaryProductCard(result.images[0].thumbnailUrl || result.images[0].imageUrl)}
                              alt={result.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-white text-[10px] font-bold truncate uppercase tracking-wider">{result.name}</span>
                          <span className="text-primary text-[10px] font-bold">
                            {new Intl.NumberFormat('vi-VN').format(Number(result.basePrice))}đ
                          </span>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        saveSearchTerm(searchTermLocal);
                        setView('STORE_COLLECTION');
                        setIsSearchActive(false);
                      }}
                      className="p-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:bg-white/5 transition-colors border-t border-white/10"
                    >
                      Xem tất cả kết quả
                    </button>
                  </div>
                ) : searchTermLocal.trim() !== '' && !isSearching ? (
                  <div className="p-8 text-center flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-white/20 text-3xl">sentiment_dissatisfied</span>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Không tìm thấy sản phẩm nào phù hợp</p>
                    <button
                      onClick={() => {
                        saveSearchTerm(searchTermLocal);
                        setView('STORE_COLLECTION');
                        setIsSearchActive(false);
                      }}
                      className="mt-2 text-primary text-[10px] font-black uppercase tracking-widest hover:underline"
                    >
                      Xem trong bộ sưu tập
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <button onClick={() => setView('STORE_CART')} className="text-white/90 hover:text-white p-2 relative">
            <span className="material-symbols-outlined text-2xl">shopping_bag</span>
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-white ring-2 ring-bg-dark">
                {cartCount}
              </span>
            )}
          </button>
          <button onClick={handleUserClick} className="text-white/90 hover:text-white p-2" title={user ? "Profile" : "Sign In"}>
            <span className="material-symbols-outlined text-2xl">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};