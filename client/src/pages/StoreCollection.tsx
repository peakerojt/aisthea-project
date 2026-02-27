import React, { useState, useEffect } from 'react';
import { StoreHeader } from '../components/StoreHeader';
import { ViewState, CategoryType } from '../types';
import { api } from '../utils/api';
import { getCloudinaryProductCard } from '../utils/cloudinary';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  tag?: string;
  type: string;
}

interface ApiProduct {
  productId: number;
  name: string;
  basePrice: number | string;
  category?: { name: string; slug: string };
  images?: { imageUrl: string; thumbnailUrl?: string; isPrimary?: boolean }[];
  variants?: { price: number | string; stockQuantity: number }[];
  status?: string;
}

interface StoreCollectionProps {
  setView: (v: ViewState, id?: number) => void;
  category?: CategoryType;
  setCategory: (c: CategoryType) => void;
  collection?: string;
  onProductClick: (product: any) => void;
  searchTerm?: string;
  setSearchTerm: (term: string) => void;
}

const HERO_IMAGES = {
  Outerwear: 'https://images.unsplash.com/photo-1544642899-f0d6e5f6ed6f?q=80&w=2574&auto=format&fit=crop',
  Tops: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=2574&auto=format&fit=crop',
  Bottoms: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=2574&auto=format&fit=crop',
  Shoes: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?q=80&w=2574&auto=format&fit=crop',
  Accessories: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=2574&auto=format&fit=crop',
  Default: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?q=80&w=2574&auto=format&fit=crop'
};

// Format price to VND
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN').format(price);
};

// Map Route Categories to SQL Data Categories
const CATEGORY_MAPPING: Record<string, Record<string, string[]>> = {
  Men: {
    Outerwear: ['Nam - Áo khoác'],
    Tops: ['Nam - Áo'],
    Bottoms: ['Nam - Quần'],
    Shoes: ['Giày dép'],
    Accessories: ['Phụ kiện']
  },
  Women: {
    Outerwear: ['Nữ - Áo khoác'], // Placeholder, might be empty in seed
    Tops: ['Nữ - Áo'],
    Bottoms: ['Nữ - Quần', 'Váy & Đầm'],
    Shoes: ['Giày dép'],
    Accessories: ['Phụ kiện']
  },
  Accessories: {
    All: ['Phụ kiện']
  }
};

// ProductGridCard — handles per-card image loading state + fade-in
const ProductGridCard: React.FC<{ product: Product; onProductClick: (p: any) => void; index: number }> = ({ product, onProductClick, index }) => {
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const isAboveFold = index < 4; // First row — already preloaded

  return (
    <div className="group flex flex-col gap-3 cursor-pointer" onClick={() => onProductClick(product)}>
      <div className="relative aspect-square w-full overflow-hidden bg-[#f0f0ee]">
        {/* Skeleton shimmer while loading */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" />
        )}

        {product.tag && (
          <div className={`absolute top-3 left-3 z-10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${product.tag === 'Best Seller' ? 'bg-white text-black' : product.tag === 'Sale' ? 'bg-primary text-white' : 'bg-black/50 backdrop-blur-md text-white border border-white/20'}`}>
            {product.tag}
          </div>
        )}

        <img
          src={getCloudinaryProductCard(product.image)}
          alt={product.name}
          loading={isAboveFold ? 'eager' : 'lazy'}
          // @ts-ignore — fetchpriority is valid HTML but not yet in React types
          fetchpriority={isAboveFold ? 'high' : 'auto'}
          onLoad={() => setImgLoaded(true)}
          onError={(e) => { e.currentTarget.src = product.image; setImgLoaded(true); }}
          className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${imgLoaded || isAboveFold ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <button className="absolute bottom-0 left-0 right-0 h-11 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-100 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center shadow-xl">
          Add to Bag
        </button>
      </div>

      <div className="flex flex-col gap-1 py-2">
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors uppercase tracking-wide leading-tight">{product.name}</h3>
          <p className="text-sm font-bold text-white whitespace-nowrap">{formatPrice(product.price)}đ</p>
        </div>
        {product.tag === 'Sale' && <p className="text-xs text-primary font-bold uppercase">Extra 20% Off</p>}
      </div>
    </div>
  );
};

