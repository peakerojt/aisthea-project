import { NormalizedWeather } from '../types/weather.types';
import { logger } from '../lib/logger';

const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const REVERSE_GEOCODE_BASE_URL = 'https://nominatim.openstreetmap.org/reverse';
const REVERSE_GEOCODE_TIMEOUT_MS = 5_000;

interface OpenWeatherResponse {
  coord: {
    lon: number;
    lat: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  main: {
    temp: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
  timezone: number;
  dt: number;
  name: string;
  sys?: {
    country?: string;
  };
}

interface ReverseGeocodeResponse {
  address?: {
    city?: string;
    town?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country_code?: string;
  };
}

const toNormalizedWeather = (data: OpenWeatherResponse): NormalizedWeather => {
  const condition = data.weather?.[0];
  const localTime = new Date((data.dt + data.timezone) * 1000).toISOString();
  const locationName = data.sys?.country ? `${data.name}, ${data.sys.country}` : data.name;

  return {
    locationName,
    temperatureC: data.main.temp,
    humidity: data.main.humidity,
    windSpeedKph: data.wind.speed * 3.6,
    description: condition?.description || condition?.main || 'Clear',
    icon: condition?.icon ? `https://openweathermap.org/img/wn/${condition.icon}@2x.png` : '',
    weatherCode: condition?.id ?? 0,
    timezone: `UTC${data.timezone >= 0 ? '+' : ''}${(data.timezone / 3600).toFixed(0)}`,
    localTime,
    lat: data.coord.lat,
    lon: data.coord.lon,
  };
};

const buildCityCountryLabel = (payload: ReverseGeocodeResponse) => {
  const city =
    payload.address?.city ||
    payload.address?.town ||
    payload.address?.municipality ||
    payload.address?.county ||
    payload.address?.state;
  const countryCode = payload.address?.country_code?.toUpperCase();

  if (!city) return null;
  if (!countryCode) return city;

  return `${city}, ${countryCode}`;
};

const fetchDisplayLocationName = async ({
  lat,
  lon,
}: {
  lat: number;
  lon: number;
}): Promise<string | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVERSE_GEOCODE_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'jsonv2',
      zoom: '7',
      addressdetails: '1',
      'accept-language': 'en',
    });

    const response = await fetch(`${REVERSE_GEOCODE_BASE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AISTHEA-Project/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Reverse geocode API error: ${response.status}`);
    }

    const payload = (await response.json()) as ReverseGeocodeResponse;
    return buildCityCountryLabel(payload);
  } catch (error) {
    logger.warn('Failed to reverse geocode weather coordinates', {
      error: error instanceof Error ? error.message : String(error),
      lat,
      lon,
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const fetchWeather = async ({
  lat,
  lon,
  city,
  apiKey,
  timeoutMs = 8000,
}: {
  lat?: number;
  lon?: number;
  city?: string;
  apiKey?: string;
  timeoutMs?: number;
}): Promise<NormalizedWeather> => {
  if (!apiKey) {
    logger.error('WEATHER_API_KEY is missing.');
    throw new Error('WEATHER_API_KEY is missing.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (!city && (lat === undefined || lon === undefined)) {
      throw new Error('Missing coordinates for weather lookup.');
    }

    const params: Record<string, string> = {
      appid: apiKey,
      units: 'metric',
    };

    if (city) {
      params.q = city;
    } else {
      params.lat = String(lat);
      params.lon = String(lon);
    }

    const url = `${WEATHER_BASE_URL}?${new URLSearchParams(params).toString()}`;

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Weather API error: ${response.status} ${text}`);
    }

    const data = (await response.json()) as OpenWeatherResponse;
    const normalized = toNormalizedWeather(data);

    if (city) {
      normalized.locationName = city
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .join(', ');
    } else {
      const displayLocationName = await fetchDisplayLocationName({
        lat: normalized.lat,
        lon: normalized.lon,
      });

      if (displayLocationName) {
        normalized.locationName = displayLocationName;
      }
    }

    return normalized;
  } catch (error) {
    logger.error('Failed to fetch weather data', { error });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
