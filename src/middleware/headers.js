import { randomUUID } from 'node:crypto';

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

  res.end = function patchedEnd(chunk, encoding, callback) {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    if (!res.headersSent) res.set('X-Response-Time', `${ms.toFixed(1)}ms`);
    return originalEnd(chunk, encoding, callback);
  };

  next();
}

export function noCache(req, res, next) {

  if (NO_CACHE_PATHS.includes(req.path)) {
    res.set('Cache-Control', 'no-cache');
  } else {
    res.set('Cache-Control', 'no-store');
  }
  next();
}
