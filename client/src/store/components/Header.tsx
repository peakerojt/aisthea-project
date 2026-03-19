import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@/common/components/Logo';
import { useAuth } from '@/common/contexts/AuthContext';
import { useCart } from '@/common/contexts/CartContext';
import { fetchProducts, Product } from '@/common/services/product.service';
import { getCloudinaryProductCard } from '@/common/utils/cloudinary';
import { matchesSearchQuery } from '@/common/utils/search';
import { useTranslation } from 'react-i18next';

const STYLIST_LABEL = 'T\u01b0 v\u1ea5n';
const SEARCH_PLACEHOLDER = 'T\u00ecm ki\u1ebfm s\u1ea3n ph\u1ea9m...';
const SEARCHING_LABEL = '\u0110ang t\u00ecm ki\u1ebfm...';
const RECENT_SEARCHES_LABEL = 'T\u00ecm ki\u1ebfm g\u1ea7n \u0111\u00e2y';
const CLEAR_ALL_LABEL = 'X\u00f3a t\u1ea5t c\u1ea3';
const VIEW_ALL_RESULTS_LABEL = 'Xem t\u1ea5t c\u1ea3 k\u1ebft qu\u1ea3';
const EMPTY_RESULTS_LABEL = 'Kh\u00f4ng t\u00ecm th\u1ea5y s\u1ea3n ph\u1ea9m n\u00e0o ph\u00f9 h\u1ee3p';
const VIEW_COLLECTION_LABEL = 'Xem trong b\u1ed9 s\u01b0u t\u1eadp';
const PROFILE_TITLE = 'H\u1ed3 s\u01a1';
const LOGIN_TITLE = '\u0110\u0103ng nh\u1eadp';
const CURRENCY_SYMBOL = '\u0111';
const SEARCH_PANEL_WIDTH_CLASS = 'w-[min(20rem,calc(100vw-2rem))] sm:w-[20rem]';

