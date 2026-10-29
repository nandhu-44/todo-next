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

export const clearLimit = (key: string) => void hits.delete(key);

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
