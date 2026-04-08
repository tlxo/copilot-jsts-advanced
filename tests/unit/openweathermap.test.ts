import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenWeatherMapClient } from '../../src/services/openweathermap.js';
import {
  WeatherAPIError,
  WeatherAPINotFoundError,
  WeatherAPIConnectionError,
} from '../../src/services/exceptions.js';
import { createTestSettings } from '../setup.js';
import { makeOwmOneCallResponse, makeOwmOneCallCurrentOnly } from '../factories.js';

const BASE_URL = 'https://api.openweathermap.org/data/3.0';

function createClient() {
  const settings = createTestSettings();
  return new OpenWeatherMapClient(settings);
}

function mockFetchResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe('OpenWeatherMapClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getOneCall', () => {
    it('calls the correct One Call 3.0 endpoint with all required params', async () => {
      const client = createClient();
      const responseData = makeOwmOneCallCurrentOnly();
      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(responseData));

      await client.getOneCall(51.51, -0.13, 'minutely,hourly,daily,alerts');

      expect(fetch).toHaveBeenCalledOnce();
      const calledUrl = new URL(vi.mocked(fetch).mock.calls[0]![0] as string);
      expect(calledUrl.origin + calledUrl.pathname).toBe(`${BASE_URL}/onecall`);
      expect(calledUrl.searchParams.get('lat')).toBe('51.51');
      expect(calledUrl.searchParams.get('lon')).toBe('-0.13');
      expect(calledUrl.searchParams.get('units')).toBe('metric');
      expect(calledUrl.searchParams.get('exclude')).toBe('minutely,hourly,daily,alerts');
      expect(calledUrl.searchParams.get('appid')).toBe('test-api-key');
    });

    it('returns parsed One Call response on success', async () => {
      const client = createClient();
      const responseData = makeOwmOneCallCurrentOnly({ temp: 20 });
      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(responseData));

      const result = await client.getOneCall(51.51, -0.13, 'minutely,hourly,daily,alerts');

      expect(result.timezone).toBe('Europe/London');
      expect(result.current!.temp).toBe(20);
    });

    it('returns response with daily data when requested', async () => {
      const client = createClient();
      const responseData = makeOwmOneCallResponse({
        daily: [
          { dt: 1718755200, temp: { min: 10, max: 20 }, humidity: 65, weather: [{ id: 500, main: 'Rain', description: 'light rain', icon: '10d' }] },
        ],
      });
      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(responseData));

      const result = await client.getOneCall(51.51, -0.13, 'current,minutely,hourly,alerts');

      expect(result.daily).toHaveLength(1);
      expect(result.daily![0]!.temp.min).toBe(10);
    });

    it('throws WeatherAPIConnectionError on request timeout', async () => {
      const client = createClient();
      const timeoutError = new DOMException('The operation was aborted', 'TimeoutError');
      vi.mocked(fetch).mockRejectedValue(timeoutError);

      await expect(client.getOneCall(51.51, -0.13, 'minutely,hourly,daily,alerts')).rejects.toThrow(
        WeatherAPIConnectionError,
      );
      await expect(client.getOneCall(51.51, -0.13, 'minutely,hourly,daily,alerts')).rejects.toThrow(
        'Request to weather API timed out',
      );
    });

    it('throws WeatherAPIConnectionError on network error', async () => {
      const client = createClient();
      vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(client.getOneCall(51.51, -0.13, 'minutely,hourly,daily,alerts')).rejects.toThrow(
        WeatherAPIConnectionError,
      );
      await expect(client.getOneCall(51.51, -0.13, 'minutely,hourly,daily,alerts')).rejects.toThrow(
        'ECONNREFUSED',
      );
    });

    it('throws WeatherAPIError with status 401 for invalid API key', async () => {
      const client = createClient();
      vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ message: 'Invalid API key' }, 401));

      const error = await client
        .getOneCall(51.51, -0.13, 'minutely,hourly,daily,alerts')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(WeatherAPIError);
      expect((error as WeatherAPIError).statusCode).toBe(401);
      expect((error as WeatherAPIError).message).toBe('Invalid API key');
    });

    it('throws WeatherAPINotFoundError on 404 response', async () => {
      const client = createClient();
      vi.mocked(fetch).mockResolvedValue(mockFetchResponse({ message: 'Not Found' }, 404));

      await expect(client.getOneCall(51.51, -0.13, 'minutely,hourly,daily,alerts')).rejects.toThrow(
        WeatherAPINotFoundError,
      );
    });

    it('throws WeatherAPIError on 5xx server error', async () => {
      const client = createClient();
      vi.mocked(fetch).mockResolvedValue(
        mockFetchResponse('Internal Server Error', 500),
      );

      const error = await client
        .getOneCall(51.51, -0.13, 'minutely,hourly,daily,alerts')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(WeatherAPIError);
      expect((error as WeatherAPIError).statusCode).toBe(500);
    });

    it('propagates error on malformed JSON response', async () => {
      const client = createClient();
      const malformedResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
        text: vi.fn().mockResolvedValue('not json'),
      } as unknown as Response;
      vi.mocked(fetch).mockResolvedValue(malformedResponse);

      await expect(client.getOneCall(51.51, -0.13, 'minutely,hourly,daily,alerts')).rejects.toThrow(
        SyntaxError,
      );
    });

    it('throws WeatherAPIConnectionError with generic message for unknown errors', async () => {
      const client = createClient();
      vi.mocked(fetch).mockRejectedValue('unknown error');

      await expect(client.getOneCall(51.51, -0.13, 'minutely,hourly,daily,alerts')).rejects.toThrow(
        WeatherAPIConnectionError,
      );
      await expect(client.getOneCall(51.51, -0.13, 'minutely,hourly,daily,alerts')).rejects.toThrow(
        'Failed to connect to weather API',
      );
    });
  });
});
