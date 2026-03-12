import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { AppContainer } from '../dependencies.js';
import { CurrentWeatherQuerySchema, ForecastQuerySchema, AlertsQuerySchema } from '../models.js';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function createWeatherRouter(container: AppContainer): Router {
  const router = Router();
  const { weatherService } = container;

  /**
   * @openapi
   * /api/weather/current:
   *   get:
   *     tags: [Weather]
   *     summary: Get current weather for coordinates
   *     parameters:
   *       - name: lat
   *         in: query
   *         required: true
   *         schema: { type: number, minimum: -90, maximum: 90 }
   *       - name: lon
   *         in: query
   *         required: true
   *         schema: { type: number, minimum: -180, maximum: 180 }
   *       - name: units
   *         in: query
   *         schema: { type: string, enum: [celsius, fahrenheit, kelvin], default: celsius }
   *     responses:
   *       200: { description: Current weather data }
   *       422: { description: Validation error }
   */
  router.get(
    '/current',
    asyncHandler(async (req: Request, res: Response) => {
      const query = CurrentWeatherQuerySchema.parse(req.query);
      const weather = await weatherService.getCurrentWeather(query.lat, query.lon, query.units);
      res.json(weather);
    }),
  );

  /**
   * @openapi
   * /api/weather/forecast:
   *   get:
   *     tags: [Weather]
   *     summary: Get multi-day weather forecast
   *     parameters:
   *       - name: lat
   *         in: query
   *         required: true
   *         schema: { type: number, minimum: -90, maximum: 90 }
   *       - name: lon
   *         in: query
   *         required: true
   *         schema: { type: number, minimum: -180, maximum: 180 }
   *       - name: days
   *         in: query
   *         schema: { type: integer, minimum: 1, maximum: 5, default: 5 }
   *       - name: units
   *         in: query
   *         schema: { type: string, enum: [celsius, fahrenheit, kelvin], default: celsius }
   *     responses:
   *       200: { description: Forecast data }
   *       422: { description: Validation error }
   */
  router.get(
    '/forecast',
    asyncHandler(async (req: Request, res: Response) => {
      const query = ForecastQuerySchema.parse(req.query);
      const forecast = await weatherService.getForecast(
        query.lat,
        query.lon,
        query.days,
        query.units,
      );
      res.json(forecast);
    }),
  );

  /**
   * @openapi
   * /api/weather/alerts:
   *   get:
   *     tags: [Weather]
   *     summary: Get weather alerts for coordinates
   *     parameters:
   *       - name: lat
   *         in: query
   *         required: true
   *         schema: { type: number, minimum: -90, maximum: 90 }
   *       - name: lon
   *         in: query
   *         required: true
   *         schema: { type: number, minimum: -180, maximum: 180 }
   *     responses:
   *       200: { description: Weather alerts }
   *       422: { description: Validation error }
   */
  router.get(
    '/alerts',
    asyncHandler(async (req: Request, res: Response) => {
      const query = AlertsQuerySchema.parse(req.query);
      const alerts = await weatherService.getAlerts(query.lat, query.lon);
      res.json(alerts);
    }),
  );

  return router;
}
