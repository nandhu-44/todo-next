const hits = new Map<string, { n: number; reset: number }>();

/** Fixed-window in-memory limiter. Returns true if the call is allowed. (Per instance; use Redis for multi-instance deployments.) */
export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const e = hits.get(key);
  if (!e || e.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return true;
  }
  return ++e.n <= max;
}

export interface Hit { allowed: boolean; limit: number; remaining: number; resetAt: number }

/** Like allow(), but also reports how many calls are left and when the window resets (for X-RateLimit-* headers). */
export function hit(key: string, max: number, windowMs: number): Hit {
  const now = Date.now();
  let e = hits.get(key);
  if (!e || e.reset < now) {
    e = { n: 0, reset: now + windowMs };
    hits.set(key, e);
  }
  e.n++;
  return { allowed: e.n <= max, limit: max, remaining: Math.max(0, max - e.n), resetAt: e.reset };
}

export const clearLimit = (key: string) => void hits.delete(key);

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

/* Failed-attempt counters, used to ask for a CAPTCHA only after a few wrong passwords (per instance, best effort). */
const fails = new Map<string, { n: number; reset: number }>();
export const failCount = (key: string) => { const e = fails.get(key); return e && e.reset > Date.now() ? e.n : 0; };
export function bumpFail(key: string, windowMs = 15 * 60_000) {
  const now = Date.now();
  const e = fails.get(key);
  const next = e && e.reset > now ? { n: e.n + 1, reset: e.reset } : { n: 1, reset: now + windowMs };
  fails.set(key, next);
  if (fails.size > 5000) for (const [k, v] of fails) if (v.reset < now) fails.delete(k);
  return next.n;
}
export const clearFails = (key: string) => void fails.delete(key);
