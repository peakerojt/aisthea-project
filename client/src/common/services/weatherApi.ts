import { api } from '@/common/utils/api';
import { WeatherResponse } from '@/types/weather';

export const fetchWeatherByCoords = async (lat: number, lon: number) => {
  const res = await api.get<{ success: boolean; data: WeatherResponse }>('/api/weather', {
    params: { lat: lat.toString(), lon: lon.toString() },
  });
  return (res as { data?: WeatherResponse }).data ?? (res as unknown as WeatherResponse);
};

export const fetchWeatherByCity = async (city: string) => {
  const res = await api.get<{ success: boolean; data: WeatherResponse }>('/api/weather', {
    params: { city },
  });
  return (res as { data?: WeatherResponse }).data ?? (res as unknown as WeatherResponse);
};
