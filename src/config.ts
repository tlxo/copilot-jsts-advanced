import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed
      .slice(idx + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    process.env[key] ??= val;
  }
}

export interface Settings {
  openWeatherMapApiKey: string;
  openWeatherMapBaseUrl: string;
  appName: string;
  appPort: number;
  debug: boolean;
  alertWindSpeedThreshold: number;
  alertTempHighThreshold: number;
  alertTempLowThreshold: number;
  alertHumidityThreshold: number;
}

export function loadSettings(): Settings {
  loadEnvFile();

  return {
    openWeatherMapApiKey: process.env['OPENWEATHERMAP_API_KEY'] ?? '',
    openWeatherMapBaseUrl:
      process.env['OPENWEATHERMAP_BASE_URL'] ?? 'https://api.openweathermap.org/data/2.5',
    appName: process.env['APP_NAME'] ?? 'Weather App',
    appPort: parseInt(process.env['APP_PORT'] ?? '3000', 10),
    debug: process.env['DEBUG'] === 'true',
    alertWindSpeedThreshold: parseFloat(process.env['ALERT_WIND_SPEED_THRESHOLD'] ?? '20.0'),
    alertTempHighThreshold: parseFloat(process.env['ALERT_TEMP_HIGH_THRESHOLD'] ?? '40.0'),
    alertTempLowThreshold: parseFloat(process.env['ALERT_TEMP_LOW_THRESHOLD'] ?? '-20.0'),
    alertHumidityThreshold: parseFloat(process.env['ALERT_HUMIDITY_THRESHOLD'] ?? '90.0'),
  };
}
