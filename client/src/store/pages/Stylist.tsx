import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/store/components/Header';
import { ChatWidget } from '@/common/components/ChatWidget';
import { fetchWeatherByCity, fetchWeatherByCoords } from '@/common/api/weather.api';
import { requestOutfitRecommendation } from '@/common/api/outfit.api';
import { WeatherResponse } from '@/types/weather';
import { OutfitLocationInput, OutfitProfile, OutfitRecommendation } from '@/types/outfit';
import { fetchProductsPage, Product, getPrimaryImage } from '@/common/services/product.service';
import { getCloudinaryProductCard } from '@/common/utils/cloudinary';
import { useTranslation } from 'react-i18next';
import { matchesProfileAudience, ProfileAudience } from '@/store/utils/stylistAudience';
import { detectProductSlotFromCategory, OutfitSlotKey } from '@/store/utils/stylistSlot';

const QUICK_CITIES = [
  { query: 'Hanoi, VN' },
  { query: 'Ho Chi Minh, VN' },
  { query: 'Da Nang, VN' },
  { query: 'Hue, VN' },
];

const defaultProfile: OutfitProfile = {
  gender: '',
  style: '',
  tolerance: 'medium',
  occasion: '',
};

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

const STYLIST_PRODUCT_PAGE_SIZE = 100;

const MOOD_KEYWORDS: Record<string, string[]> = {
  work: ['shirt', 'so mi', 'blazer', 'trouser', 'chino', 'loafer', 'linen'],
  casual: ['tee', 't-shirt', 'jean', 'denim', 'sneaker', 'short', 'shirt'],
  travel: ['hoodie', 'jacket', 'cargo', 'short', 'tee', 'sneaker', 'tote'],
  evening: ['dress', 'skirt', 'blazer', 'heel', 'loafer', 'leather', 'shirt'],
};

type ProfileOption = {
  value: string;
  labelKey: string;
  promptValue: string;
  keywords: string[];
};

type GenderOption = {
  value: string;
  labelKey: string;
  promptValue: string;
  audience: ProfileAudience;
};

const PROFILE_GENDER_OPTIONS: GenderOption[] = [
  { value: 'male', labelKey: 'weatherOutfit.profile.genderOptions.male', promptValue: 'Nam', audience: 'male' },
  { value: 'female', labelKey: 'weatherOutfit.profile.genderOptions.female', promptValue: 'Nữ', audience: 'female' },
  { value: 'unisex', labelKey: 'weatherOutfit.profile.genderOptions.unisex', promptValue: 'Unisex', audience: 'unisex' },
];

const PROFILE_STYLE_OPTIONS: ProfileOption[] = [
  {
    value: 'minimal',
    labelKey: 'weatherOutfit.profile.styleOptions.minimal',
    promptValue: 'Tối giản',
    keywords: ['linen', 'shirt', 'so mi', 'blazer', 'loafer', 'chino'],
  },
  {
    value: 'sporty',
    labelKey: 'weatherOutfit.profile.styleOptions.sporty',
    promptValue: 'Thể thao',
    keywords: ['tank', 'tee', 'short', 'sneaker', 'jogger', 'hoodie'],
  },
  {
    value: 'classic',
    labelKey: 'weatherOutfit.profile.styleOptions.classic',
    promptValue: 'Cổ điển',
    keywords: ['shirt', 'so mi', 'blazer', 'loafer', 'trouser', 'dress'],
  },
  {
    value: 'streetwear',
    labelKey: 'weatherOutfit.profile.styleOptions.streetwear',
    promptValue: 'Streetwear',
    keywords: ['hoodie', 'tee', 'cargo', 'sneaker', 'jacket'],
  },
  {
    value: 'vintage',
    labelKey: 'weatherOutfit.profile.styleOptions.vintage',
    promptValue: 'Vintage',
    keywords: ['cardigan', 'shirt', 'skirt', 'loafer', 'dress'],
  },
];

const PROFILE_OCCASION_OPTIONS: ProfileOption[] = [
  {
    value: 'work',
    labelKey: 'weatherOutfit.profile.occasionOptions.work',
    promptValue: 'Đi làm / công sở',
    keywords: ['shirt', 'so mi', 'blazer', 'trouser', 'chino', 'loafer'],
  },
  {
    value: 'casual',
    labelKey: 'weatherOutfit.profile.occasionOptions.casual',
    promptValue: 'Đi chơi hằng ngày',
    keywords: ['tee', 't-shirt', 'jean', 'denim', 'sneaker', 'shirt'],
  },
  {
    value: 'travel',
    labelKey: 'weatherOutfit.profile.occasionOptions.travel',
    promptValue: 'Du lịch / di chuyển nhiều',
    keywords: ['hoodie', 'jacket', 'cargo', 'short', 'tee', 'sneaker', 'tote'],
  },
  {
    value: 'evening',
    labelKey: 'weatherOutfit.profile.occasionOptions.evening',
    promptValue: 'Hẹn hò / buổi tối',
    keywords: ['dress', 'skirt', 'blazer', 'heel', 'loafer', 'shirt'],
  },
  {
    value: 'weekend',
    labelKey: 'weatherOutfit.profile.occasionOptions.weekend',
    promptValue: 'Dạo phố cuối tuần',
    keywords: ['tee', 'shirt', 'short', 'jean', 'sneaker', 'jacket'],
  },
];

