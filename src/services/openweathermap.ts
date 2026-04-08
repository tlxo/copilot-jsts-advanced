import type { Settings } from '../config.js';
import type { OwmOneCallResponse } from '../models.js';
import { OwmOneCallResponseSchema } from '../models.js';
import {
  WeatherAPIError,
  WeatherAPINotFoundError,
  WeatherAPIConnectionError,
} from './exceptions.js';

export class OpenWeatherMapClient {
  constructor(private settings: Settings) {}

  async getOneCall(lat: number, lon: number, exclude: string): Promise<OwmOneCallResponse> {
    const url = new URL(`${this.settings.openWeatherMapBaseUrl}/onecall`);
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lon.toString());
    url.searchParams.set('exclude', exclude);
    url.searchParams.set('units', 'metric');
    url.searchParams.set('appid', this.settings.openWeatherMapApiKey);

    const json = await this.fetchApi(url);
    return OwmOneCallResponseSchema.parse(json);
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

    if (response.status === 401) {
      throw new WeatherAPIError(401, 'Invalid API key');
    }
    if (response.status === 404) {
      throw new WeatherAPINotFoundError();
    }
    if (!response.ok) {
      const body = await response.text();
      throw new WeatherAPIError(response.status, body);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new WeatherAPIError(502, 'Malformed JSON response from weather API');
    }
    return json;
  }
}
