import { randomUUID } from 'node:crypto';
import type {
  Location,
  LocationCreate,
  LocationUpdate,
  CurrentWeather,
  ForecastDay,
  Forecast,
  WeatherAlert,
  OwmCurrentWeatherResponse,
  OwmForecastItem,
  OwmForecastResponse,
} from '../src/models.js';

// ── Domain Factories ──────────────────────────────────────────────────────────

export function makeCoordinates(overrides: { lat?: number; lon?: number } = {}) {
  return {
    lat: overrides.lat ?? 51.51,
    lon: overrides.lon ?? -0.13,
  };
}

export function makeLocation(overrides: Partial<Location> = {}): Location {
  const coords = makeCoordinates(overrides.coordinates);
  return {
    id: overrides.id ?? randomUUID(),
    name: overrides.name ?? 'London',
    coordinates: coords,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
  };
}

export function makeLocationCreate(overrides: Partial<LocationCreate> = {}): LocationCreate {
  return {
    name: overrides.name ?? 'London',
    lat: overrides.lat ?? 51.51,
    lon: overrides.lon ?? -0.13,
  };
}

export function makeLocationUpdate(overrides: Partial<LocationUpdate> = {}): LocationUpdate {
  return { ...overrides };
}

export function makeCurrentWeather(overrides: Partial<CurrentWeather> = {}): CurrentWeather {
  return {
    temperature: overrides.temperature ?? 15.0,
    feelsLike: overrides.feelsLike ?? 13.5,
    humidity: overrides.humidity ?? 72,
    pressure: overrides.pressure ?? 1013,
    windSpeed: overrides.windSpeed ?? 5.5,
    windDirection: overrides.windDirection ?? 220,
    description: overrides.description ?? 'scattered clouds',
    icon: overrides.icon ?? '03d',
    timestamp: overrides.timestamp ?? 1718452800,
    locationName: overrides.locationName ?? 'London',
    units: overrides.units ?? 'celsius',
  };
}

export function makeForecastDay(overrides: Partial<ForecastDay> = {}): ForecastDay {
  return {
    date: overrides.date ?? '2025-06-15',
    tempMin: overrides.tempMin ?? 12.0,
    tempMax: overrides.tempMax ?? 18.0,
    humidity: overrides.humidity ?? 65,
    description: overrides.description ?? 'light rain',
    icon: overrides.icon ?? '10d',
  };
}

export function makeForecast(overrides: Partial<Forecast> = {}): Forecast {
  return {
    locationName: overrides.locationName ?? 'London',
    units: overrides.units ?? 'celsius',
    days: overrides.days ?? [
      makeForecastDay({ date: '2025-06-15' }),
      makeForecastDay({ date: '2025-06-16', tempMin: 11.0, tempMax: 17.0 }),
      makeForecastDay({ date: '2025-06-17', tempMin: 13.0, tempMax: 20.0 }),
    ],
  };
}

export function makeWeatherAlert(overrides: Partial<WeatherAlert> = {}): WeatherAlert {
  return {
    alertType: overrides.alertType ?? 'high_wind',
    message: overrides.message ?? 'Wind speed 25 m/s exceeds threshold of 20 m/s',
    severity: overrides.severity ?? 'medium',
    value: overrides.value ?? 25,
    threshold: overrides.threshold ?? 20,
  };
}

// ── OWM 2.5 API Response Factories ───────────────────────────────────────────

export function makeOwmCurrentWeatherResponse(
  overrides: Partial<OwmCurrentWeatherResponse> = {},
): OwmCurrentWeatherResponse {
  return {
    weather: overrides.weather ?? [
      { id: 802, main: 'Clouds', description: 'scattered clouds', icon: '03d' },
    ],
    main: overrides.main ?? {
      temp: 15.0,
      feels_like: 13.5,
      pressure: 1013,
      humidity: 72,
    },
    wind: overrides.wind ?? { speed: 5.5, deg: 220 },
    dt: overrides.dt ?? 1718452800,
    name: overrides.name ?? 'London',
  };
}

export function makeOwmForecastItem(overrides: Partial<OwmForecastItem> = {}): OwmForecastItem {
  return {
    dt: overrides.dt ?? 1718452800,
    main: overrides.main ?? {
      temp: 15.0,
      temp_min: 12.0,
      temp_max: 18.0,
      humidity: 65,
    },
    weather: overrides.weather ?? [
      { id: 500, main: 'Rain', description: 'light rain', icon: '10d' },
    ],
    dt_txt: overrides.dt_txt ?? '2025-06-15 12:00:00',
  };
}

export function makeOwmForecastResponse(
  overrides: Partial<OwmForecastResponse> = {},
): OwmForecastResponse {
  return {
    list: overrides.list ?? [
      makeOwmForecastItem({ dt_txt: '2025-06-15 06:00:00' }),
      makeOwmForecastItem({ dt_txt: '2025-06-15 12:00:00' }),
      makeOwmForecastItem({ dt_txt: '2025-06-15 18:00:00' }),
      makeOwmForecastItem({ dt_txt: '2025-06-16 06:00:00' }),
      makeOwmForecastItem({ dt_txt: '2025-06-16 12:00:00' }),
      makeOwmForecastItem({ dt_txt: '2025-06-16 18:00:00' }),
      makeOwmForecastItem({ dt_txt: '2025-06-17 06:00:00' }),
      makeOwmForecastItem({ dt_txt: '2025-06-17 12:00:00' }),
      makeOwmForecastItem({ dt_txt: '2025-06-17 18:00:00' }),
    ],
    city: overrides.city ?? { name: 'London' },
  };
}
