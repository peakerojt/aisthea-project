export interface NormalizedWeather {
  locationName: string;
  temperatureC: number;
  humidity: number;
  windSpeedKph: number;
  description: string;
  icon: string;
  weatherCode: number;
  timezone: string;
  localTime: string;
  lat: number;
  lon: number;
}

export interface WeatherQueryInput {
  lat?: number;
  lon?: number;
  city?: string;
}

export interface WeatherWithSeason extends NormalizedWeather {
  seasonContext: string;
}
