import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { AppError } from './utils/appError';

export const createApp = (): Application => {
  const app: Application = express();

  // 1. Trust proxy for rate limiting behind reverse proxies (Nginx, load balancers)
  app.set('trust proxy', 1);

  // 2. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows cross-origin API usage for SPAs
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // 3. CORS Configuration
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:')
        ) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 4. Request Logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // 5. Body Parsing Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // 6. Global API Rate Limiter
  app.use(env.API_PREFIX, apiLimiter);

  // 7. Mount Versioned API Routes (/api/v1)
  app.use(env.API_PREFIX, routes);

  // 8. 404 Handler
  app.use('*', (req: Request, _res: Response, next) => {
    next(AppError.notFound(`Cannot ${req.method} ${req.originalUrl} - Route not found on this server`));
  });

  // 9. Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
