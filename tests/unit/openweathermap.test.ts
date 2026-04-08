import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenWeatherMapClient } from '../../src/services/openweathermap.js';
import { createTestSettings } from '../setup.js';
import { makeOwmOneCallCurrentOnly } from '../factories.js';
import {
  WeatherAPIError,
  WeatherAPINotFoundError,
  WeatherAPIConnectionError,
} from '../../src/services/exceptions.js';

describe('OpenWeatherMapClient', () => {
  let client: OpenWeatherMapClient;

  beforeEach(() => {
    client = new OpenWeatherMapClient(createTestSettings());
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getOneCall', () => {
    it('returns parsed response on success', async () => {
      const owmResponse = makeOwmOneCallCurrentOnly();
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(owmResponse), { status: 200 }),
      );

      const result = await client.getOneCall(51.51, -0.13, 'minutely,hourly,daily,alerts');

      expect(result.timezone).toBe('Europe/London');
      expect(result.current).toBeDefined();
    });

    it('builds the correct URL with all parameters', async () => {
      const owmResponse = makeOwmOneCallCurrentOnly();
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(owmResponse), { status: 200 }),
      );

      await client.getOneCall(51.51, -0.13, 'minutely,hourly');

      const calledUrl = new URL(vi.mocked(fetch).mock.calls[0]![0] as string);
      expect(calledUrl.pathname).toBe('/data/3.0/onecall');
      expect(calledUrl.searchParams.get('lat')).toBe('51.51');
      expect(calledUrl.searchParams.get('lon')).toBe('-0.13');
      expect(calledUrl.searchParams.get('exclude')).toBe('minutely,hourly');
      expect(calledUrl.searchParams.get('units')).toBe('metric');
      expect(calledUrl.searchParams.get('appid')).toBe('test-api-key');
    });

    it('throws WeatherAPIConnectionError on timeout', async () => {
      const timeoutError = new DOMException('The operation was aborted.', 'TimeoutError');
      vi.mocked(fetch).mockRejectedValue(timeoutError);

      await expect(client.getOneCall(51.51, -0.13, 'current')).rejects.toThrow(
        WeatherAPIConnectionError,
      );
      await expect(client.getOneCall(51.51, -0.13, 'current')).rejects.toThrow(
        'Request to weather API timed out',
      );
    });

    it('throws WeatherAPIConnectionError on network failure', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await expect(client.getOneCall(51.51, -0.13, 'current')).rejects.toThrow(
        WeatherAPIConnectionError,
      );
      await expect(client.getOneCall(51.51, -0.13, 'current')).rejects.toThrow('Network error');
    });

    it('throws WeatherAPIError with status 401 on invalid API key', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response('{"cod": 401, "message": "Invalid API key."}', { status: 401 }),
      );

      await expect(client.getOneCall(51.51, -0.13, 'current')).rejects.toThrow(WeatherAPIError);
      await expect(client.getOneCall(51.51, -0.13, 'current')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid API key',
      });
    });

    it('throws WeatherAPINotFoundError on 404', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response('{"cod": "404", "message": "city not found"}', { status: 404 }),
      );

      await expect(client.getOneCall(51.51, -0.13, 'current')).rejects.toThrow(
        WeatherAPINotFoundError,
      );
    });

    it('throws WeatherAPIError with status code on 5xx', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }))
        .mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }));

      await expect(client.getOneCall(51.51, -0.13, 'current')).rejects.toThrow(WeatherAPIError);
      await expect(client.getOneCall(51.51, -0.13, 'current')).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    it('throws WeatherAPIError on malformed JSON response', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response('not valid json {{{', { status: 200 }),
      );

      await expect(client.getOneCall(51.51, -0.13, 'current')).rejects.toThrow(WeatherAPIError);
      await expect(client.getOneCall(51.51, -0.13, 'current')).rejects.toMatchObject({
        statusCode: 502,
        message: 'Malformed JSON response from weather API',
      });
    });
  });
});