export const Header: React.FC<{ transparent?: boolean }> = ({ transparent = false }) => {
  const { t } = useTranslation('pages', { keyPrefix: 'home' });
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { totalItems } = useCart();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchCatalog, setSearchCatalog] = useState<Product[]>([]);
  const [hasLoadedSearchCatalog, setHasLoadedSearchCatalog] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isSearchMounted, setIsSearchMounted] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (!saved) return;

    try {
      setRecentSearches(JSON.parse(saved));
    } catch {
    }
  }, []);

  const saveSearchTerm = (term: string) => {
    if (!term.trim()) return;

    const normalizedTerm = term.trim();
    const updated = [normalizedTerm, ...recentSearches.filter((item) => item !== normalizedTerm)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const removeRecentSearch = (term: string) => {
    const updated = recentSearches.filter((item) => item !== term);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  useEffect(() => {
    if (hasLoadedSearchCatalog) return;

    let isMounted = true;

    const loadSearchCatalog = async () => {
      setIsSearching(true);

      try {
        const data = await fetchProducts({ limit: 100, status: 'Active' });
        if (!isMounted) return;

        setSearchCatalog(data);
        setHasLoadedSearchCatalog(true);
      } catch {
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    };

    loadSearchCatalog();

    return () => {
      isMounted = false;
    };
  }, [hasLoadedSearchCatalog]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (!hasLoadedSearchCatalog) {
      setIsSearching(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);

      try {
        const filteredResults = searchCatalog.filter((product) =>
          matchesSearchQuery(searchTerm, [
            product.name,
            product.description,
            product.category?.name,
            product.brand?.name,
            ...(product.variants ?? []).map((variant) => variant.sku),
          ]),
        );

        setSearchResults(filteredResults.slice(0, 5));
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [hasLoadedSearchCatalog, searchCatalog, searchTerm]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchActive(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (isSearchActive) {
      setIsSearchMounted(true);
      return;
    }

    setIsSearchVisible(false);
    if (!isSearchMounted) return;

    const timeout = window.setTimeout(() => {
      setIsSearchMounted(false);
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [isSearchActive, isSearchMounted]);

  useEffect(() => {
    if (!isSearchActive || !isSearchMounted) return;

    const frame = window.requestAnimationFrame(() => {
      setIsSearchVisible(true);
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isSearchActive, isSearchMounted]);

  const navItems = [
    { key: 'men', label: t('tabs.men'), to: '/category/men' },
    { key: 'women', label: t('tabs.women'), to: '/category/women' },
    { key: 'stylist', label: STYLIST_LABEL, to: '/stylist' },
  ];

  const handleUserClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (role === 'admin') {
      navigate('/admin');
      return;
    }

    navigate('/profile');
  };

  const handleSearchProduct = (product: Product) => {
    saveSearchTerm(product.name);
    setIsSearchActive(false);
    navigate(`/product/${product.productId}`);
  };

  const handleSearchSubmit = () => {
    if (!searchTerm.trim()) return;

    saveSearchTerm(searchTerm);
    navigate(`/collection?search=${encodeURIComponent(searchTerm)}`);
    setIsSearchActive(false);
  };

  const headerClass = isScrolled
    ? 'bg-bg-dark/95 backdrop-blur-sm border-b border-border-dark'
    : transparent
      ? 'bg-gradient-to-b from-black/80 to-transparent border-b border-transparent'
      : 'bg-bg-dark/95 backdrop-blur-sm border-b border-border-dark';

  const searchDropdownVisible =
    isSearchMounted && (searchTerm.trim() !== '' || isSearching || recentSearches.length > 0);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerClass}`}>
      <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between px-6 md:px-12">
        <button onClick={() => navigate('/')}>
          <Logo className="text-3xl" />
        </button>

        <nav className="hidden items-center gap-12 md:flex">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => navigate(item.to)}
              className="relative text-sm font-bold uppercase tracking-widest text-white/80 transition-colors after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all after:content-[''] hover:text-white hover:after:w-full"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="relative flex h-10 w-10 items-center justify-end" ref={searchRef}>
            {isSearchMounted && (
              <div
                className={`absolute right-12 top-0 z-10 ${SEARCH_PANEL_WIDTH_CLASS} origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-black/75 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl ring-1 ring-white/5 transition-[opacity,transform] duration-150 ease-out ${isSearchVisible ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-2 scale-[0.985] opacity-0'}`}
              >
                <div className="border-b border-white/8 px-4">
                  <div className="flex h-14 items-center gap-3">
                    <span className="material-symbols-outlined text-xl text-white/45">search</span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleSearchSubmit();
                      }}
                      placeholder={SEARCH_PLACEHOLDER}
                      className="flex-1 bg-transparent text-sm font-medium text-white placeholder:text-white/45 focus:outline-none"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="rounded-full p-1 text-white/40 transition-colors duration-150 hover:bg-white/8 hover:text-white"
                      >
                        <span className="material-symbols-outlined text-lg">close</span>
                      </button>
                    )}
                  </div>
                </div>

                {searchDropdownVisible && (
                  <div className="max-h-[26rem] overflow-y-auto">
                    {isSearching ? (
                      <div className="px-4 py-5 text-center text-xs uppercase tracking-[0.24em] text-gray-400">
                        {SEARCHING_LABEL}
                      </div>
                    ) : searchTerm.trim() === '' && recentSearches.length > 0 ? (
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">
                            {RECENT_SEARCHES_LABEL}
                          </span>
                          <button
                            onClick={clearAllRecentSearches}
                            className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary transition-colors duration-150 hover:text-white"
                          >
                            {CLEAR_ALL_LABEL}
                          </button>
                        </div>

                        {recentSearches.map((term, index) => (
                          <div
                            key={index}
                            className="group flex items-center justify-between border-b border-white/5 transition-colors duration-150 last:border-none hover:bg-white/5"
                          >
                            <button
                              onClick={() => {
                                setSearchTerm(term);
                                saveSearchTerm(term);
                                navigate(`/collection?search=${encodeURIComponent(term)}`);
                                setIsSearchActive(false);
                              }}
                              className="flex flex-1 items-center gap-3 px-4 py-4 text-left"
                            >
                              <span className="material-symbols-outlined text-sm text-gray-500 transition-colors duration-150 group-hover:text-white/70">
                                history
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">{term}</span>
                            </button>

                            <button
                              onClick={() => removeRecentSearch(term)}
                              className="px-4 py-4 text-gray-500 transition-colors duration-150 hover:text-white"
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
                            onClick={() => handleSearchProduct(result)}
                            className="flex w-full items-center gap-4 border-b border-white/5 px-4 py-4 text-left transition-colors duration-150 last:border-none hover:bg-white/5"
                          >
                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/5">
                              {result.images?.[0] && (
                                <img
                                  src={getCloudinaryProductCard(result.images[0].thumbnailUrl || result.images[0].imageUrl)}
                                  alt={result.name}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>

                            <div className="flex min-w-0 flex-col overflow-hidden">
                              <span className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                                {result.name}
                              </span>
                              <span className="mt-1 text-[10px] font-bold text-primary">
                                {new Intl.NumberFormat('vi-VN').format(Number(result.basePrice))}
                                {CURRENCY_SYMBOL}
                              </span>
                            </div>
                          </button>
                        ))}

                        <button
                          onClick={handleSearchSubmit}
                          className="border-t border-white/10 px-4 py-4 text-center text-[10px] font-black uppercase tracking-[0.24em] text-primary transition-colors duration-150 hover:bg-white/5 hover:text-white"
                        >
                          {VIEW_ALL_RESULTS_LABEL}
                        </button>
                      </div>
                    ) : searchTerm.trim() !== '' && hasLoadedSearchCatalog && !isSearching ? (
                      <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
                        <span className="material-symbols-outlined text-3xl text-white/20">sentiment_dissatisfied</span>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] leading-relaxed text-gray-500">
                          {EMPTY_RESULTS_LABEL}
                        </p>
                        <button
                          onClick={() => {
                            navigate('/collection');
                            setIsSearchActive(false);
                          }}
                          className="mt-2 text-[10px] font-black uppercase tracking-[0.24em] text-primary transition-colors duration-150 hover:text-white"
                        >
                          {VIEW_COLLECTION_LABEL}
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setIsSearchActive((current) => !current)}
              className={`relative z-20 rounded-full p-2 text-white/90 transition-all duration-150 hover:bg-white/8 hover:text-white ${isSearchActive ? 'bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]' : ''}`}
            >
              <span className="material-symbols-outlined text-2xl">search</span>
            </button>

          </div>

          <button onClick={() => navigate('/cart')} className="relative p-2 text-white/90 hover:text-white">
            <span className="material-symbols-outlined text-2xl">shopping_bag</span>
            {totalItems > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-black text-white ring-2 ring-bg-dark">
                {totalItems}
              </span>
            )}
          </button>

          <button
            onClick={handleUserClick}
            className="p-2 text-white/90 hover:text-white"
            title={user ? PROFILE_TITLE : LOGIN_TITLE}
          >
            <span className="material-symbols-outlined text-2xl">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};