const TOLERANCE_PROMPT_VALUES: Record<NonNullable<OutfitProfile['tolerance']>, string> = {
  low: 'Chịu lạnh/nóng kém',
  medium: 'Bình thường',
  high: 'Chịu nhiệt tốt',
};

const OUTFIT_KEYWORD_RULES = [
  { matches: ['linen', 'linen'], keywords: ['linen', 'shirt', 'so mi'] },
  { matches: ['so mi', 'shirt', 'ao so mi'], keywords: ['shirt', 'so mi', 'blazer'] },
  { matches: ['tee', 't shirt', 't-shirt'], keywords: ['tee', 't-shirt', 'shirt'] },
  { matches: ['tank', 'camisole'], keywords: ['tank', 'tee'] },
  { matches: ['hoodie'], keywords: ['hoodie', 'jacket'] },
  { matches: ['blazer'], keywords: ['blazer', 'shirt', 'trouser'] },
  { matches: ['jacket', 'ao khoac'], keywords: ['jacket', 'hoodie', 'coat'] },
  { matches: ['cardigan', 'knit'], keywords: ['cardigan', 'knit', 'sweater'] },
  { matches: ['chino', 'trouser', 'quan tay'], keywords: ['chino', 'trouser', 'pants'] },
  { matches: ['jean', 'denim'], keywords: ['jean', 'denim', 'pants'] },
  { matches: ['cargo'], keywords: ['cargo', 'pants', 'short'] },
  { matches: ['short'], keywords: ['short'] },
  { matches: ['skirt', 'chan vay'], keywords: ['skirt', 'dress'] },
  { matches: ['dress', 'dam', 'vay'], keywords: ['dress', 'skirt'] },
  { matches: ['loafer'], keywords: ['loafer', 'shoe'] },
  { matches: ['sneaker'], keywords: ['sneaker', 'shoe'] },
  { matches: ['sandal'], keywords: ['sandal', 'shoe'] },
  { matches: ['heel'], keywords: ['heel', 'shoe'] },
  { matches: ['boot'], keywords: ['boot', 'shoe'] },
  { matches: ['tote'], keywords: ['tote', 'bag'] },
  { matches: ['watch', 'dong ho'], keywords: ['watch'] },
  { matches: ['cap', 'hat', 'mu'], keywords: ['cap', 'hat'] },
  { matches: ['glasses', 'kinh'], keywords: ['glasses'] },
];

type RecommendationContext = {
  weatherKeywords: string[];
  moodKeywords: string[];
  styleKeywords: string[];
  occasionKeywords: string[];
  outfitKeywords: string[];
  outfitSummary: string;
  profileAudience: ProfileAudience | null;
};

type GroupFallbackMode = 'exact' | 'slot-fallback' | 'empty';

const SLOT_KEYWORDS: Record<OutfitSlotKey, string[]> = {
  top: ['shirt', 'so mi', 'tee', 't-shirt', 'tank', 'blazer', 'hoodie', 'jacket', 'cardigan', 'sweater'],
  bottom: ['pants', 'trouser', 'chino', 'jean', 'denim', 'cargo', 'short', 'skirt', 'quan', 'quần'],
  shoes: ['shoe', 'sneaker', 'loafer', 'sandal', 'heel', 'boot', 'giay', 'giày'],
  accessories: ['tote', 'bag', 'watch', 'cap', 'hat', 'glasses', 'belt', 'jewelry', 'phu kien', 'phụ kiện', 'that lung'],
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const containsKeyword = (text: string, keyword: string) => {
  const normalizedText = ` ${normalizeText(text)} `;
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedKeyword) return false;

  return normalizedText.includes(` ${normalizedKeyword} `);
};

const collectKeywords = (value: string, rules: Array<{ matches: string[]; keywords: string[] }>) => {
  const normalized = normalizeText(value);
  const keywords = new Set<string>();

  for (const rule of rules) {
    if (rule.matches.some((match) => containsKeyword(normalized, match))) {
      rule.keywords.forEach((keyword) => keywords.add(keyword));
    }
  }

  return Array.from(keywords);
};

