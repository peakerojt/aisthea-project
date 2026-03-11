import { NormalizedWeather } from '../types/weather.types';
import { logger } from '../lib/logger';

const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

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
    }

    return normalized;
  } catch (error) {
    logger.error('Failed to fetch weather data', { error });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
