import type { Settings } from '../src/config.js';
import type { AppContainer } from '../src/dependencies.js';
import { LocationRepository } from '../src/repositories/location-repo.js';
import { OpenWeatherMapClient } from '../src/services/openweathermap.js';
import { WeatherService } from '../src/services/weather-service.js';
import { createApp } from '../src/app.js';

// Suppress DEP0169 from swagger-jsdoc's transitive dependency
const originalEmitWarning = process.emitWarning;
process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
  if (typeof warning === 'string' && warning.includes('url.parse()')) return;
  return (originalEmitWarning as (...a: unknown[]) => void).call(process, warning, ...args);
}) as typeof process.emitWarning;

export function createTestSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    openWeatherMapApiKey: 'test-api-key',
    openWeatherMapBaseUrl: 'https://api.openweathermap.org/data/2.5',
    appName: 'Weather App Test',
    appPort: 0,
    debug: false,
    alertWindSpeedThreshold: 20.0,
    alertTempHighThreshold: 40.0,
    alertTempLowThreshold: -20.0,
    alertHumidityThreshold: 90.0,
    ...overrides,
  };
}

export function createTestContainer(overrides: Partial<AppContainer> = {}): AppContainer {
  const settings = overrides.settings ?? createTestSettings();
  const locationRepository = overrides.locationRepository ?? new LocationRepository();
  const owmClient = overrides.owmClient ?? new OpenWeatherMapClient(settings);
  const weatherService = overrides.weatherService ?? new WeatherService(owmClient, settings);
  return { settings, locationRepository, weatherService, owmClient };
}

export function createTestApp(containerOverrides: Partial<AppContainer> = {}) {
  const container = createTestContainer(containerOverrides);
  const app = createApp(container);
  return { app, container };
}
