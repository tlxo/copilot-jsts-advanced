import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { ZodError } from 'zod';
import type { AppContainer } from './dependencies.js';
import { createWeatherRouter } from './routers/weather.js';
import { createLocationsRouter } from './routers/locations.js';
import {
  WeatherAppError,
  WeatherAPIError,
  WeatherAPINotFoundError,
  WeatherAPIConnectionError,
  LocationNotFoundError,
} from './services/exceptions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createApp(container: AppContainer): express.Express {
  const app = express();

  // ── Middleware ──────────────────────────────────────────────────────────────
  app.use(express.json());

  // ── Swagger / API Docs ─────────────────────────────────────────────────────
  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: container.settings.appName,
        version: '1.0.0',
        description: 'Weather application API — GitHub Copilot exercise environment',
      },
      servers: [{ url: '/' }],
    },
    apis: [join(__dirname, 'routers', '*.ts'), join(__dirname, 'routers', '*.js')],
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(swaggerSpec);
  });

  // ── API Routes ─────────────────────────────────────────────────────────────
  app.use('/api/weather', createWeatherRouter(container));
  app.use('/api/locations', createLocationsRouter(container));

  // ── Static Files & Dashboard ───────────────────────────────────────────────
  const publicDir = join(__dirname, '..', 'public');
  app.use('/static', express.static(publicDir));
  app.get('/', (_req: Request, res: Response) => {
    res.sendFile(join(publicDir, 'index.html'));
  });

  // ── Global Error Handler ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    // Zod validation errors → 422
    if (err instanceof ZodError) {
      res.status(422).json({
        error: 'Validation error',
        details: err.errors,
      });
      return;
    }

    // Domain exception mapping
    if (err instanceof LocationNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof WeatherAPINotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof WeatherAPIConnectionError) {
      res.status(503).json({ error: err.message });
      return;
    }
    if (err instanceof WeatherAPIError) {
      res.status(502).json({ error: err.message });
      return;
    }
    if (err instanceof WeatherAppError) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Unexpected errors
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
