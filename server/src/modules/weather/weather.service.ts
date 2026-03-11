import { fetchWeather } from '../../services/weatherApi.service';
import { getSeasonContext } from './season.util';
import { WeatherWithSeason } from '../../types/weather.types';
import { env } from '../../lib/env';

export const getWeatherWithSeason = async ({
  lat,
  lon,
  city,
  hemisphere = 'north',
}: {
  lat?: number;
  lon?: number;
  city?: string;
  hemisphere?: 'north' | 'south';
}): Promise<WeatherWithSeason> => {
  const weather = await fetchWeather({
    lat,
    lon,
    city,
    apiKey: env.weatherApiKey,
  });

  const month = new Date(weather.localTime).getMonth() + 1;
  const seasonContext = getSeasonContext({
    temperatureC: weather.temperatureC,
    humidity: weather.humidity,
    month,
    hemisphere,
  });

  return { ...weather, seasonContext };
};
