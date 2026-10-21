import { randomUUID } from 'node:crypto';

/*
  Cabeceras comunes de la API.

  - X-Request-Id: permite seguir una peticion concreta en los registros y en
    el navegador cuando algo falla.
  - X-Response-Time: cuanto tardo el servidor en responder.
  - Cache-Control: los datos del usuario no se guardan en ningun sitio.
*/

const NO_CACHE_PATHS = ['/api/health', '/api/version', '/api/ports'];

export function requestId(req, res, next) {
  const id = req.get('X-Request-Id') || randomUUID();
  req.id = id;
  res.set('X-Request-Id', id);
  next();
}

export function responseTime(req, res, next) {
  const started = process.hrtime.bigint();
  const originalEnd = res.end.bind(res);

  // La cabecera tiene que ponerse antes de que se envien los headers, por
  // eso se anade justo antes de cerrar la respuesta.
  res.end = function patchedEnd(chunk, encoding, callback) {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    if (!res.headersSent) res.set('X-Response-Time', `${ms.toFixed(1)}ms`);
    return originalEnd(chunk, encoding, callback);
  };

  next();
}

export function noCache(req, res, next) {
  // Las rutas de diagnostico se pueden cachear: no llevan datos de nadie.
  if (NO_CACHE_PATHS.includes(req.path)) {
    res.set('Cache-Control', 'no-cache');
  } else {
    res.set('Cache-Control', 'no-store');
  }
  next();
}
