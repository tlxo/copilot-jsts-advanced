import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestSettings } from '../setup.js';
import { OpenWeatherMapClient } from '../../src/services/openweathermap.js';
import { WeatherService } from '../../src/services/weather-service.js';
import { makeOwmCurrentWeatherResponse, makeOwmForecastItem, makeOwmForecastResponse } from '../factories.js';
import {
  WeatherAPINotFoundError,
  WeatherAPIConnectionError,
  WeatherAPIError,
} from '../../src/services/exceptions.js';

function createMockedApp() {
  const settings = createTestSettings();
  const mockClient = {
    getCurrentWeather: vi.fn(),
    getForecast: vi.fn(),
  } as unknown as OpenWeatherMapClient;
  const weatherService = new WeatherService(mockClient, settings);

  const { app } = createTestApp({
    settings,
    owmClient: mockClient,
    weatherService,
  });

  return {
    app,
    mockClient: mockClient as unknown as {
      getCurrentWeather: ReturnType<typeof vi.fn>;
      getForecast: ReturnType<typeof vi.fn>;
    },
  };
}

describe('GET /api/weather/current', () => {
  it('returns 200 with valid coordinates', async () => {
    const { app, mockClient } = createMockedApp();
    mockClient.getCurrentWeather.mockResolvedValue(makeOwmCurrentWeatherResponse());

    const res = await request(app).get('/api/weather/current?lat=51.51&lon=-0.13');

    expect(res.status).toBe(200);
    expect(res.body.temperature).toBe(15.0);
    expect(res.body.locationName).toBe('London');
    expect(res.body.units).toBe('celsius');
  });

  it('returns 200 with fahrenheit units', async () => {
    const { app, mockClient } = createMockedApp();
    mockClient.getCurrentWeather.mockResolvedValue(
      makeOwmCurrentWeatherResponse({ main: { temp: 0, feels_like: 0, pressure: 1013, humidity: 72 } }),
    );

    const res = await request(app).get('/api/weather/current?lat=51.51&lon=-0.13&units=fahrenheit');

    expect(res.status).toBe(200);
    expect(res.body.units).toBe('fahrenheit');
    expect(res.body.temperature).toBeCloseTo(32, 0);
  });

  it('returns 422 for missing params', async () => {
    const { app } = createMockedApp();
    const res = await request(app).get('/api/weather/current');
    expect(res.status).toBe(422);
  });

  it('returns 422 for invalid lat', async () => {
    const { app } = createMockedApp();
    const res = await request(app).get('/api/weather/current?lat=100&lon=0');
    expect(res.status).toBe(422);
  });

  it('returns 404 when OWM returns 404', async () => {
    const { app, mockClient } = createMockedApp();
    mockClient.getCurrentWeather.mockRejectedValue(new WeatherAPINotFoundError());

    const res = await request(app).get('/api/weather/current?lat=51.51&lon=-0.13');
    expect(res.status).toBe(404);
  });

  it('returns 502 on OWM server error', async () => {
    const { app, mockClient } = createMockedApp();
    mockClient.getCurrentWeather.mockRejectedValue(
      new WeatherAPIError(500, 'Internal Server Error'),
    );

    const res = await request(app).get('/api/weather/current?lat=51.51&lon=-0.13');
    expect(res.status).toBe(502);
  });

  it('returns 503 on connection error', async () => {
    const { app, mockClient } = createMockedApp();
    mockClient.getCurrentWeather.mockRejectedValue(
      new WeatherAPIConnectionError('Connection refused'),
    );

    const res = await request(app).get('/api/weather/current?lat=51.51&lon=-0.13');
    expect(res.status).toBe(503);
  });
});

describe('GET /api/weather/forecast', () => {
  it('returns 200 with forecast data', async () => {
    const { app, mockClient } = createMockedApp();
    const items: ReturnType<typeof makeOwmForecastItem>[] = [];
    for (let d = 15; d < 20; d++) {
      items.push(makeOwmForecastItem({ dt_txt: `2025-06-${d} 06:00:00` }));
      items.push(makeOwmForecastItem({ dt_txt: `2025-06-${d} 12:00:00` }));
    }
    mockClient.getForecast.mockResolvedValue(makeOwmForecastResponse({ list: items }));

    const res = await request(app).get('/api/weather/forecast?lat=51.51&lon=-0.13');

    expect(res.status).toBe(200);
    expect(res.body.days).toHaveLength(5);
    expect(res.body.locationName).toBe('London');
  });

  it('respects days parameter', async () => {
    const { app, mockClient } = createMockedApp();
    const items: ReturnType<typeof makeOwmForecastItem>[] = [];
    for (let d = 15; d < 20; d++) {
      items.push(makeOwmForecastItem({ dt_txt: `2025-06-${d} 12:00:00` }));
    }
    mockClient.getForecast.mockResolvedValue(makeOwmForecastResponse({ list: items }));

    const res = await request(app).get('/api/weather/forecast?lat=51.51&lon=-0.13&days=2');

    expect(res.status).toBe(200);
    expect(res.body.days).toHaveLength(2);
  });

  it('returns 422 for days out of range', async () => {
    const { app } = createMockedApp();
    const res = await request(app).get('/api/weather/forecast?lat=51.51&lon=-0.13&days=10');
    expect(res.status).toBe(422);
  });

  it('converts forecast to kelvin', async () => {
    const { app, mockClient } = createMockedApp();
    mockClient.getForecast.mockResolvedValue(
      makeOwmForecastResponse({
        list: [
          makeOwmForecastItem({ main: { temp: 0, temp_min: 0, temp_max: 0, humidity: 50 }, dt_txt: '2025-06-15 12:00:00' }),
        ],
      }),
    );

    const res = await request(app).get(
      '/api/weather/forecast?lat=51.51&lon=-0.13&days=1&units=kelvin',
    );

    expect(res.status).toBe(200);
    expect(res.body.days[0].tempMin).toBeCloseTo(273.15, 1);
  });
});

describe('GET /api/weather/alerts', () => {
  it('returns 200 with no alerts when thresholds not exceeded', async () => {
    const { app, mockClient } = createMockedApp();
    mockClient.getCurrentWeather.mockResolvedValue(
      makeOwmCurrentWeatherResponse({
        main: { temp: 20, feels_like: 18, pressure: 1013, humidity: 50 },
        wind: { speed: 5, deg: 180 },
      }),
    );

    const res = await request(app).get('/api/weather/alerts?lat=51.51&lon=-0.13');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 200 with alerts when thresholds exceeded', async () => {
    const { app, mockClient } = createMockedApp();
    mockClient.getCurrentWeather.mockResolvedValue(
      makeOwmCurrentWeatherResponse({
        main: { temp: 42, feels_like: 44, pressure: 1013, humidity: 95 },
        wind: { speed: 25, deg: 180 },
      }),
    );

    const res = await request(app).get('/api/weather/alerts?lat=33.44&lon=-94.04');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    const types = res.body.map((a: { alertType: string }) => a.alertType);
    expect(types).toContain('high_wind');
    expect(types).toContain('extreme_heat');
    expect(types).toContain('high_humidity');
  });

  it('returns 422 for missing coordinates', async () => {
    const { app } = createMockedApp();
    const res = await request(app).get('/api/weather/alerts?lat=51.51');
    expect(res.status).toBe(422);
  });
});
