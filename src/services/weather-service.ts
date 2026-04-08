import type { Settings } from '../config.js';
import type {
  CurrentWeather,
  Forecast,
  ForecastDay,
  TemperatureUnit,
  WeatherAlert,
  AlertSeverity,
  OwmOneCallDailyItem,
} from '../models.js';
import { celsiusToFahrenheit, celsiusToKelvin } from '../utils/converters.js';
import type { OpenWeatherMapClient } from './openweathermap.js';

function convertTemperature(celsius: number, units: TemperatureUnit): number {
  switch (units) {
    case 'fahrenheit':
      return celsiusToFahrenheit(celsius);
    case 'kelvin':
      return celsiusToKelvin(celsius);
    case 'celsius':
    default:
      return celsius;
  }
}

function buildForecastDay(item: OwmOneCallDailyItem, units: TemperatureUnit): ForecastDay {
  return {
    date: new Date(item.dt * 1000).toISOString().split('T')[0]!,
    tempMin: convertTemperature(item.temp.min, units),
    tempMax: convertTemperature(item.temp.max, units),
    humidity: item.humidity,
    description: item.weather[0]!.description,
    icon: item.weather[0]!.icon,
  };
}

export class WeatherService {
  constructor(
    private client: OpenWeatherMapClient,
    private settings: Settings,
  ) {}

  async getCurrentWeather(
    lat: number,
    lon: number,
    units: TemperatureUnit = 'celsius',
    locationName?: string,
  ): Promise<CurrentWeather> {
    const data = await this.client.getOneCall(lat, lon, 'minutely,hourly,daily,alerts');
    const current = data.current!;

    return {
      temperature: convertTemperature(current.temp, units),
      feelsLike: convertTemperature(current.feels_like, units),
      humidity: current.humidity,
      pressure: current.pressure,
      windSpeed: current.wind_speed,
      windDirection: current.wind_deg,
      description: current.weather[0]!.description,
      icon: current.weather[0]!.icon,
      timestamp: current.dt,
      locationName: locationName ?? data.timezone,
      units,
    };
  }

  async getForecast(
    lat: number,
    lon: number,
    days: number = 5,
    units: TemperatureUnit = 'celsius',
    locationName?: string,
  ): Promise<Forecast> {
    const data = await this.client.getOneCall(lat, lon, 'current,minutely,hourly,alerts');
    const dailyItems = data.daily ?? [];

    return {
      locationName: locationName ?? data.timezone,
      units,
      days: dailyItems.slice(0, days).map((item) => buildForecastDay(item, units)),
    };
  }

  async getAlerts(lat: number, lon: number): Promise<WeatherAlert[]> {
    const data = await this.client.getOneCall(lat, lon, 'minutely,hourly,daily,alerts');
    const current = data.current!;
    return this.evaluateThresholds(current.temp, current.wind_speed, current.humidity);
  }

  private evaluateThresholds(
    temp: number,
    windSpeed: number,
    humidity: number,
  ): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];

    if (windSpeed >= this.settings.alertWindSpeedThreshold) {
      const severity: AlertSeverity =
        windSpeed >= this.settings.alertWindSpeedThreshold * 1.5 ? 'high' : 'medium';
      alerts.push({
        alertType: 'high_wind',
        message: `Wind speed ${windSpeed} m/s exceeds threshold of ${this.settings.alertWindSpeedThreshold} m/s`,
        severity,
        value: windSpeed,
        threshold: this.settings.alertWindSpeedThreshold,
      });
    }

    if (temp >= this.settings.alertTempHighThreshold) {
      const severity: AlertSeverity =
        temp >= this.settings.alertTempHighThreshold + 5 ? 'extreme' : 'high';
      alerts.push({
        alertType: 'extreme_heat',
        message: `Temperature ${temp}°C exceeds high threshold of ${this.settings.alertTempHighThreshold}°C`,
        severity,
        value: temp,
        threshold: this.settings.alertTempHighThreshold,
      });
    }

    if (temp <= this.settings.alertTempLowThreshold) {
      const severity: AlertSeverity =
        temp <= this.settings.alertTempLowThreshold - 10 ? 'extreme' : 'high';
      alerts.push({
        alertType: 'extreme_cold',
        message: `Temperature ${temp}°C below low threshold of ${this.settings.alertTempLowThreshold}°C`,
        severity,
        value: temp,
        threshold: this.settings.alertTempLowThreshold,
      });
    }

    if (humidity >= this.settings.alertHumidityThreshold) {
      alerts.push({
        alertType: 'high_humidity',
        message: `Humidity ${humidity}% exceeds threshold of ${this.settings.alertHumidityThreshold}%`,
        severity: 'low',
        value: humidity,
        threshold: this.settings.alertHumidityThreshold,
      });
    }

    return alerts;
  }
}
