import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestSettings } from '../setup.js';
import { OpenWeatherMapClient } from '../../src/services/openweathermap.js';
import { WeatherService } from '../../src/services/weather-service.js';
import { LocationRepository } from '../../src/repositories/location-repo.js';
import { makeOwmCurrentWeatherResponse } from '../factories.js';

function createMockedApp() {
  const settings = createTestSettings();
  const locationRepository = new LocationRepository();
  const mockClient = {
    getCurrentWeather: vi.fn(),
    getForecast: vi.fn(),
  } as unknown as OpenWeatherMapClient;
  const weatherService = new WeatherService(mockClient, settings);

  const { app } = createTestApp({
    settings,
    locationRepository,
    owmClient: mockClient,
    weatherService,
  });

  return {
    app,
    locationRepository,
    mockClient: mockClient as unknown as {
      getCurrentWeather: ReturnType<typeof vi.fn>;
      getForecast: ReturnType<typeof vi.fn>;
    },
  };
}

describe('POST /api/locations', () => {
  it('creates a location and returns 201', async () => {
    const { app } = createMockedApp();
    const res = await request(app)
      .post('/api/locations')
      .send({ name: 'London', lat: 51.51, lon: -0.13 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('London');
    expect(res.body.id).toBeDefined();
    expect(res.body.coordinates.lat).toBe(51.51);
    expect(res.body.createdAt).toBeDefined();
  });

  it('returns 422 for invalid lat', async () => {
    const { app } = createMockedApp();
    const res = await request(app).post('/api/locations').send({ name: 'Bad', lat: 100, lon: 0 });

    expect(res.status).toBe(422);
  });

  it('returns 422 for empty name', async () => {
    const { app } = createMockedApp();
    const res = await request(app).post('/api/locations').send({ name: '', lat: 0, lon: 0 });

    expect(res.status).toBe(422);
  });

  it('creates multiple locations with unique IDs', async () => {
    const { app } = createMockedApp();
    const res1 = await request(app).post('/api/locations').send({ name: 'A', lat: 0, lon: 0 });
    const res2 = await request(app).post('/api/locations').send({ name: 'B', lat: 10, lon: 10 });

    expect(res1.body.id).not.toBe(res2.body.id);
  });
});

describe('GET /api/locations', () => {
  it('returns empty list initially', async () => {
    const { app } = createMockedApp();
    const res = await request(app).get('/api/locations');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns locations after creating', async () => {
    const { app } = createMockedApp();

    await request(app).post('/api/locations').send({ name: 'London', lat: 51.51, lon: -0.13 });

    const res = await request(app).get('/api/locations');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('London');
  });
});

describe('GET /api/locations/:id', () => {
  it('returns 200 for existing location', async () => {
    const { app } = createMockedApp();
    const createRes = await request(app)
      .post('/api/locations')
      .send({ name: 'London', lat: 51.51, lon: -0.13 });

    const res = await request(app).get(`/api/locations/${createRes.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('London');
  });

  it('returns 404 for nonexistent location', async () => {
    const { app } = createMockedApp();
    const res = await request(app).get('/api/locations/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/locations/:id', () => {
  it('updates name and returns 200', async () => {
    const { app } = createMockedApp();
    const createRes = await request(app)
      .post('/api/locations')
      .send({ name: 'Old Name', lat: 51.51, lon: -0.13 });

    const res = await request(app)
      .put(`/api/locations/${createRes.body.id}`)
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
    expect(res.body.coordinates.lat).toBe(51.51);
  });

  it('updates coordinates and returns 200', async () => {
    const { app } = createMockedApp();
    const createRes = await request(app)
      .post('/api/locations')
      .send({ name: 'Place', lat: 0, lon: 0 });

    const res = await request(app)
      .put(`/api/locations/${createRes.body.id}`)
      .send({ lat: 10, lon: 20 });

    expect(res.status).toBe(200);
    expect(res.body.coordinates.lat).toBe(10);
    expect(res.body.coordinates.lon).toBe(20);
  });

  it('returns 404 for nonexistent location', async () => {
    const { app } = createMockedApp();
    const res = await request(app)
      .put('/api/locations/00000000-0000-0000-0000-000000000000')
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/locations/:id', () => {
  it('deletes existing location and returns 204', async () => {
    const { app } = createMockedApp();
    const createRes = await request(app)
      .post('/api/locations')
      .send({ name: 'ToDelete', lat: 0, lon: 0 });

    const res = await request(app).delete(`/api/locations/${createRes.body.id}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 for nonexistent location', async () => {
    const { app } = createMockedApp();
    const res = await request(app).delete('/api/locations/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(404);
  });

  it('location is actually removed after delete', async () => {
    const { app } = createMockedApp();
    const createRes = await request(app)
      .post('/api/locations')
      .send({ name: 'Gone', lat: 0, lon: 0 });

    await request(app).delete(`/api/locations/${createRes.body.id}`);

    const getRes = await request(app).get(`/api/locations/${createRes.body.id}`);
    expect(getRes.status).toBe(404);
  });
});

describe('GET /api/locations/:id/weather', () => {
  it('returns 200 with weather for saved location', async () => {
    const { app, mockClient } = createMockedApp();

    mockClient.getCurrentWeather.mockResolvedValue(makeOwmCurrentWeatherResponse());

    const createRes = await request(app)
      .post('/api/locations')
      .send({ name: 'London', lat: 51.51, lon: -0.13 });

    const res = await request(app).get(`/api/locations/${createRes.body.id}/weather`);

    expect(res.status).toBe(200);
    expect(res.body.locationName).toBe('London');
    expect(res.body.temperature).toBeDefined();
  });

  it('returns 404 for nonexistent location', async () => {
    const { app } = createMockedApp();
    const res = await request(app).get(
      '/api/locations/00000000-0000-0000-0000-000000000000/weather',
    );

    expect(res.status).toBe(404);
  });
});
