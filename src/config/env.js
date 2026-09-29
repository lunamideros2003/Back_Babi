import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rootDir = path.resolve(__dirname, '..', '..');

export const env = {
  port: Number(process.env.PORT ?? 4001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseFile:
    process.env.DATABASE_FILE ?? path.join(rootDir, 'data', 'babytrack.sqlite'),
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
