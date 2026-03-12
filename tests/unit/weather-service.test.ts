import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeatherService } from '../../src/services/weather-service.js';
import { OpenWeatherMapClient } from '../../src/services/openweathermap.js';
import { createTestSettings } from '../setup.js';
import { makeOwmCurrentWeatherResponse, makeOwmForecastItem, makeOwmForecastResponse } from '../factories.js';

describe('WeatherService', () => {
  let service: WeatherService;
  let mockClient: {
    getCurrentWeather: ReturnType<typeof vi.fn>;
    getForecast: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockClient = {
      getCurrentWeather: vi.fn(),
      getForecast: vi.fn(),
    };
    const settings = createTestSettings();
    service = new WeatherService(mockClient as unknown as OpenWeatherMapClient, settings);
  });

  describe('getCurrentWeather', () => {
    it('returns current weather in celsius (default)', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(
        makeOwmCurrentWeatherResponse({ main: { temp: 15.0, feels_like: 13.5, pressure: 1013, humidity: 72 } }),
      );

      const result = await service.getCurrentWeather(51.51, -0.13);

      expect(result.temperature).toBe(15.0);
      expect(result.feelsLike).toBe(13.5);
      expect(result.units).toBe('celsius');
      expect(result.locationName).toBe('London');
    });

    it('converts to fahrenheit', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(
        makeOwmCurrentWeatherResponse({ main: { temp: 0, feels_like: -5, pressure: 1013, humidity: 72 } }),
      );

      const result = await service.getCurrentWeather(51.51, -0.13, 'fahrenheit');

      expect(result.temperature).toBeCloseTo(32, 1);
      expect(result.feelsLike).toBeCloseTo(23, 0);
      expect(result.units).toBe('fahrenheit');
    });

    it('converts to kelvin', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(
        makeOwmCurrentWeatherResponse({ main: { temp: 0, feels_like: 0, pressure: 1013, humidity: 72 } }),
      );

      const result = await service.getCurrentWeather(51.51, -0.13, 'kelvin');

      expect(result.temperature).toBeCloseTo(273.15, 1);
      expect(result.units).toBe('kelvin');
    });

    it('preserves non-temperature fields unchanged', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(
        makeOwmCurrentWeatherResponse({
          main: { temp: 15, feels_like: 13, pressure: 1020, humidity: 85 },
          wind: { speed: 7.0, deg: 180 },
        }),
      );

      const result = await service.getCurrentWeather(51.51, -0.13, 'fahrenheit');

      expect(result.humidity).toBe(85);
      expect(result.pressure).toBe(1020);
      expect(result.windSpeed).toBe(7.0);
      expect(result.windDirection).toBe(180);
    });

    it('uses provided locationName over API name', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(makeOwmCurrentWeatherResponse());

      const result = await service.getCurrentWeather(51.51, -0.13, 'celsius', 'My Custom Name');

      expect(result.locationName).toBe('My Custom Name');
    });

    it('uses city name from API response', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(
        makeOwmCurrentWeatherResponse({ name: 'New York' }),
      );

      const result = await service.getCurrentWeather(40.7, -74.0);

      expect(result.locationName).toBe('New York');
    });
  });

  describe('getForecast', () => {
    it('returns forecast in celsius', async () => {
      mockClient.getForecast.mockResolvedValue(
        makeOwmForecastResponse({
          list: [
            makeOwmForecastItem({ main: { temp: 16, temp_min: 10, temp_max: 20, humidity: 60 }, dt_txt: '2025-06-15 06:00:00' }),
            makeOwmForecastItem({ main: { temp: 18, temp_min: 12, temp_max: 22, humidity: 55 }, dt_txt: '2025-06-15 12:00:00' }),
            makeOwmForecastItem({ main: { temp: 17, temp_min: 11, temp_max: 21, humidity: 65 }, dt_txt: '2025-06-16 06:00:00' }),
            makeOwmForecastItem({ main: { temp: 19, temp_min: 13, temp_max: 23, humidity: 50 }, dt_txt: '2025-06-16 12:00:00' }),
          ],
        }),
      );

      const result = await service.getForecast(51.51, -0.13, 2);

      expect(result.days).toHaveLength(2);
      expect(result.days[0]!.tempMin).toBe(10);
      expect(result.days[0]!.tempMax).toBe(22);
      expect(result.days[0]!.humidity).toBe(58);
      expect(result.units).toBe('celsius');
    });

    it('converts forecast temperatures to fahrenheit', async () => {
      mockClient.getForecast.mockResolvedValue(
        makeOwmForecastResponse({
          list: [
            makeOwmForecastItem({ main: { temp: 50, temp_min: 0, temp_max: 100, humidity: 50 }, dt_txt: '2025-06-15 12:00:00' }),
          ],
        }),
      );

      const result = await service.getForecast(51.51, -0.13, 1, 'fahrenheit');

      expect(result.days[0]!.tempMin).toBeCloseTo(32, 0);
      expect(result.days[0]!.tempMax).toBeCloseTo(212, 0);
    });

    it('limits days to requested count', async () => {
      const items: ReturnType<typeof makeOwmForecastItem>[] = [];
      for (let d = 15; d < 20; d++) {
        items.push(makeOwmForecastItem({ dt_txt: `2025-06-${d} 12:00:00` }));
      }
      mockClient.getForecast.mockResolvedValue(makeOwmForecastResponse({ list: items }));

      const result = await service.getForecast(51.51, -0.13, 3);

      expect(result.days).toHaveLength(3);
    });

    it('converts forecast temperatures to kelvin', async () => {
      mockClient.getForecast.mockResolvedValue(
        makeOwmForecastResponse({
          list: [
            makeOwmForecastItem({ main: { temp: 0, temp_min: 0, temp_max: 0, humidity: 50 }, dt_txt: '2025-06-15 12:00:00' }),
          ],
        }),
      );

      const result = await service.getForecast(51.51, -0.13, 1, 'kelvin');

      expect(result.days[0]!.tempMin).toBeCloseTo(273.15, 1);
      expect(result.days[0]!.tempMax).toBeCloseTo(273.15, 1);
    });
  });

  describe('getAlerts', () => {
    it('returns empty array when no thresholds exceeded', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(
        makeOwmCurrentWeatherResponse({
          main: { temp: 20, feels_like: 18, pressure: 1013, humidity: 50 },
          wind: { speed: 5, deg: 180 },
        }),
      );

      const result = await service.getAlerts(51.51, -0.13);

      expect(result).toEqual([]);
    });

    it('returns high wind alert when wind exceeds threshold', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(
        makeOwmCurrentWeatherResponse({
          main: { temp: 20, feels_like: 18, pressure: 1013, humidity: 50 },
          wind: { speed: 25, deg: 180 },
        }),
      );

      const result = await service.getAlerts(51.51, -0.13);

      expect(result).toHaveLength(1);
      expect(result[0]!.alertType).toBe('high_wind');
      expect(result[0]!.severity).toBe('medium');
      expect(result[0]!.value).toBe(25);
      expect(result[0]!.threshold).toBe(20);
    });

    it('returns high severity for very high wind', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(
        makeOwmCurrentWeatherResponse({
          main: { temp: 20, feels_like: 18, pressure: 1013, humidity: 50 },
          wind: { speed: 35, deg: 180 },
        }),
      );

      const result = await service.getAlerts(51.51, -0.13);

      expect(result).toHaveLength(1);
      expect(result[0]!.alertType).toBe('high_wind');
      expect(result[0]!.severity).toBe('high');
    });

    it('returns extreme heat alert', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(
        makeOwmCurrentWeatherResponse({
          main: { temp: 42, feels_like: 44, pressure: 1013, humidity: 50 },
          wind: { speed: 5, deg: 180 },
        }),
      );

      const result = await service.getAlerts(51.51, -0.13);

      expect(result).toHaveLength(1);
      expect(result[0]!.alertType).toBe('extreme_heat');
      expect(result[0]!.severity).toBe('high');
    });

    it('returns extreme severity for very high temperature', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(
        makeOwmCurrentWeatherResponse({
          main: { temp: 46, feels_like: 48, pressure: 1013, humidity: 50 },
          wind: { speed: 5, deg: 180 },
        }),
      );

      const result = await service.getAlerts(51.51, -0.13);

      expect(result).toHaveLength(1);
      expect(result[0]!.alertType).toBe('extreme_heat');
      expect(result[0]!.severity).toBe('extreme');
    });

    it('returns extreme cold alert', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(
        makeOwmCurrentWeatherResponse({
          main: { temp: -22, feels_like: -28, pressure: 1013, humidity: 50 },
          wind: { speed: 5, deg: 180 },
        }),
      );

      const result = await service.getAlerts(51.51, -0.13);

      expect(result).toHaveLength(1);
      expect(result[0]!.alertType).toBe('extreme_cold');
      expect(result[0]!.severity).toBe('high');
    });

    it('returns extreme severity for very low temperature', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(
        makeOwmCurrentWeatherResponse({
          main: { temp: -35, feels_like: -40, pressure: 1013, humidity: 50 },
          wind: { speed: 5, deg: 180 },
        }),
      );

      const result = await service.getAlerts(51.51, -0.13);

      expect(result).toHaveLength(1);
      expect(result[0]!.alertType).toBe('extreme_cold');
      expect(result[0]!.severity).toBe('extreme');
    });

    it('returns high humidity alert', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(
        makeOwmCurrentWeatherResponse({
          main: { temp: 20, feels_like: 18, pressure: 1013, humidity: 95 },
          wind: { speed: 5, deg: 180 },
        }),
      );

      const result = await service.getAlerts(51.51, -0.13);

      expect(result).toHaveLength(1);
      expect(result[0]!.alertType).toBe('high_humidity');
      expect(result[0]!.severity).toBe('low');
    });

    it('returns multiple alerts when multiple thresholds exceeded', async () => {
      mockClient.getCurrentWeather.mockResolvedValue(
        makeOwmCurrentWeatherResponse({
          main: { temp: 42, feels_like: 44, pressure: 1013, humidity: 95 },
          wind: { speed: 25, deg: 180 },
        }),
      );

      const result = await service.getAlerts(51.51, -0.13);

      expect(result).toHaveLength(3);
      const types = result.map((a) => a.alertType);
      expect(types).toContain('high_wind');
      expect(types).toContain('extreme_heat');
      expect(types).toContain('high_humidity');
    });
  });
});
