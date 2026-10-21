import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rootDir = path.resolve(__dirname, '..', '..');

/**
 * Supabase hands out connection strings that carry `?sslmode=require`. The
 * postgres driver reads that parameter and replaces the ssl option we set,
 * which breaks the TLS handshake against the pooler. The same string also
 * arrives with stray spaces when it is pasted into a dashboard.
 *
 * Normalising here keeps the rest of the code free of special cases.
 */
export function normalizeDatabaseUrl(value) {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed.includes('?')) return trimmed;

  const [base, query] = trimmed.split('?');
  const kept = query
    .split('&')
    .map((pair) => pair.trim())
    .filter((pair) => pair && !pair.toLowerCase().startsWith('sslmode='));

  return kept.length > 0 ? `${base}?${kept.join('&')}` : base;
}

export const env = {
  port: Number(process.env.PORT ?? 4001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseFile:
    process.env.DATABASE_FILE ?? path.join(rootDir, 'data', 'babytrack.sqlite'),
  // When present, the app talks to Postgres (Supabase) instead of the local file.
  databaseUrl: normalizeDatabaseUrl(process.env.DATABASE_URL ?? ''),
  jwtSecret: process.env.JWT_SECRET ?? 'babytrack-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5180')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  ai: {
    provider: process.env.AI_PROVIDER ?? 'auto', // auto | openai | local
    apiKey: process.env.OPENAI_API_KEY ?? '',
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    maxTokens: Number(process.env.OPENAI_MAX_TOKENS ?? 500),
    temperature: Number(process.env.OPENAI_TEMPERATURE ?? 0.4),
  },
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'babytrack-dev-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}

export default env;
