import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
  Datos de la compilacion: version del proyecto, commit con el que se
  desplego y momento en el que arranco el proceso.

  El commit lo publica el servidor de despliegue. Si no esta disponible se
  deja vacio, que es lo normal en desarrollo.
*/

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');

function readVersion() {
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'),
    );
    return packageJson.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const APP_VERSION = readVersion();

export const BUILD_COMMIT = (
  process.env.RENDER_GIT_COMMIT ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GIT_COMMIT ??
  ''
).slice(0, 7);

export const STARTED_AT = Date.now();
