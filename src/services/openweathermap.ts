import type { Settings } from '../config.js';
import type { OwmCurrentWeatherResponse, OwmForecastResponse } from '../models.js';
import { OwmCurrentWeatherResponseSchema, OwmForecastResponseSchema } from '../models.js';
import {
  WeatherAPIError,
  WeatherAPINotFoundError,
  WeatherAPIConnectionError,
} from './exceptions.js';

export class OpenWeatherMapClient {
  constructor(private settings: Settings) {}

  async getCurrentWeather(lat: number, lon: number): Promise<OwmCurrentWeatherResponse> {
    const url = new URL(`${this.settings.openWeatherMapBaseUrl}/weather`);
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lon.toString());
    url.searchParams.set('units', 'metric');
    url.searchParams.set('appid', this.settings.openWeatherMapApiKey);

    const json = await this.fetchApi(url);
    return OwmCurrentWeatherResponseSchema.parse(json);
  }

  async getForecast(lat: number, lon: number): Promise<OwmForecastResponse> {
    const url = new URL(`${this.settings.openWeatherMapBaseUrl}/forecast`);
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lon.toString());
    url.searchParams.set('units', 'metric');
    url.searchParams.set('appid', this.settings.openWeatherMapApiKey);

    const json = await this.fetchApi(url);
    return OwmForecastResponseSchema.parse(json);
  }

  private async fetchApi(url: URL): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new WeatherAPIConnectionError('Request to weather API timed out');
      }
      throw new WeatherAPIConnectionError(
        error instanceof Error ? error.message : 'Failed to connect to weather API',
      );
    }

    if (response.status === 404) {
      throw new WeatherAPINotFoundError();
    }
    if (!response.ok) {
      const body = await response.text();
      throw new WeatherAPIError(response.status, body);
    }

    return response.json();
  }
}
