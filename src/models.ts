import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────────────────────────

export const TemperatureUnit = z.enum(['celsius', 'fahrenheit', 'kelvin']);
export type TemperatureUnit = z.infer<typeof TemperatureUnit>;

// ── Request Validation Schemas ─────────────────────────────────────────────────

export const CurrentWeatherQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  units: TemperatureUnit.default('celsius'),
});
export type CurrentWeatherQuery = z.infer<typeof CurrentWeatherQuerySchema>;

export const ForecastQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  days: z.coerce.number().int().min(1).max(5).default(5),
  units: TemperatureUnit.default('celsius'),
});
export type ForecastQuery = z.infer<typeof ForecastQuerySchema>;

export const AlertsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});
export type AlertsQuery = z.infer<typeof AlertsQuerySchema>;

export const LocationCreateSchema = z.object({
  name: z.string().min(1).max(200),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
export type LocationCreate = z.infer<typeof LocationCreateSchema>;

export const LocationUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
});
export type LocationUpdate = z.infer<typeof LocationUpdateSchema>;

// ── Domain Types ───────────────────────────────────────────────────────────────

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Location {
  id: string;
  name: string;
  coordinates: Coordinates;
  createdAt: string;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  description: string;
  icon: string;
  timestamp: number;
  locationName: string;
  units: TemperatureUnit;
}

export interface ForecastDay {
  date: string;
  tempMin: number;
  tempMax: number;
  humidity: number;
  description: string;
  icon: string;
}

export interface Forecast {
  locationName: string;
  units: TemperatureUnit;
  days: ForecastDay[];
}

export const AlertSeverity = z.enum(['low', 'medium', 'high', 'extreme']);
export type AlertSeverity = z.infer<typeof AlertSeverity>;

export interface WeatherAlert {
  alertType: string;
  message: string;
  severity: AlertSeverity;
  value: number;
  threshold: number;
}

// ── OWM 3.0 API Response Schemas ───────────────────────────────────────────────

export const OwmWeatherConditionSchema = z.object({
  id: z.number(),
  main: z.string(),
  description: z.string(),
  icon: z.string(),
});

export const OwmOneCallCurrentSchema = z.object({
  dt: z.number(),
  temp: z.number(),
  feels_like: z.number(),
  pressure: z.number(),
  humidity: z.number(),
  wind_speed: z.number(),
  wind_deg: z.number(),
  weather: z.array(OwmWeatherConditionSchema).min(1),
});
export type OwmOneCallCurrent = z.infer<typeof OwmOneCallCurrentSchema>;

export const OwmOneCallDailyItemSchema = z.object({
  dt: z.number(),
  temp: z.object({
    min: z.number(),
    max: z.number(),
  }),
  humidity: z.number(),
  weather: z.array(OwmWeatherConditionSchema).min(1),
});
export type OwmOneCallDailyItem = z.infer<typeof OwmOneCallDailyItemSchema>;

export const OwmOneCallResponseSchema = z.object({
  timezone: z.string(),
  current: OwmOneCallCurrentSchema.optional(),
  daily: z.array(OwmOneCallDailyItemSchema).optional(),
  alerts: z
    .array(
      z.object({
        sender_name: z.string(),
        event: z.string(),
        start: z.number(),
        end: z.number(),
        description: z.string(),
        tags: z.array(z.string()),
      }),
    )
    .optional(),
});
export type OwmOneCallResponse = z.infer<typeof OwmOneCallResponseSchema>;
