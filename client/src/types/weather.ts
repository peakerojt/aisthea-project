export interface WeatherResponse {
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
  seasonContext: string;
}