const ITEMS_PER_PAGE = 8;

export const StoreCollection: React.FC<StoreCollectionProps> = ({ setView, category = 'Men', setCategory, collection = 'Outerwear', onProductClick, searchTerm = '', setSearchTerm }) => {

  const heroImage = HERO_IMAGES[collection as keyof typeof HERO_IMAGES] || HERO_IMAGES.Default;

  // State for Products from API
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // State for Filters
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [sortOption, setSortOption] = useState('Featured');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000000]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<ApiProduct[]>('/api/products', {
          params: { search: searchTerm }
        });

        // Transform API response to match component interface
        const transformedProducts: Product[] = data.map((product: ApiProduct) => ({
          id: product.productId.toString(),
          name: product.name,
          price: (typeof product.basePrice === 'string' ? parseFloat(product.basePrice) : product.basePrice) || 0,
          image: product.images?.[0]?.thumbnailUrl || product.images?.[0]?.imageUrl || '',
          type: product.category?.name || 'Uncategorized',
          tag: product.status === 'Active' ? undefined : product.status
        }));

        // Preload first 8 product images in JS immediately after fetch
        // so browser starts downloading before React renders
        transformedProducts.slice(0, 8).forEach((p, i) => {
          if (!p.image) return;
          const img = new window.Image();
          img.src = getCloudinaryProductCard(p.image);
          // Inject <link rel="preload"> for first 4 (above the fold)
          if (i < 4) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = getCloudinaryProductCard(p.image);
            link.setAttribute('fetchpriority', 'high');
            document.head.appendChild(link);
          }
        });

        setProducts(transformedProducts);
      } catch (err) {
        console.error('Failed to fetch products:', err);
        setError('Không thể tải sản phẩm. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchTerm, category, collection]);

  // 1. Filter products based on Route (Category + Collection)
  const categoryProducts = React.useMemo(() => {
    if (loading || products.length === 0) return [];

    // If we have a active search term, bypass category/collection filtering 
    // to show all global matches.
    if (searchTerm && searchTerm.trim() !== '') {
      return products;
    }

    // Safety check for category/collection
    const mapCategory = category;
    const mapCollection = collection || 'Tops';

    // Get valid SQL categories for this view
    const validSqlCategories = CATEGORY_MAPPING[mapCategory]?.[mapCollection];

    if (!validSqlCategories) {
      return products;
    }

    return products.filter(p => validSqlCategories.includes(p.type));
  }, [products, category, collection, loading, searchTerm]);

  // 2. Get unique categories for the Horizontal Filter Bar from the *filtered* list
  // This ensures we only show "Nam - Áo" when in Men's Tops, etc.
  const categories = ['All', ...new Set(categoryProducts.map(p => p.type))];

  // 3. Apply Local Filters (Horizontal Bar, Price, Sort)
  const filteredProducts = categoryProducts.filter(product => {
    // Category Filter (Horizontal Bar)
    if (activeCategoryFilter !== 'All' && product.type !== activeCategoryFilter) return false;

    // 2. Price Filter
    if (product.price < priceRange[0] || product.price > priceRange[1]) return false;

    // 3. Size Filter (for future implementation)
    if (selectedSizes.length > 0) {
      return true;
    }

    return true;
  }).sort((a, b) => {
    switch (sortOption) {
      case 'Price: Low to High': return a.price - b.price;
      case 'Price: High to Low': return b.price - a.price;
      case 'Newest': return b.tag === 'New' ? 1 : -1;
      default: return 0; // Featured
    }
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [category, collection, activeCategoryFilter, sortOption, priceRange, selectedSizes]);

  // 4. Paginate results
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  return (
    <div className="min-h-screen bg-bg-dark flex flex-col text-white relative">
      <StoreHeader setView={setView} setCategory={setCategory} transparent={true} searchTerm={searchTerm} setSearchTerm={setSearchTerm} onProductClick={onProductClick} />

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
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Khoảng giá</h3>
                <div className="flex items-center justify-between text-sm mb-4 font-mono">
                  <span>{formatPrice(priceRange[0])}đ</span>
                  <span>{formatPrice(priceRange[1])}đ</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10000000"
                  step="100000"
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
                  setPriceRange([0, 5000000]);
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
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">
            {searchTerm ? 'Kết quả tìm kiếm' : `${collection} Collection`}
          </h1>
          <p className="max-w-2xl text-gray-300 text-lg leading-relaxed">
            {searchTerm ? `Tìm thấy ${filteredProducts.length} sản phẩm phù hợp với "${searchTerm}"` : 'Bộ sưu tập thiết yếu cho tủ đồ hiện đại. Khám phá những thiết kế vượt thời gian với chất liệu cao cấp.'}
          </p>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center -mt-20 relative z-10 w-full">
        <div className="w-full max-w-[1600px] px-6 lg:px-10">

          {/* Filters Bar */}
          <div className="sticky top-20 z-40 mb-12 w-full border-b border-border-dark bg-bg-dark/95 backdrop-blur-md">
            <div className="flex flex-col md:flex-row items-center justify-between py-4 gap-4">
              <div className="flex items-center gap-6 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
                {categories.map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActiveCategoryFilter(filter)}
                    className={`text-sm font-bold uppercase tracking-widest transition-colors pb-1 whitespace-nowrap ${activeCategoryFilter === filter ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-white border-b-2 border-transparent'}`}
                  >
                    {filter === 'All' ? 'Tất cả' : filter}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 ml-auto">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{filteredProducts.length} Sản phẩm {totalPages > 1 && `(Trang ${currentPage}/${totalPages})`}</span>
                <div className="h-4 w-px bg-white/20"></div>
                <button
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white hover:text-primary transition-colors"
                >
                  Bộ lọc <span className="material-symbols-outlined text-base">tune</span>
                </button>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-16 pb-32">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col gap-4 animate-pulse">
                  <div className="aspect-[3/4] w-full bg-white/5 rounded-sm" />
                  <div className="py-2 flex flex-col gap-2">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-40 min-h-[50vh] text-center">
              <span className="material-symbols-outlined text-5xl text-red-500 mb-4">error_outline</span>
              <h3 className="text-xl font-bold uppercase tracking-wide text-white mb-2">Error Loading Products</h3>
              <p className="text-gray-400 mb-6 max-w-md">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-16 pb-32">
              {paginatedProducts.map((product, index) => (
                <ProductGridCard
                  key={product.id}
                  product={product}
                  onProductClick={onProductClick}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 min-h-[40vh] text-center">
              <span className="material-symbols-outlined text-6xl text-white/10 mb-6">search_off</span>
              <h3 className="text-xl font-bold uppercase tracking-[0.2em] text-white mb-3">Không tìm thấy kết quả</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">Chúng tôi không tìm thấy sản phẩm nào khớp với "{searchTerm}". Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSortOption('Featured');
                  setPriceRange([0, 10000000]);
                  setSelectedSizes([]);
                  setActiveCategoryFilter('All');
                }}
                className="px-10 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-700 transition-all shadow-lg shadow-primary/20"
              >
                Xóa tất cả tìm kiếm & bộ lọc
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center border-t border-border-dark py-12">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`w-10 h-10 flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>

                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-10 h-10 flex items-center justify-center text-sm transition-all ${currentPage === i + 1 ? 'bg-primary text-white font-bold' : 'border border-white/10 hover:bg-white/5 font-medium'}`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`w-10 h-10 flex items-center justify-center border border-white/10 hover:bg-white/5 transition-colors ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
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