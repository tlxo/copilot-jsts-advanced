import type { Settings } from '../config.js';
import type {
  CurrentWeather,
  Forecast,
  ForecastDay,
  TemperatureUnit,
  WeatherAlert,
  AlertSeverity,
  OwmForecastItem,
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

function mostCommon<T>(items: T[]): T {
  const counts = new Map<T, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  let best = items[0]!;
  let bestCount = 0;
  for (const [item, count] of counts) {
    if (count > bestCount) {
      best = item;
      bestCount = count;
    }
  }
  return best;
}

function aggregateForecastByDay(items: OwmForecastItem[]): ForecastDay[] {
  const grouped = new Map<string, OwmForecastItem[]>();
  for (const item of items) {
    const date = item.dt_txt.split(' ')[0]!;
    const group = grouped.get(date);
    if (group) {
      group.push(item);
    } else {
      grouped.set(date, [item]);
    }
  }

  const days: ForecastDay[] = [];
  for (const [date, group] of grouped) {
    days.push({
      date,
      tempMin: Math.min(...group.map((i) => i.main.temp_min)),
      tempMax: Math.max(...group.map((i) => i.main.temp_max)),
      humidity: Math.round(group.reduce((sum, i) => sum + i.main.humidity, 0) / group.length),
      description: mostCommon(group.map((i) => i.weather[0]!.description)),
      icon: mostCommon(group.map((i) => i.weather[0]!.icon)),
    });
  }

  return days;
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
    const data = await this.client.getCurrentWeather(lat, lon);

    return {
      temperature: convertTemperature(data.main.temp, units),
      feelsLike: convertTemperature(data.main.feels_like, units),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      description: data.weather[0]!.description,
      icon: data.weather[0]!.icon,
      timestamp: data.dt,
      locationName: locationName ?? data.name,
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
    const data = await this.client.getForecast(lat, lon);
    const aggregated = aggregateForecastByDay(data.list);

    const forecastDays: ForecastDay[] = aggregated.slice(0, days).map((day) => ({
      ...day,
      tempMin: convertTemperature(day.tempMin, units),
      tempMax: convertTemperature(day.tempMax, units),
    }));

    return {
      locationName: locationName ?? data.city.name,
      units,
      days: forecastDays,
    };
  }

  async getAlerts(lat: number, lon: number): Promise<WeatherAlert[]> {
    const data = await this.client.getCurrentWeather(lat, lon);
    return this.evaluateThresholds(data.main.temp, data.wind.speed, data.main.humidity);
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
