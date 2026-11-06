import { createHash, randomBytes, randomUUID } from "crypto";
import { getDb, type ApiKeyDoc } from "./db";
import { limits } from "./limits";
import { allow, clientIp, hit } from "./rateLimit";

export const SCOPES = ["todos:read", "todos:write"] as const;
export type Scope = (typeof SCOPES)[number];

const KEY_FORMAT = /^tdn_[A-Za-z0-9_-]{32}$/;
export const hashKey = (secret: string) => createHash("sha256").update(secret).digest("hex");

/** A new random key (192 bits). Only its hash is stored, so it can be shown to the user exactly once. */
export function generateKey() {
  const secret = `tdn_${randomBytes(24).toString("base64url")}`;
  return { secret, prefix: secret.slice(0, 12), hash: hashKey(secret) };
}

export const newKeyId = () => randomUUID();
export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);
const nextUtcMidnight = () => { const d = new Date(); d.setUTCHours(24, 0, 0, 0); return d.getTime(); };

/** What the public API shows about a key: never the hash. */
export const publicKey = (k: ApiKeyDoc) => ({
  id: k.id, name: k.name, prefix: k.prefix, scopes: k.scopes, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt, expiresAt: k.expiresAt, dailyLimit: k.dailyLimit,
});

/* ----------------------------- request handling ----------------------------- */

const CORS = {
  "Access-Control-Allow-Origin": "*", // safe: the API uses bearer keys, never cookies
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-API-Key",
  "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Quota-Limit, X-Quota-Remaining, X-Quota-Reset, Retry-After",
};

export function apiResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { ...(body === null ? {} : { "Content-Type": "application/json" }), "Cache-Control": "no-store", ...CORS, ...headers },
  });
}
export const apiError = (code: string, message: string, status: number, headers: Record<string, string> = {}) =>
  apiResponse({ error: { code, message } }, status, headers);

export const preflight = () => new Response(null, { status: 204, headers: CORS });

export interface ApiContext {
  req: Request;
  userId: string;
  key: ApiKeyDoc;
  params: Record<string, string>;
}

/**
 * Wraps a /api/v1 handler with: key lookup (hashed), expiry and scope checks, a per-minute rate limit, a daily quota
 * stored in the database, rate-limit headers on every response, and consistent JSON errors.
 *   scope = null  -> any valid key may call it
 */
export function v1(scope: Scope | null, handler: (ctx: ApiContext) => Promise<Response>) {
  return async (req: Request, route?: { params?: Promise<Record<string, string>> }): Promise<Response> => {
    try {
      // --- 1. which key? ---
      const auth = req.headers.get("authorization");
      const token = auth?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? req.headers.get("x-api-key") ?? "";
      if (!token) return apiError("unauthorized", "Missing API key. Send it as `Authorization: Bearer <key>`.", 401, { "WWW-Authenticate": "Bearer" });
      // limit guessing: a source that keeps sending bad keys gets slowed down before any database work happens
      const badKey = () => !allow(`badkey:${clientIp(req)}`, 20, 60_000);
      if (!KEY_FORMAT.test(token)) return badKey() ? apiError("rate_limited", "Too many invalid keys.", 429, { "Retry-After": "60" }) : apiError("invalid_key", "That is not a valid API key.", 401);

      const db = await getDb();
      const key = await db.apiKeys.findOne({ hash: hashKey(token) });
      if (!key) return badKey() ? apiError("rate_limited", "Too many invalid keys.", 429, { "Retry-After": "60" }) : apiError("invalid_key", "That is not a valid API key.", 401);
      if (key.expiresAt && Date.parse(key.expiresAt) < Date.now()) return apiError("key_expired", "This API key has expired.", 401);
      if (scope && !key.scopes.includes(scope)) return apiError("insufficient_scope", `This key does not have the \`${scope}\` scope.`, 403);

      // --- 2. limits ---
      const lim = limits();
      const rl = hit(`api:${key.id}`, lim.perMinute, 60_000);
      const minuteHeaders = { "X-RateLimit-Limit": String(rl.limit), "X-RateLimit-Remaining": String(rl.remaining), "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)) };
      if (!rl.allowed) {
        return apiError("rate_limited", `Rate limit of ${rl.limit} requests per minute exceeded.`, 429, { ...minuteHeaders, "Retry-After": String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))) });
      }

      const dayLimit = Math.min(key.dailyLimit ?? lim.perDay, lim.perDay);
      const day = utcDay();
      const used = await db.apiUsage.increment(`${key.id}:${day}`, { id: `${key.id}:${day}`, keyId: key.id, userId: key.userId, day, count: 0 }, "count");
      const resetAt = nextUtcMidnight();
      const quotaHeaders = { "X-Quota-Limit": String(dayLimit), "X-Quota-Remaining": String(Math.max(0, dayLimit - used)), "X-Quota-Reset": String(Math.ceil(resetAt / 1000)) };
      if (used > dayLimit) {
        return apiError("quota_exceeded", `Daily quota of ${dayLimit} requests exceeded. It resets at 00:00 UTC.`, 429, { ...minuteHeaders, ...quotaHeaders, "Retry-After": String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))) });
      }

      // lastUsedAt is only written now and then, so it does not add a database write to every request
      if (!key.lastUsedAt || Date.now() - Date.parse(key.lastUsedAt) > 5 * 60_000) void db.apiKeys.update(key.id, { lastUsedAt: new Date().toISOString() }).catch(() => {});

      // --- 3. the handler ---
      const res = await handler({ req, userId: key.userId, key, params: (await route?.params) ?? {} });
      for (const [k, v] of Object.entries({ ...minuteHeaders, ...quotaHeaders })) res.headers.set(k, v);
      return res;
    } catch (e) {
      console.error("[api/v1] unhandled error", e);
      return apiError("server_error", "Something went wrong on our side.", 500);
    }
  };
}
