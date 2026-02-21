import express, { type Application } from 'express';
import cors, { type CorsOptions } from 'cors';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';

const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:3847';

function parsePositiveIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

function normalizeOrigin(value: string, source: string): string {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${source} must contain valid absolute URL origins`);
  }
}

function getAllowedOrigins(): string[] {
  const configured = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => normalizeOrigin(origin, 'CORS_ALLOWED_ORIGINS'));

  if (configured.length > 0) {
    return Array.from(new Set(configured));
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CORS_ALLOWED_ORIGINS is required in production. Provide a comma-separated allowlist of origins.'
    );
  }

  const fallbackOrigins = new Set<string>([DEFAULT_FRONTEND_ORIGIN]);
  const betterAuthUrl = process.env.BETTER_AUTH_URL;
  if (betterAuthUrl) {
    fallbackOrigins.add(normalizeOrigin(betterAuthUrl, 'BETTER_AUTH_URL'));
  }

  return [...fallbackOrigins];
}

const app: Application = express();
const PORT = process.env.BACKEND_PORT || 4291;
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = getAllowedOrigins();
const rateLimitWindowMs = parsePositiveIntegerEnv('RATE_LIMIT_WINDOW_MS', 900_000);
const rateLimitMaxRequests = parsePositiveIntegerEnv('RATE_LIMIT_MAX_REQUESTS', 120);

if (isProduction) {
  app.set('trust proxy', 1);
}

// Middleware
const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    // Allow server-to-server/curl requests with no Origin header.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
};

const apiRateLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  limit: rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  message: { error: 'Too many requests. Please try again later.' },
});

app.use(cors(corsOptions));
app.use(
  '/api',
  apiRateLimiter
);
app.use(express.json({ limit: '20mb' }));

// Mount all API routes
app.use('/api', routes);

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running at http://localhost:${PORT}\n`);
  console.log('Available API endpoints:');
  console.log('  Auth:');
  console.log('    POST   /api/auth/login');
  console.log('  Sponsors:');
  console.log('    GET    /api/sponsors');
  console.log('    GET    /api/sponsors/:id');
  console.log('    POST   /api/sponsors');
  console.log('    PUT    /api/sponsors/:id');
  console.log('  Publishers:');
  console.log('    GET    /api/publishers');
  console.log('    GET    /api/publishers/:id');
  console.log('  Campaigns:');
  console.log('    GET    /api/campaigns');
  console.log('    GET    /api/campaigns/:id');
  console.log('    POST   /api/campaigns');
  console.log('  Ad Slots:');
  console.log('    GET    /api/ad-slots');
  console.log('    GET    /api/ad-slots/:id');
  console.log('    POST   /api/ad-slots');
  console.log('  Placements:');
  console.log('    GET    /api/placements');
  console.log('    POST   /api/placements');
  console.log('  Dashboard:');
  console.log('    GET    /api/dashboard/stats');
  console.log('  Health:');
  console.log('    GET    /api/health');
  console.log('');
});

export default app;
