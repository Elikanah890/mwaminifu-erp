import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { generalLimiter } from './middlewares/rateLimit.middleware';
import { maintenanceMiddleware } from './middlewares/maintenance.middleware';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware';
import authRoutes from './routes/auth.routes';
import apiRoutes from './routes/index';
import logger from './utils/logger.util';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// Trust the first proxy hop in production so rate limiting and request IP
// logging work correctly behind Render/Vercel/nginx. Disabled locally (0) to
// avoid trusting client-supplied X-Forwarded-For headers.
if (env.TRUST_PROXY > 0) {
  app.set('trust proxy', env.TRUST_PROXY);
}

app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Defense-in-depth: never serialize credential hashes into an API response.
// Individual endpoints should still use explicit `select`s, but this guarantees
// a stray `include`/spread can never leak `passwordHash`, `pinHash` or
// `tempPinHash` to clients.
const SENSITIVE_RESPONSE_KEYS = new Set(['passwordHash', 'pinHash', 'tempPinHash']);

function stripSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSensitive);
  if (value && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    // Only walk plain objects; leave Date/Buffer/class instances untouched so
    // JSON serialization still works correctly.
    if (proto !== Object.prototype && proto !== null) return value;
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
      if (SENSITIVE_RESPONSE_KEYS.has(key)) continue;
      out[key] = stripSensitive(source[key]);
    }
    return out;
  }
  return value;
}

app.use((_req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => originalJson(stripSensitive(body))) as typeof res.json;
  next();
});

const configuredCorsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
const isAllowedCorsOrigin = (origin?: string) => {
  if (!origin) return true;
  if (configuredCorsOrigins.includes(origin)) return true;

  // Flutter Web uses a random localhost port during `flutter run -d chrome`.
  // Keep this convenience limited to non-production environments.
  if (env.NODE_ENV !== 'production') {
    try {
      const url = new URL(origin);
      return (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
          (url.protocol === 'http:' || url.protocol === 'https:');
    } catch {
      return false;
    }
  }

  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedCorsOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS origin not allowed: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  })
);

app.use((req, _res, next) => {
  req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: _res.statusCode,
      duration: `${duration}ms`,
      requestId: req.requestId,
    });
  });
  next();
});

app.use(generalLimiter);
app.use(maintenanceMiddleware);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (no /api/v1 prefix for auth)
app.use('/api/v1/auth', authRoutes);

// Protected API routes
app.use('/api/v1', apiRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
