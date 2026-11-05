const WINDOW_MS = 60_000;

const requests = new Map();

function purge(now) {
  for (const [key, entry] of requests) {
    if (now - entry.startedAt > WINDOW_MS) requests.delete(key);
  }
}

export function consume(key, limit) {
  const now = Date.now();
  purge(now);

  const entry = requests.get(key);

  if (!entry || now - entry.startedAt > WINDOW_MS) {
    requests.set(key, { startedAt: now, total: 1 });
    return true;
  }

  if (entry.total >= limit) return false;

  entry.total += 1;
  return true;
}

export function retryAfter(key) {
  const entry = requests.get(key);
  if (!entry) return 0;

  const elapsed = Date.now() - entry.startedAt;
  return Math.max(0, Math.ceil((WINDOW_MS - elapsed) / 1000));
}

export function forget(key) {
  requests.delete(key);
}

export function reset() {
  requests.clear();
}