const getWeatherPreferenceKeywords = (weather: WeatherResponse | null) => {
  if (!weather) return [];

  const keywords = new Set<string>(SEASON_KEYWORDS[getSeasonKey(weather.seasonContext)]);
  const description = normalizeText(weather.description);

  if (weather.temperatureC >= 29) {
    ['linen', 'cotton', 'tee', 'tank', 'short', 'shirt'].forEach((keyword) => keywords.add(keyword));
  } else if (weather.temperatureC <= 22) {
    ['jacket', 'hoodie', 'cardigan', 'knit'].forEach((keyword) => keywords.add(keyword));
  }

  if (description.includes('rain') || description.includes('mua')) {
    ['jacket', 'hoodie', 'coat'].forEach((keyword) => keywords.add(keyword));
  }

  return Array.from(keywords);
};

const getProductSearchBlob = (product: Product) =>
  normalizeText([
    product.name,
    product.description || '',
    product.category?.name || '',
    product.category?.slug || '',
    product.brand?.name || '',
  ].join(' '));

const hasAnyKeyword = (text: string, keywords: string[]) => keywords.some((keyword) => containsKeyword(text, keyword));

const countKeywordMatches = (text: string, keywords: string[]) =>
  keywords.filter((keyword) => containsKeyword(text, keyword)).length;

const classifyProductSlot = (product: Product): OutfitSlotKey | null => {
  const slotFromCategory = detectProductSlotFromCategory(product);
  if (slotFromCategory) {
    return slotFromCategory;
  }

  const searchBlob = getProductSearchBlob(product);
  const scoreMap: Record<OutfitSlotKey, number> = {
    top: countKeywordMatches(searchBlob, SLOT_KEYWORDS.top),
    bottom: countKeywordMatches(searchBlob, SLOT_KEYWORDS.bottom),
    shoes: countKeywordMatches(searchBlob, SLOT_KEYWORDS.shoes),
    accessories: countKeywordMatches(searchBlob, SLOT_KEYWORDS.accessories),
  };

  const ranked = (Object.entries(scoreMap) as Array<[OutfitSlotKey, number]>)
    .filter(([, score]) => score > 0)
    .sort((left, right) => right[1] - left[1]);

  return ranked[0]?.[0] ?? null;
};

const scoreProduct = (product: Product, context: RecommendationContext, prioritizedKeywords: string[] = []) => {
  const searchBlob = getProductSearchBlob(product);
  let score = 0;

  if (prioritizedKeywords.length > 0) {
    score += prioritizedKeywords.filter((keyword) => containsKeyword(searchBlob, keyword)).length * 6;
  }

  if (context.outfitKeywords.length > 0) {
    score += context.outfitKeywords.filter((keyword) => containsKeyword(searchBlob, keyword)).length * 5;
  }

  if (context.styleKeywords.length > 0) {
    score += context.styleKeywords.filter((keyword) => containsKeyword(searchBlob, keyword)).length * 4;
  }

  if (context.occasionKeywords.length > 0) {
    score += context.occasionKeywords.filter((keyword) => containsKeyword(searchBlob, keyword)).length * 3;
  }

  if (context.moodKeywords.length > 0) {
    score += context.moodKeywords.filter((keyword) => containsKeyword(searchBlob, keyword)).length * 3;
  }

  if (context.weatherKeywords.length > 0) {
    score += context.weatherKeywords.filter((keyword) => containsKeyword(searchBlob, keyword)).length * 2;
  }

  if (context.outfitSummary && containsKeyword(searchBlob, context.outfitSummary)) {
    score += 4;
  }

  if (context.profileAudience && context.profileAudience !== 'unisex') {
    if (matchesProfileAudience(product, context.profileAudience)) {
      score += 6;
    } else {
      score -= 20;
    }
  }

  return score;
};

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 300_000,
};

const GEOLOCATION_FALLBACK_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 15_000,
  maximumAge: 600_000,
};

const getHemisphere = (lat: number): 'north' | 'south' => (lat < 0 ? 'south' : 'north');

type GeolocationPermissionState = PermissionState | 'unsupported';

const getGeolocationPermissionState = async (): Promise<GeolocationPermissionState> => {
  if (!('permissions' in navigator) || !navigator.permissions?.query) {
    return 'unsupported';
  }

  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'unsupported';
  }
};

const getGeolocationPosition = (options: PositionOptions = GEOLOCATION_OPTIONS) =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

const resolveGeolocationErrorMessage = ({
  error,
  permissionState,
  t,
}: {
  error: unknown;
  permissionState: GeolocationPermissionState;
  t: ReturnType<typeof useTranslation>['t'];
}) => {
  const errorCode =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'number'
      ? error.code
      : undefined;

  if (!window.isSecureContext) {
    return t('stylist.errors.locationInsecureContext');
  }

  if (errorCode === 1) {
    if (permissionState === 'granted') {
      return t('stylist.errors.locationBlockedBySystem');
    }

    return t('stylist.errors.locationPermissionDenied');
  }

  if (errorCode === 3) {
    return t('stylist.errors.locationTimeout');
  }

  if (typeof GeolocationPositionError !== 'undefined' && error instanceof GeolocationPositionError) {
    if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
      return t('stylist.errors.locationPermissionDenied');
    }

    if (error.code === GeolocationPositionError.TIMEOUT) {
      return t('stylist.errors.locationTimeout');
    }
  }

  return t('stylist.errors.locationUnavailable');
};

