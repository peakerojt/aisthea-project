import React, { useMemo, useState } from 'react';
import { fetchWeatherByCity, fetchWeatherByCoords } from '../services/weatherApi';
import { requestOutfitRecommendation } from '../services/outfitApi';
import { WeatherResponse } from '../types/weather';
import { OutfitProfile, OutfitRecommendation } from '../types/outfit';

const defaultProfile: OutfitProfile = {
  gender: '',
  style: '',
  tolerance: 'medium',
  occasion: '',
};

export const WeatherOutfitPage: React.FC = () => {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [outfit, setOutfit] = useState<OutfitRecommendation | null>(null);
  const [profile, setProfile] = useState<OutfitProfile>(defaultProfile);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingOutfit, setLoadingOutfit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weatherSummary = useMemo(() => {
    if (!weather) return null;
    return `${weather.locationName} · ${weather.temperatureC.toFixed(1)}°C · ${weather.description}`;
  }, [weather]);

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
          setOutfit(null);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setLoadingWeather(false);
        }
      },
      () => {
        setLoadingWeather(false);
        setError('Không thể lấy vị trí. Hãy nhập thành phố thủ công.');
      },
    );
  };

  const handleSearchCity = async () => {
    if (!city.trim()) {
      setError('Vui lòng nhập tên thành phố.');
      return;
    }
    setError(null);
    setLoadingWeather(true);
    try {
      const data = await fetchWeatherByCity(city.trim());
      setWeather(data);
      setOutfit(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleRecommend = async () => {
    if (!weather) {
      setError('Cần có dữ liệu thời tiết trước khi gợi ý.');
      return;
    }
    setError(null);
    setLoadingOutfit(true);
    try {
      const data = await requestOutfitRecommendation({
        weather,
        seasonContext: weather.seasonContext,
        profile: {
          ...profile,
          gender: profile.gender?.trim() || undefined,
          style: profile.style?.trim() || undefined,
          occasion: profile.occasion?.trim() || undefined,
        },
      });
      setOutfit(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingOutfit(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white px-6 py-12">
      <div className="max-w-5xl mx-auto flex flex-col gap-10">
        <header className="flex flex-col gap-3">
          <p className="uppercase tracking-[0.3em] text-xs text-primary">Weather + AI Outfit</p>
          <h1 className="text-3xl md:text-5xl font-black">Gợi ý trang phục theo thời tiết</h1>
          <p className="text-white/70 max-w-2xl">
            Lấy vị trí hiện tại hoặc nhập thành phố, xem thời tiết và nhận gợi ý outfit từ AI.
          </p>
        </header>

        <section className="grid md:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="bg-surface-dark/80 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Lấy vị trí</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleUseLocation}
                className="px-4 py-2 bg-primary text-white text-sm uppercase tracking-widest"
              >
                Dùng vị trí hiện tại
              </button>
              <div className="flex flex-1 gap-3 min-w-[240px]">
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Nhập thành phố"
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  onClick={handleSearchCity}
                  className="px-4 py-2 border border-white/20 text-sm uppercase tracking-widest"
                >
                  Tra cứu
                </button>
              </div>
            </div>
            {loadingWeather && (
              <p className="text-sm text-white/70">Đang lấy dữ liệu thời tiết...</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Thời tiết hiện tại</h2>
            {weather ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <img src={weather.icon} alt={weather.description} className="w-12 h-12" />
                  <div>
                    <p className="text-xl font-semibold">{weather.temperatureC.toFixed(1)}°C</p>
                    <p className="text-sm text-white/70">{weather.description}</p>
                  </div>
                </div>
                <div className="text-sm text-white/70">
                  <p>{weatherSummary}</p>
                  <p>Độ ẩm: {weather.humidity}% · Gió: {weather.windSpeedKph} km/h</p>
                  <p>Season context: {weather.seasonContext}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/60">Chưa có dữ liệu thời tiết.</p>
            )}
          </div>
        </section>

        <section className="bg-surface-dark/70 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Hồ sơ phong cách</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              value={profile.gender || ''}
              onChange={(e) => setProfile((prev) => ({ ...prev, gender: e.target.value }))}
              placeholder="Giới tính (tuỳ chọn)"
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={profile.style || ''}
              onChange={(e) => setProfile((prev) => ({ ...prev, style: e.target.value }))}
              placeholder="Style (minimal, sporty, classic...)"
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
            <input
              value={profile.occasion || ''}
              onChange={(e) => setProfile((prev) => ({ ...prev, occasion: e.target.value }))}
              placeholder="Mục đích (đi làm, đi chơi...)"
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={profile.tolerance || 'medium'}
              onChange={(e) => setProfile((prev) => ({ ...prev, tolerance: e.target.value as OutfitProfile['tolerance'] }))}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              <option value="low">Chịu lạnh/nóng kém</option>
              <option value="medium">Bình thường</option>
              <option value="high">Chịu nhiệt tốt</option>
            </select>
          </div>
          <button
            onClick={handleRecommend}
            disabled={loadingOutfit}
            className="self-start px-5 py-3 bg-white text-black text-xs font-bold uppercase tracking-[0.3em] disabled:opacity-50"
          >
            {loadingOutfit ? 'Đang gợi ý...' : 'Gợi ý outfit bằng AI'}
          </button>
        </section>

        <section className="bg-black/40 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Kết quả outfit</h2>
          {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
          {outfit ? (
            <div className="flex flex-col gap-4">
              <p className="text-white/80">{outfit.summary}</p>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-white/70">
                <div>
                  <p className="text-white font-semibold mb-2">Trang phục</p>
                  <ul className="space-y-1">
                    <li>Áo: {outfit.items.top}</li>
                    <li>Quần/Váy: {outfit.items.bottom}</li>
                    <li>Giày: {outfit.items.shoes}</li>
                    <li>Phụ kiện: {outfit.items.accessories.join(', ')}</li>
                  </ul>
                </div>
                <div>
                  <p className="text-white font-semibold mb-2">Tips</p>
                  <ul className="list-disc list-inside space-y-1">
                    {outfit.tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                  {outfit.warnings.length > 0 && (
                    <>
                      <p className="text-white font-semibold mt-4 mb-2">Cảnh báo</p>
                      <ul className="list-disc list-inside space-y-1 text-amber-200">
                        {outfit.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/60">Chưa có gợi ý outfit. Hãy lấy thời tiết và bấm nút gợi ý.</p>
          )}
        </section>
      </div>
    </div>
  );
};
