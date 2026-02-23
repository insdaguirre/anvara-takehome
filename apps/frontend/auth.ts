import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret) {
  throw new Error(
    'BETTER_AUTH_SECRET environment variable is required. Generate one with: openssl rand -hex 32'
  );
}

const baseURL = process.env.BETTER_AUTH_URL;
if (!baseURL && process.env.NODE_ENV === 'production') {
  throw new Error('BETTER_AUTH_URL environment variable is required in production');
}

export const auth = betterAuth({
  database: new Pool({ connectionString }),
  secret,
  baseURL: baseURL || 'http://localhost:3847',
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  plugins: [],
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