export const Stylist: React.FC = () => {
  const { t } = useTranslation('pages');
  const navigate = useNavigate();
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [outfit, setOutfit] = useState<OutfitRecommendation | null>(null);
  const [outfitLocation, setOutfitLocation] = useState<OutfitLocationInput | null>(null);
  const [profile, setProfile] = useState<OutfitProfile>(defaultProfile);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOutfit, setLoadingOutfit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const moodChoices = useMemo(
    () => [
      { value: 'work', label: t('stylist.moods.work') },
      { value: 'casual', label: t('stylist.moods.casual') },
      { value: 'travel', label: t('stylist.moods.travel') },
      { value: 'evening', label: t('stylist.moods.evening') },
    ],
    [t],
  );

  const quickCities = useMemo(
    () => [
      { label: t('stylist.cities.hanoi'), query: QUICK_CITIES[0].query },
      { label: t('stylist.cities.hoChiMinh'), query: QUICK_CITIES[1].query },
      { label: t('stylist.cities.daNang'), query: QUICK_CITIES[2].query },
      { label: t('stylist.cities.hue'), query: QUICK_CITIES[3].query },
    ],
    [t],
  );

  const [activeMood, setActiveMood] = useState(moodChoices[0].value);

  const selectedGenderOption = useMemo(
    () => PROFILE_GENDER_OPTIONS.find((option) => option.value === profile.gender),
    [profile.gender],
  );

  const selectedStyleOption = useMemo(
    () => PROFILE_STYLE_OPTIONS.find((option) => option.value === profile.style),
    [profile.style],
  );

  const selectedOccasionOption = useMemo(
    () => PROFILE_OCCASION_OPTIONS.find((option) => option.value === profile.occasion),
    [profile.occasion],
  );

  const audienceFilteredProducts = useMemo(
    () => products.filter((product) => matchesProfileAudience(product, selectedGenderOption?.audience ?? null)),
    [products, selectedGenderOption?.audience],
  );

  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const firstPage = await fetchProductsPage({
          status: 'Active',
          page: 1,
          limit: STYLIST_PRODUCT_PAGE_SIZE,
        });

        if (firstPage.meta.totalPages <= 1) {
          setProducts(firstPage.data);
          return;
        }

        const remainingPages = await Promise.all(
          Array.from({ length: firstPage.meta.totalPages - 1 }, (_, index) =>
            fetchProductsPage({
              status: 'Active',
              page: index + 2,
              limit: STYLIST_PRODUCT_PAGE_SIZE,
            }),
          ),
        );

        setProducts([firstPage.data, ...remainingPages.map((page) => page.data)].flat());
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProducts(false);
      }
    };
    void loadProducts();
  }, []);

  useEffect(() => {
    if (!moodChoices.some((mood) => mood.value === activeMood)) {
      setActiveMood(moodChoices[0].value);
    }
  }, [activeMood, moodChoices]);

  const weatherSummary = useMemo(() => {
    if (!weather) return null;
    return `${weather.locationName} · ${weather.temperatureC.toFixed(1)}°C · ${weather.description}`;
  }, [weather]);

  const chatContextSummary = useMemo(() => {
    const parts: string[] = [];
    const activeMoodLabel = moodChoices.find((mood) => mood.value === activeMood)?.label;

    if (weatherSummary) parts.push(weatherSummary);
    if (weather?.seasonContext) parts.push(`Season context: ${weather.seasonContext}`);
    if (activeMoodLabel) parts.push(`Preferred mood: ${activeMoodLabel}`);
    if (selectedGenderOption) parts.push(`Gender profile: ${selectedGenderOption.promptValue}`);
    if (selectedStyleOption) parts.push(`Style profile: ${selectedStyleOption.promptValue}`);
    if (selectedOccasionOption) parts.push(`Occasion profile: ${selectedOccasionOption.promptValue}`);
    if (profile.tolerance) parts.push(`Temperature tolerance: ${TOLERANCE_PROMPT_VALUES[profile.tolerance]}`);
    if (outfit?.summary) parts.push(`Current outfit suggestion: ${outfit.summary}`);

    return parts.join('\n');
  }, [
    activeMood,
    moodChoices,
    outfit?.summary,
    profile.tolerance,
    selectedGenderOption,
    selectedOccasionOption,
    selectedStyleOption,
    weather?.seasonContext,
    weatherSummary,
  ]);

  const recommendationContext = useMemo<RecommendationContext>(() => {
    const weatherKeywords = getWeatherPreferenceKeywords(weather);
    const moodKeywords = MOOD_KEYWORDS[activeMood] || [];
    const styleKeywords = selectedStyleOption?.keywords || [];
    const occasionKeywords = selectedOccasionOption?.keywords || [];
    const outfitKeywords = outfit
      ? collectKeywords(
          [outfit.summary, outfit.items.top, outfit.items.bottom, outfit.items.shoes, ...outfit.items.accessories].join(' '),
          OUTFIT_KEYWORD_RULES,
        )
      : [];

    return {
      weatherKeywords,
      moodKeywords,
      styleKeywords,
      occasionKeywords,
      outfitKeywords,
      outfitSummary: normalizeText(outfit?.summary || ''),
      profileAudience: selectedGenderOption?.audience ?? null,
    };
  }, [activeMood, outfit, selectedGenderOption, selectedOccasionOption, selectedStyleOption, weather]);

  const recommendedProducts = useMemo(() => {
    if (audienceFilteredProducts.length === 0) return [];

    const scored = audienceFilteredProducts.map((product) => ({
      product,
      score: scoreProduct(product, recommendationContext),
    }));

    const positiveMatches = scored
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.product.name.localeCompare(right.product.name));

    if (positiveMatches.length > 0) {
      return positiveMatches.slice(0, 8).map((entry) => entry.product);
    }

    const seasonKey = getSeasonKey(weather?.seasonContext);
    const seasonalFallbackKeywords = SEASON_KEYWORDS[seasonKey];
    const filtered = audienceFilteredProducts.filter((item) => {
      const searchBlob = getProductSearchBlob(item);
      return seasonalFallbackKeywords.some((keyword) => containsKeyword(searchBlob, keyword));
    });

    return (filtered.length > 0 ? filtered : audienceFilteredProducts).slice(0, 8);
  }, [audienceFilteredProducts, recommendationContext, weather]);

  const groupedRecommendations = useMemo(() => {
    if (!outfit) return [];

    const slots: Array<{ key: OutfitSlotKey; sourceText: string }> = [
      { key: 'top', sourceText: outfit.items.top },
      { key: 'bottom', sourceText: outfit.items.bottom },
      { key: 'shoes', sourceText: outfit.items.shoes },
      { key: 'accessories', sourceText: outfit.items.accessories.join(' ') },
    ];

    const usedProductIds = new Set<number>();

    return slots.map((slot) => {
      const slotKeywords = Array.from(
        new Set([
          ...SLOT_KEYWORDS[slot.key],
          ...collectKeywords(slot.sourceText, OUTFIT_KEYWORD_RULES),
        ]),
      );

      const slotPool = audienceFilteredProducts.filter((product) => classifyProductSlot(product) === slot.key);

      const ranked = slotPool
        .map((product) => ({
          product,
          score: scoreProduct(product, recommendationContext, slotKeywords),
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score || left.product.name.localeCompare(right.product.name));

      const exactMatches = ranked
        .filter((entry) => !usedProductIds.has(entry.product.productId))
        .slice(0, 2)
        .map((entry) => entry.product);

      const slotFallback = slotPool
        .filter((product) => !usedProductIds.has(product.productId) && !exactMatches.some((item) => item.productId === product.productId))
        .map((product) => ({
          product,
          score: scoreProduct(product, recommendationContext, slotKeywords),
        }))
        .sort((left, right) => right.score - left.score || left.product.name.localeCompare(right.product.name))
        .slice(0, Math.max(0, 2 - exactMatches.length))
        .map((entry) => entry.product);

      const matches = [...exactMatches, ...slotFallback];

      matches.forEach((product) => usedProductIds.add(product.productId));

      let fallbackMode: GroupFallbackMode = 'empty';
      if (exactMatches.length > 0 && slotFallback.length === 0) {
        fallbackMode = 'exact';
      } else if (matches.length > 0) {
        fallbackMode = 'slot-fallback';
      }

      return {
        key: slot.key,
        products: matches,
        fallbackMode,
      };
    });
  }, [audienceFilteredProducts, outfit, recommendationContext]);

  const handleUseLocation = () => {
    setError(null);
    setCityError(null);
    setLoadingWeather(true);

    const loadWeatherFromCurrentLocation = async () => {
      const permissionState = await getGeolocationPermissionState();

      try {
        let position: GeolocationPosition;

        try {
          position = await getGeolocationPosition();
        } catch (primaryError) {
          const primaryCode =
            typeof primaryError === 'object' && primaryError !== null && 'code' in primaryError && typeof primaryError.code === 'number'
              ? primaryError.code
              : undefined;

          if (primaryCode !== 2 && primaryCode !== 3) {
            throw primaryError;
          }

          position = await getGeolocationPosition(GEOLOCATION_FALLBACK_OPTIONS);
        }

        const data = await fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
        setWeather(data);
        setCity(data.locationName);
        setOutfitLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          hemisphere: getHemisphere(position.coords.latitude),
        });
        setOutfit(null);
      } catch (geoError) {
        console.warn('Geolocation failed', {
          isSecureContext: window.isSecureContext,
          permissionState,
          error: geoError,
        });

        if (!navigator.geolocation) {
          setError(t('stylist.errors.geoNotSupported'));
        } else {
          setError(resolveGeolocationErrorMessage({ error: geoError, permissionState, t }));
        }
      } finally {
        setLoadingWeather(false);
      }
    };

    void loadWeatherFromCurrentLocation();
  };

  const handleCityPick = async (selectedCity: string) => {
    setCity(selectedCity);
    setError(null);
    setCityError(null);
    setLoadingWeather(true);
    try {
      const data = await fetchWeatherByCity(selectedCity);
      setWeather(data);
      setOutfitLocation({
        city: selectedCity,
        hemisphere: getHemisphere(data.lat),
      });
      setOutfit(null);
    } catch (err) {
      setCityError((err as Error).message);
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleSearchCity = async () => {
    if (!city.trim()) {
      setCityError(t('weatherOutfit.errors.cityRequired'));
      return;
    }

    await handleCityPick(city.trim());
  };

  const handleRecommend = async () => {
    if (!weather) {
      setError(t('weatherOutfit.errors.weatherRequired'));
      return;
    }

    if (!outfitLocation || (!outfitLocation.city && (outfitLocation.lat === undefined || outfitLocation.lon === undefined))) {
      setError(t('weatherOutfit.errors.weatherRequired'));
      return;
    }

    setError(null);
    setLoadingOutfit(true);
    try {
      const activeMoodLabel = moodChoices.find((mood) => mood.value === activeMood)?.label;
      const data = await requestOutfitRecommendation({
        location: outfitLocation,
        profile: {
          gender: selectedGenderOption?.promptValue || undefined,
          style: selectedStyleOption?.promptValue || undefined,
          tolerance: profile.tolerance,
          occasion: selectedOccasionOption?.promptValue || activeMoodLabel || activeMood,
        },
      });
      setWeather(data.weather);
      setCity(data.weather.locationName);
      setOutfit(data.recommendation);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingOutfit(false);
    }
  };

  return (
    <div className="bg-bg-dark text-white font-sans min-h-screen flex flex-col overflow-x-hidden">
      <Header />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 md:px-12 pt-28 pb-20">
        <section className="grid lg:grid-cols-[1.15fr_0.85fr] gap-8 items-start mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-primary text-xs font-bold uppercase tracking-[0.3em]">{t('stylist.hero.badge')}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight leading-[0.95]">
              {t('stylist.hero.titleLine1')} <br /> <span className="text-white/40">{t('stylist.hero.titleLine2')}</span>
            </h1>
            <p className="mt-5 text-gray-400 max-w-xl text-lg leading-relaxed">{t('stylist.hero.description')}</p>

            <div className="mt-8 space-y-4">
              <div className="flex flex-wrap gap-2">
                <button onClick={handleUseLocation} className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-widest">
                  {t('stylist.actions.useCurrentLocation')}
                </button>
                <div className="flex flex-1 min-w-[260px] gap-2">
                  <input
                    list="stylist-city-suggestions"
                    value={city}
                    onChange={(event) => {
                      setCity(event.target.value);
                      setCityError(null);
                    }}
                    placeholder={t('weatherOutfit.weatherInput.cityPlaceholder')}
                    className={`flex-1 bg-black/30 border rounded-sm px-3 py-2 text-sm text-white ${cityError ? 'border-red-500 focus:border-red-400' : 'border-white/10'}`}
                  />
                  <button
                    onClick={() => void handleSearchCity()}
                    className="px-4 py-2 border border-white/20 text-xs font-bold uppercase tracking-widest text-white/80 hover:border-white hover:text-white transition-colors"
                  >
                    {t('weatherOutfit.actions.search')}
                  </button>
                </div>
              </div>
              <datalist id="stylist-city-suggestions">
                {quickCities.map((cityOption) => (
                  <option key={`suggestion-${cityOption.query}`} value={cityOption.query}>
                    {cityOption.label}
                  </option>
                ))}
              </datalist>
              <div className="flex flex-wrap gap-2">
                {quickCities.map((cityOption) => (
                  <button
                    key={cityOption.query}
                    onClick={() => void handleCityPick(cityOption.query)}
                    className="px-4 py-2 border border-white/10 text-white/80 text-xs font-bold uppercase tracking-widest hover:border-white hover:text-white transition-colors"
                  >
                    {cityOption.label}
                  </button>
                ))}
              </div>
              {cityError && <p className="text-xs text-red-400">{cityError}</p>}
              {loadingWeather && <p className="text-xs text-white/60">{t('stylist.states.loadingWeather')}</p>}
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>

            <div className="mt-8">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">{t('stylist.moods.title')}</p>
              <div className="flex flex-wrap gap-2">
                {moodChoices.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setActiveMood(item.value)}
                    className={`px-4 py-2 rounded-sm border text-xs font-bold uppercase tracking-widest transition-all ${
                      activeMood === item.value ? 'border-primary text-primary bg-primary/10' : 'border-white/10 text-white/70 hover:text-white hover:border-white'
                    }`}
                  >
                    {item.label}
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
              <div className="w-16 h-16 bg-white/5 rounded flex items-center justify-center border border-white/10 overflow-hidden">
                {weather?.icon ? (
                  <img src={weather.icon} alt={weather.description} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-4xl text-white">cloud</span>
                )}
              </div>
              <div>
                <div className="text-4xl font-bold text-white flex gap-2 items-end">
                  {weather ? `${weather.temperatureC.toFixed(1)}°C` : '--'}
                  <span className="text-lg font-medium text-gray-400">{weather ? weather.description : t('stylist.states.noDataShort')}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  {weather ? weather.locationName : t('stylist.states.selectLocation')}
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 pt-4 relative z-10 space-y-2">
              <p className="text-xs uppercase tracking-widest text-white/60">{weatherSummary ?? t('stylist.states.noWeatherData')}</p>
              {weather && (
                <p className="text-sm text-white/70">
                  {t('stylist.labels.humidity')} {weather.humidity}% · {t('stylist.labels.wind')} {Math.round(weather.windSpeedKph)} km/h · {weather.seasonContext}
                </p>
              )}
              {outfit?.summary && <p className="text-sm text-primary">{outfit.summary}</p>}
            </div>
          </div>
        </section>

        <section className="grid xl:grid-cols-[0.95fr_1.05fr] gap-6 mb-12">
          <div className="bg-surface-dark/70 border border-white/10 rounded-sm p-6 md:p-8 flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-primary">{t('weatherOutfit.hero.badge')}</p>
              <h2 className="mt-3 text-2xl md:text-3xl font-bold">{t('weatherOutfit.profile.title')}</h2>
              <p className="mt-2 text-sm text-white/55 max-w-xl">{t('weatherOutfit.profile.note')}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-widest text-white/55">{t('weatherOutfit.profile.genderLabel')}</span>
                <select
                  value={profile.gender || ''}
                  onChange={(event) => setProfile((prev) => ({ ...prev, gender: event.target.value }))}
                  className="bg-black/30 border border-white/10 rounded-sm px-3 py-2 text-sm"
                >
                  <option value="">{t('weatherOutfit.profile.genderPlaceholder')}</option>
                  {PROFILE_GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-widest text-white/55">{t('weatherOutfit.profile.styleLabel')}</span>
                <select
                  value={profile.style || ''}
                  onChange={(event) => setProfile((prev) => ({ ...prev, style: event.target.value }))}
                  className="bg-black/30 border border-white/10 rounded-sm px-3 py-2 text-sm"
                >
                  <option value="">{t('weatherOutfit.profile.stylePlaceholder')}</option>
                  {PROFILE_STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-widest text-white/55">{t('weatherOutfit.profile.occasionLabel')}</span>
                <select
                  value={profile.occasion || ''}
                  onChange={(event) => setProfile((prev) => ({ ...prev, occasion: event.target.value }))}
                  className="bg-black/30 border border-white/10 rounded-sm px-3 py-2 text-sm"
                >
                  <option value="">{t('weatherOutfit.profile.occasionPlaceholder')}</option>
                  {PROFILE_OCCASION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-widest text-white/55">{t('weatherOutfit.profile.toleranceLabel')}</span>
                <select
                  value={profile.tolerance || 'medium'}
                  onChange={(event) => setProfile((prev) => ({ ...prev, tolerance: event.target.value as OutfitProfile['tolerance'] }))}
                  className="bg-black/30 border border-white/10 rounded-sm px-3 py-2 text-sm"
                >
                  <option value="low">{t('weatherOutfit.profile.tolerance.low')}</option>
                  <option value="medium">{t('weatherOutfit.profile.tolerance.medium')}</option>
                  <option value="high">{t('weatherOutfit.profile.tolerance.high')}</option>
                </select>
              </label>
            </div>

            <p className="text-xs text-white/45 leading-relaxed">{t('weatherOutfit.profile.aiContextHint')}</p>

            <button
              onClick={() => void handleRecommend()}
              disabled={loadingOutfit}
              className="self-start px-5 py-3 bg-white text-black text-xs font-bold uppercase tracking-[0.3em] disabled:opacity-50"
            >
              {loadingOutfit ? t('weatherOutfit.actions.recommending') : t('weatherOutfit.actions.recommend')}
            </button>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-sm p-6 md:p-8">
            <h2 className="text-lg font-semibold mb-4">{t('weatherOutfit.result.title')}</h2>
            {outfit ? (
              <div className="flex flex-col gap-4">
                <p className="text-white/80">{outfit.summary}</p>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-white/70">
                  <div>
                    <p className="text-white font-semibold mb-2">{t('weatherOutfit.result.outfitTitle')}</p>
                    <ul className="space-y-1">
                      <li>{t('weatherOutfit.result.top')}: {outfit.items.top}</li>
                      <li>{t('weatherOutfit.result.bottom')}: {outfit.items.bottom}</li>
                      <li>{t('weatherOutfit.result.shoes')}: {outfit.items.shoes}</li>
                      <li>{t('weatherOutfit.result.accessories')}: {outfit.items.accessories.join(', ')}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-white font-semibold mb-2">{t('weatherOutfit.result.tipsTitle')}</p>
                    <ul className="list-disc list-inside space-y-1">
                      {outfit.tips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                    {outfit.warnings.length > 0 && (
                      <>
                        <p className="text-white font-semibold mt-4 mb-2">{t('weatherOutfit.result.warningsTitle')}</p>
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
              <p className="text-sm text-white/60">{t('weatherOutfit.states.noOutfit')}</p>
            )}
          </div>
        </section>

        <section className="bg-surface-dark/70 border border-white/10 rounded-sm p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-primary">{t('stylist.products.badge')}</p>
              <h2 className="text-2xl md:text-3xl font-bold">
                {outfit ? t('stylist.products.titleWithOutfit') : t('stylist.products.title')}
              </h2>
            </div>
            <p className="text-xs uppercase tracking-widest text-white/50">
              {t('stylist.moods.current')}: {moodChoices.find((mood) => mood.value === activeMood)?.label}
            </p>
          </div>

          {outfit && (
            <p className="mb-6 max-w-3xl text-sm text-white/60">
              {t('stylist.products.matchingHint')}
            </p>
          )}

          {loadingProducts ? (
            <p className="text-sm text-white/60">{t('stylist.states.loadingProducts')}</p>
          ) : outfit ? (
            <div className="grid xl:grid-cols-2 gap-6">
              {groupedRecommendations.map((group) => (
                <div key={group.key} className="rounded-sm border border-white/10 bg-black/30 p-4">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-white">
                      {group.key === 'top' && t('weatherOutfit.result.top')}
                      {group.key === 'bottom' && t('weatherOutfit.result.bottom')}
                      {group.key === 'shoes' && t('weatherOutfit.result.shoes')}
                      {group.key === 'accessories' && t('weatherOutfit.result.accessories')}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">
                      {group.products.length} {t('stylist.products.itemsLabel')}
                    </p>
                  </div>

                  {group.fallbackMode === 'slot-fallback' && (
                    <p className="mb-4 text-xs text-white/45">{t('stylist.products.slotFallbackHint')}</p>
                  )}

                  {group.products.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {group.products.map((product) => {
                        const image = getPrimaryImage(product);
                        return (
                          <button
                            key={`${group.key}-${product.productId}`}
                            onClick={() => navigate(`/product/${product.productId}`)}
                            className="text-left bg-black/40 border border-white/10 rounded-sm overflow-hidden hover:border-white/30 transition-colors"
                          >
                            <div className="aspect-[4/5] bg-black/60 overflow-hidden">
                              {image && <img src={getCloudinaryProductCard(image)} alt={product.name} className="w-full h-full object-cover" />}
                            </div>
                            <div className="p-4">
                              <p className="text-xs uppercase tracking-widest text-white/50 mb-2">{product.category?.name || 'Aisthea'}</p>
                              <h3 className="text-base font-semibold text-white mb-2 line-clamp-2">{product.name}</h3>
                              <p className="text-sm font-bold text-primary">{new Intl.NumberFormat('vi-VN').format(product.basePrice)}đ</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-white/50">{t('stylist.products.noSlotProducts')}</p>
                      <p className="text-xs text-white/35">{t('stylist.products.noSlotProductsHint')}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendedProducts.map((product) => {
                const image = getPrimaryImage(product);
                return (
                  <button
                    key={product.productId}
                    onClick={() => navigate(`/product/${product.productId}`)}
                    className="text-left bg-black/40 border border-white/10 rounded-sm overflow-hidden hover:border-white/30 transition-colors"
                  >
                    <div className="aspect-[4/5] bg-black/60 overflow-hidden">
                      {image && <img src={getCloudinaryProductCard(image)} alt={product.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="p-4">
                      <p className="text-xs uppercase tracking-widest text-white/50 mb-2">{product.category?.name || 'Aisthea'}</p>
                      <h3 className="text-base font-semibold text-white mb-2 line-clamp-2">{product.name}</h3>
                      <p className="text-sm font-bold text-primary">{new Intl.NumberFormat('vi-VN').format(product.basePrice)}đ</p>
                    </div>
                  </button>
                );
              })}
              {recommendedProducts.length === 0 && <p className="text-sm text-white/60">{t('stylist.states.noProducts')}</p>}
            </div>
          )}
        </section>
      </main>

      <ChatWidget page="stylist" contextSummary={chatContextSummary || undefined} />
    </div>
  );
};
