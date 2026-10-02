type Hits = number[];

const buckets = new Map<string, Hits>();
const MAX_KEYS = 10_000;
const HOUR = 60 * 60 * 1000;

export type Limit = { limit: number; windowMs: number };

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? HOUR);

export const LIMITS = {
  session: { limit: Number(process.env.RATE_LIMIT_SESSIONS ?? 3), windowMs },
  turn: { limit: Number(process.env.RATE_LIMIT_TURNS ?? 40), windowMs },
  report: { limit: Number(process.env.RATE_LIMIT_REPORTS ?? 5), windowMs },
} satisfies Record<string, Limit>;

// x-real-ip is set by the platform proxy. The leftmost x-forwarded-for entry is
// whatever the client sent, so only the last hop is trusted.
export function clientIp(req: Request) {
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return 'unknown';
}

export function check(req: Request, name: keyof typeof LIMITS) {
  const { limit, windowMs } = LIMITS[name];
  const key = `${name}:${clientIp(req)}`;
  const now = Date.now();

  if (buckets.size > MAX_KEYS) buckets.clear();

  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    const retryAfter = Math.ceil((hits[0] + windowMs - now) / 1000);
    buckets.set(key, hits);
    return { ok: false as const, retryAfter };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { ok: true as const, remaining: limit - hits.length };
}

export function tooMany(retryAfter: number, what: string) {
  const minutes = Math.ceil(retryAfter / 60);
  return Response.json(
    {
      error: `Rate limit reached. This demo runs on my own API credits and allows ${what} per hour. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    },
    { status: 429, headers: { 'retry-after': String(retryAfter) } },
  );
}
