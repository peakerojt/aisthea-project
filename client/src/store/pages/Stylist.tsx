import React, { useMemo, useState, useEffect } from 'react';
import { Header } from '@/store/components/Header';
import { ViewState, CategoryType } from '@/types';
import { fetchWeatherByCity, fetchWeatherByCoords } from '@/common/api/weather.api';
import { WeatherResponse } from '@/types/weather';
import { fetchProducts, Product, getPrimaryImage } from '@/common/services/product.service';
import { getCloudinaryProductCard } from '@/common/utils/cloudinary';

interface StoreStylistProps {
   setView: (v: ViewState) => void;
   setCategory: (c: CategoryType) => void;
   onProductClick: (product: Product) => void;
}

const QUICK_CITIES = [
   { label: 'Hanoi', query: 'Hanoi, VN' },
   { label: 'Ho Chi Minh', query: 'Ho Chi Minh, VN' },
   { label: 'Da Nang', query: 'Da Nang, VN' },
   { label: 'Hue', query: 'Hue, VN' },
];
const MOOD_CHOICES = ['Work', 'Casual', 'Travel', 'Evening'];

const getSeasonKey = (seasonContext?: string) => {
   if (!seasonContext) return 'mild';
   if (seasonContext.includes('winter')) return 'winter';
   if (seasonContext.includes('summer')) return 'summer';
   if (seasonContext.includes('rainy')) return 'rainy';
   return 'mild';
};

const SEASON_KEYWORDS: Record<string, string[]> = {
   winter: ['coat', 'jacket', 'hoodie', 'sweater', 'knit'],
   summer: ['tee', 't-shirt', 'shirt', 'tank', 'short', 'skirt'],
   rainy: ['jacket', 'hoodie', 'coat', 'wind'],
   mild: ['shirt', 'blazer', 'cardigan', 'pants', 'dress'],
};

