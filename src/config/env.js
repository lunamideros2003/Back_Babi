import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rootDir = path.resolve(__dirname, '..', '..');

/**
 * Encodes a piece of user info (user or password) so it is safe inside a URL.
 *
 * A password that already arrives percent-encoded is decoded first, so the
 * result is always the same and never double encoded.
 */
function encodeUserInfo(value) {
  if (!value) return '';

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // A stray % that is not an escape sequence: keep it as it is.
    decoded = value;
  }

  return encodeURIComponent(decoded);
}

/**
 * Repairs the connection string of Supabase.
 *
 * Three things go wrong when the string is pasted by hand into a dashboard:
 *
 *  - the quotes that come along with the copy, or a stray space
 *  - `?sslmode=require`, which the postgres driver turns into a certificate
 *    check that the pooler does not satisfy
 *  - a password that was never percent-encoded, so a `#` or a `?` inside it
 *    breaks the URL and the driver answers "Invalid URL"
 *
 * Normalising here keeps the rest of the code free of special cases and
 * spares the user from hand-editing a long URL.
 */
export function normalizeDatabaseUrl(value) {
  if (!value) return '';

  let text = String(value).trim();

  const first = text[0];
  const last = text[text.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    text = text.slice(1, -1).trim();
  }

  const schemeEnd = text.indexOf('://');
  if (schemeEnd === -1) return text;

  const scheme = text.slice(0, schemeEnd + 3);
  const rest = text.slice(schemeEnd + 3);

  // The user info ends at the last @, so an @ inside the password is safe.
  const atIndex = rest.lastIndexOf('@');
  const hostStart = atIndex === -1 ? 0 : atIndex + 1;

  // The query string starts at the first ? that comes after the host, so a ?
  // inside the password is not mistaken for the beginning of the query.
  const queryStart = rest.indexOf('?', hostStart);

  const credentials = atIndex === -1 ? '' : rest.slice(0, atIndex);
  const hostAndDatabase = queryStart === -1 ? rest.slice(hostStart) : rest.slice(hostStart, queryStart);
  const query = queryStart === -1 ? '' : rest.slice(queryStart + 1);

  const separator = credentials.indexOf(':');
  const user = separator === -1 ? credentials : credentials.slice(0, separator);
  const password = separator === -1 ? '' : credentials.slice(separator + 1);

  const rebuilt = credentials
    ? `${encodeUserInfo(user)}${password ? `:${encodeUserInfo(password)}` : ''}@`
    : '';

  const kept = query
    .split('&')
    .map((pair) => pair.trim())
    .filter((pair) => pair && !pair.toLowerCase().startsWith('sslmode='));

  return `${scheme}${rebuilt}${hostAndDatabase}${kept.length > 0 ? `?${kept.join('&')}` : ''}`;
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
