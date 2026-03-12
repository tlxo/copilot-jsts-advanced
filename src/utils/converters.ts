const COMPASS_POINTS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const;

export function celsiusToFahrenheit(celsius: number): number {
  return Math.round(((celsius * 9) / 5 + 32) * 100) / 100;
}

export function celsiusToKelvin(celsius: number): number {
  return Math.round((celsius + 273.15) * 100) / 100;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return Math.round((((fahrenheit - 32) * 5) / 9) * 100) / 100;
}

export function mpsToKmh(mps: number): number {
  return Math.round(mps * 3.6 * 100) / 100;
}

export function mpsToMph(mps: number): number {
  return Math.round(mps * 2.23694 * 100) / 100;
}

export function degreesToCompass(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return COMPASS_POINTS[index]!;
}
