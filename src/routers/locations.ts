import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { AppContainer } from '../dependencies.js';
import {
  LocationCreateSchema,
  LocationUpdateSchema,
  CurrentWeatherQuerySchema,
} from '../models.js';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function createLocationsRouter(container: AppContainer): Router {
  const router = Router();
  const { locationRepository, weatherService } = container;

  /**
   * @openapi
   * /api/locations:
   *   get:
   *     tags: [Locations]
   *     summary: List all saved locations
   *     responses:
   *       200: { description: List of locations }
   */
  router.get('/', (req: Request, res: Response) => {
    const locations = locationRepository.listAll();
    res.json(locations);
  });

  /**
   * @openapi
   * /api/locations:
   *   post:
   *     tags: [Locations]
   *     summary: Save a new location
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, lat, lon]
   *             properties:
   *               name: { type: string, minLength: 1, maxLength: 200 }
   *               lat: { type: number, minimum: -90, maximum: 90 }
   *               lon: { type: number, minimum: -180, maximum: 180 }
   *     responses:
   *       201: { description: Created location }
   *       422: { description: Validation error }
   */
  router.post('/', (req: Request, res: Response) => {
    const data = LocationCreateSchema.parse(req.body);
    const location = locationRepository.add(data);
    res.status(201).json(location);
  });

  /**
   * @openapi
   * /api/locations/{id}:
   *   get:
   *     tags: [Locations]
   *     summary: Get a saved location by ID
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200: { description: Location details }
   *       404: { description: Location not found }
   */
  router.get('/:id', (req: Request, res: Response) => {
    const location = locationRepository.get(req.params['id']!);
    res.json(location);
  });

  /**
   * @openapi
   * /api/locations/{id}:
   *   put:
   *     tags: [Locations]
   *     summary: Update a saved location
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name: { type: string, minLength: 1, maxLength: 200 }
   *               lat: { type: number, minimum: -90, maximum: 90 }
   *               lon: { type: number, minimum: -180, maximum: 180 }
   *     responses:
   *       200: { description: Updated location }
   *       404: { description: Location not found }
   *       422: { description: Validation error }
   */
  router.put('/:id', (req: Request, res: Response) => {
    const data = LocationUpdateSchema.parse(req.body);
    const location = locationRepository.update(req.params['id']!, data);
    res.json(location);
  });

  /**
   * @openapi
   * /api/locations/{id}:
   *   delete:
   *     tags: [Locations]
   *     summary: Delete a saved location
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       204: { description: Location deleted }
   *       404: { description: Location not found }
   */
  router.delete('/:id', (req: Request, res: Response) => {
    locationRepository.delete(req.params['id']!);
    res.status(204).send();
  });

  /**
   * @openapi
   * /api/locations/{id}/weather:
   *   get:
   *     tags: [Locations]
   *     summary: Get current weather for a saved location
   *     parameters:
   *       - name: id
   *         in: path
   *         required: true
   *         schema: { type: string, format: uuid }
   *       - name: units
   *         in: query
   *         schema: { type: string, enum: [celsius, fahrenheit, kelvin], default: celsius }
   *     responses:
   *       200: { description: Current weather for the location }
   *       404: { description: Location not found }
   */
  router.get(
    '/:id/weather',
    asyncHandler(async (req: Request, res: Response) => {
      const location = locationRepository.get(req.params['id']!);
      const unitsParam = req.query['units'] as string | undefined;
      const units = unitsParam
        ? CurrentWeatherQuerySchema.shape.units.parse(unitsParam)
        : ('celsius' as const);
      const weather = await weatherService.getCurrentWeather(
        location.coordinates.lat,
        location.coordinates.lon,
        units,
        location.name,
      );
      res.json(weather);
    }),
  );

  return router;
}