export const Stylist: React.FC<StoreStylistProps> = ({ setView, setCategory, onProductClick }) => {
   const [weather, setWeather] = useState<WeatherResponse | null>(null);
   const [loadingWeather, setLoadingWeather] = useState(false);
   const [loadingProducts, setLoadingProducts] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [products, setProducts] = useState<Product[]>([]);
   const [activeMood, setActiveMood] = useState(MOOD_CHOICES[0]);

   useEffect(() => {
      const loadProducts = async () => {
         setLoadingProducts(true);
         try {
            const data = await fetchProducts();
            setProducts(data);
         } catch (err) {
            console.error(err);
         } finally {
            setLoadingProducts(false);
         }
      };
      loadProducts();
   }, []);

   const weatherSummary = useMemo(() => {
      if (!weather) return 'Chưa có dữ liệu thời tiết.';
      return `${weather.locationName} · ${weather.temperatureC.toFixed(1)}°C · ${weather.description}`;
   }, [weather]);

   const recommendedProducts = useMemo(() => {
      if (products.length === 0) return [];
      const seasonKey = getSeasonKey(weather?.seasonContext);
      const keywords = SEASON_KEYWORDS[seasonKey];
      const filtered = products.filter((item) =>
         keywords.some((keyword) => item.name.toLowerCase().includes(keyword)),
      );
      return (filtered.length > 0 ? filtered : products).slice(0, 8);
   }, [products, weather]);

   const handleUseLocation = () => {
      if (!navigator.geolocation) {
         setError('Trình duyệt không hỗ trợ định vị.');
         return;
      }
      setError(null);
      setLoadingWeather(true);
      navigator.geolocation.getCurrentPosition(
         async (position) => {
            try {
               const data = await fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
               setWeather(data);
            } catch (err) {
               setError((err as Error).message);
            } finally {
               setLoadingWeather(false);
            }
         },
         () => {
            setLoadingWeather(false);
            setError('Không thể lấy vị trí. Hãy chọn thành phố.');
         },
      );
   };

   const handleCityPick = async (city: string) => {
      setError(null);
      setLoadingWeather(true);
      try {
         const data = await fetchWeatherByCity(city);
         setWeather(data);
      } catch (err) {
         setError((err as Error).message);
      } finally {
         setLoadingWeather(false);
      }
   };


   return (
      <div className="bg-bg-dark text-white font-sans min-h-screen flex flex-col overflow-x-hidden">
         <Header setView={setView} setCategory={setCategory} />

         <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 md:px-12 pt-28 pb-20">
            <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-start mb-12">
               <div>
                  <div className="flex items-center gap-2 mb-4">
                     <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                     <span className="text-primary text-xs font-bold uppercase tracking-[0.3em]">Weather Stylist</span>
                  </div>
                  <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight leading-[0.95]">
                     Weather <br /> <span className="text-white/40">Curated Picks</span>
                  </h1>
                  <p className="mt-5 text-gray-400 max-w-xl text-lg leading-relaxed">
                     Chọn vị trí để cập nhật thời tiết. Hệ thống sẽ đề xuất sản phẩm phù hợp theo mùa.
                  </p>

                  <div className="mt-8 space-y-4">
                     <div className="flex flex-wrap gap-2">
                        <button
                           onClick={handleUseLocation}
                           className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest"
                        >
                           Dùng vị trí hiện tại
                        </button>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        {QUICK_CITIES.map((city) => (
                           <button
                              key={city.query}
                              onClick={() => handleCityPick(city.query)}
                              className="px-4 py-2 border border-white/10 text-white/80 text-xs font-bold uppercase tracking-widest hover:border-white hover:text-white transition-colors"
                           >
                              {city.label}
                           </button>
                        ))}
                     </div>
                     {loadingWeather && <p className="text-xs text-white/60">Đang lấy dữ liệu thời tiết...</p>}
                     {error && <p className="text-xs text-red-400">{error}</p>}
                  </div>

                  <div className="mt-8">
                     <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Mood</p>
                     <div className="flex flex-wrap gap-2">
                        {MOOD_CHOICES.map((item) => (
                           <button
                              key={item}
                              onClick={() => setActiveMood(item)}
                              className={`px-4 py-2 rounded-sm border text-xs font-bold uppercase tracking-widest transition-all ${activeMood === item ? 'border-primary text-primary bg-primary/10' : 'border-white/10 text-white/70 hover:text-white hover:border-white'}`}
                           >
                              {item}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="bg-surface-dark border border-white/10 p-6 md:p-8 rounded-sm shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                     <span className="material-symbols-outlined text-[120px]">cloud</span>
                  </div>
                  <div className="flex items-center gap-6 mb-6 relative z-10">
                     <div className="w-16 h-16 bg-white/5 rounded flex items-center justify-center border border-white/10">
                        <span className="material-symbols-outlined text-4xl text-white">cloud</span>
                     </div>
                     <div>
                        <div className="text-4xl font-bold text-white flex gap-2 items-end">
                           {weather ? `${weather.temperatureC.toFixed(1)}°C` : '--'}
                           <span className="text-lg font-medium text-gray-400">{weather ? weather.description : 'Chưa có dữ liệu'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                           <span className="material-symbols-outlined text-sm">location_on</span> {weather ? weather.locationName : 'Chọn vị trí'}
                        </div>
                     </div>
                  </div>
                  <div className="border-t border-white/10 pt-4 relative z-10 space-y-2">
                     <p className="text-xs uppercase tracking-widest text-white/60">{weatherSummary}</p>
                     {weather && (
                        <p className="text-sm text-white/70">Độ ẩm {weather.humidity}% · Gió {Math.round(weather.windSpeedKph)} km/h · {weather.seasonContext}</p>
                     )}
                  </div>
               </div>
            </section>

            <section className="bg-surface-dark/70 border border-white/10 rounded-sm p-6 md:p-8">
               <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                     <p className="text-xs uppercase tracking-[0.3em] text-primary">Recommended Products</p>
                     <h2 className="text-2xl md:text-3xl font-bold">Sản phẩm theo mùa</h2>
                  </div>
                  <p className="text-xs uppercase tracking-widest text-white/50">Mood: {activeMood}</p>
               </div>

               {loadingProducts ? (
                  <p className="text-sm text-white/60">Đang tải sản phẩm...</p>
               ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                     {recommendedProducts.map((product) => {
                        const image = getPrimaryImage(product);
                        return (
                           <button
                              key={product.productId}
                              onClick={() => onProductClick(product)}
                              className="text-left bg-black/40 border border-white/10 rounded-sm overflow-hidden hover:border-white/30 transition-colors"
                           >
                              <div className="aspect-[4/5] bg-black/60 overflow-hidden">
                                 {image && (
                                    <img
                                       src={getCloudinaryProductCard(image)}
                                       alt={product.name}
                                       className="w-full h-full object-cover"
                                    />
                                 )}
                              </div>
                              <div className="p-4">
                                 <p className="text-xs uppercase tracking-widest text-white/50 mb-2">{product.category?.name || 'Aisthea'}</p>
                                 <h3 className="text-base font-semibold text-white mb-2 line-clamp-2">{product.name}</h3>
                                 <p className="text-sm font-bold text-primary">{new Intl.NumberFormat('vi-VN').format(product.basePrice)}đ</p>
                              </div>
                           </button>
                        );
                     })}
                     {recommendedProducts.length === 0 && (
                        <p className="text-sm text-white/60">Chưa có sản phẩm phù hợp.</p>
                     )}
                  </div>
               )}
            </section>
         </main>
      </div>
   );
};
