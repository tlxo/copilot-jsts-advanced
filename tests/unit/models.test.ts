import { describe, it, expect } from 'vitest';
import {
  CurrentWeatherQuerySchema,
  ForecastQuerySchema,
  AlertsQuerySchema,
  LocationCreateSchema,
  LocationUpdateSchema,
  TemperatureUnit,
} from '../../src/models.js';

describe('TemperatureUnit', () => {
  it.each(['celsius', 'fahrenheit', 'kelvin'])('accepts "%s"', (unit) => {
    expect(TemperatureUnit.parse(unit)).toBe(unit);
  });

  it('rejects invalid unit', () => {
    expect(() => TemperatureUnit.parse('rankine')).toThrow();
  });
});

describe('CurrentWeatherQuerySchema', () => {
  it('parses valid query with defaults', () => {
    const result = CurrentWeatherQuerySchema.parse({ lat: '51.51', lon: '-0.13' });
    expect(result).toEqual({ lat: 51.51, lon: -0.13, units: 'celsius' });
  });

  it('parses with explicit units', () => {
    const result = CurrentWeatherQuerySchema.parse({
      lat: '40.7',
      lon: '-74.0',
      units: 'fahrenheit',
    });
    expect(result.units).toBe('fahrenheit');
  });

  it('coerces string lat/lon to numbers', () => {
    const result = CurrentWeatherQuerySchema.parse({ lat: '51.51', lon: '-0.13' });
    expect(typeof result.lat).toBe('number');
    expect(typeof result.lon).toBe('number');
  });

  it('rejects missing lat', () => {
    expect(() => CurrentWeatherQuerySchema.parse({ lon: '-0.13' })).toThrow();
  });

  it('rejects lat out of range', () => {
    expect(() => CurrentWeatherQuerySchema.parse({ lat: '91', lon: '0' })).toThrow();
    expect(() => CurrentWeatherQuerySchema.parse({ lat: '-91', lon: '0' })).toThrow();
  });

  it('rejects lon out of range', () => {
    expect(() => CurrentWeatherQuerySchema.parse({ lat: '0', lon: '181' })).toThrow();
    expect(() => CurrentWeatherQuerySchema.parse({ lat: '0', lon: '-181' })).toThrow();
  });

  it('accepts boundary values', () => {
    const result = CurrentWeatherQuerySchema.parse({ lat: '90', lon: '-180' });
    expect(result.lat).toBe(90);
    expect(result.lon).toBe(-180);
  });
});

describe('ForecastQuerySchema', () => {
  it('parses valid query with defaults', () => {
    const result = ForecastQuerySchema.parse({ lat: '51.51', lon: '-0.13' });
    expect(result.days).toBe(5);
    expect(result.units).toBe('celsius');
  });

  it('accepts custom days', () => {
    const result = ForecastQuerySchema.parse({ lat: '0', lon: '0', days: '3' });
    expect(result.days).toBe(3);
  });

  it('rejects days out of range', () => {
    expect(() => ForecastQuerySchema.parse({ lat: '0', lon: '0', days: '0' })).toThrow();
    expect(() => ForecastQuerySchema.parse({ lat: '0', lon: '0', days: '6' })).toThrow();
  });

  it('rejects non-integer days', () => {
    expect(() => ForecastQuerySchema.parse({ lat: '0', lon: '0', days: '2.5' })).toThrow();
  });
});

describe('AlertsQuerySchema', () => {
  it('parses valid query', () => {
    const result = AlertsQuerySchema.parse({ lat: '33.44', lon: '-94.04' });
    expect(result).toEqual({ lat: 33.44, lon: -94.04 });
  });

  it('rejects missing fields', () => {
    expect(() => AlertsQuerySchema.parse({ lat: '0' })).toThrow();
    expect(() => AlertsQuerySchema.parse({ lon: '0' })).toThrow();
  });
});

describe('LocationCreateSchema', () => {
  it('parses valid location', () => {
    const result = LocationCreateSchema.parse({
      name: 'London',
      lat: 51.51,
      lon: -0.13,
    });
    expect(result.name).toBe('London');
    expect(result.lat).toBe(51.51);
  });

  it('rejects empty name', () => {
    expect(() => LocationCreateSchema.parse({ name: '', lat: 0, lon: 0 })).toThrow();
  });

  it('rejects name over 200 chars', () => {
    expect(() => LocationCreateSchema.parse({ name: 'a'.repeat(201), lat: 0, lon: 0 })).toThrow();
  });

  it('accepts name at 200 chars', () => {
    const result = LocationCreateSchema.parse({
      name: 'a'.repeat(200),
      lat: 0,
      lon: 0,
    });
    expect(result.name).toHaveLength(200);
  });

  it('rejects lat out of range', () => {
    expect(() => LocationCreateSchema.parse({ name: 'X', lat: 91, lon: 0 })).toThrow();
  });

  it('rejects lon out of range', () => {
    expect(() => LocationCreateSchema.parse({ name: 'X', lat: 0, lon: 181 })).toThrow();
  });
});

describe('LocationUpdateSchema', () => {
  it('accepts all fields', () => {
    const result = LocationUpdateSchema.parse({
      name: 'New Name',
      lat: 10,
      lon: 20,
    });
    expect(result.name).toBe('New Name');
  });

  it('accepts partial update (name only)', () => {
    const result = LocationUpdateSchema.parse({ name: 'Updated' });
    expect(result.name).toBe('Updated');
    expect(result.lat).toBeUndefined();
  });

  it('accepts empty object', () => {
    const result = LocationUpdateSchema.parse({});
    expect(result.name).toBeUndefined();
    expect(result.lat).toBeUndefined();
    expect(result.lon).toBeUndefined();
  });

  it('rejects invalid lat in partial update', () => {
    expect(() => LocationUpdateSchema.parse({ lat: 100 })).toThrow();
  });
});
