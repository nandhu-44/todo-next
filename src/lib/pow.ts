import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";

// Proof-of-work CAPTCHA, pure functions (no database), so they can be unit-tested on their own.
export const POW_MAX_NUMBER = 60_000; // a solver tries ~30 000 hashes on average
export const POW_TTL_MS = 5 * 60_000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const hmac = (secret: Buffer, s: string) => createHmac("sha256", secret).update(s).digest("hex");
const safeEqual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const powSecret = () => createHash("sha256").update(`captcha:${process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me"}`).digest();

export interface PowChallenge { algorithm: "SHA-256"; challenge: string; salt: string; signature: string; maxnumber: number }

/** The server picks a secret number n and publishes sha256(salt + n); the client has to find n by trying them all. */
export function createPow(now = Date.now(), secret = powSecret(), maxnumber = POW_MAX_NUMBER): PowChallenge {
  const salt = `${randomBytes(12).toString("hex")}?expires=${now + POW_TTL_MS}`;
  const challenge = sha256(salt + randomInt(0, maxnumber + 1));
  return { algorithm: "SHA-256", challenge, salt, signature: hmac(secret, challenge), maxnumber };
}

export type PowCheck = { ok: true; id: string; expires: number } | { ok: false; reason: "malformed" | "expired" | "invalid" };

/** Checks a solved challenge (base64 JSON). Does NOT mark it spent; see markSpent(). */
export function checkPow(payload: unknown, now = Date.now(), secret = powSecret()): PowCheck {
  let p: Record<string, unknown>;
  try {
    p = JSON.parse(Buffer.from(String(payload), "base64").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const { algorithm, challenge, salt, signature, number } = p;
  if (algorithm !== "SHA-256" || typeof challenge !== "string" || typeof salt !== "string" || typeof signature !== "string" || !Number.isInteger(number))
    return { ok: false, reason: "malformed" };
  const expires = Number(/\?expires=(\d+)$/.exec(salt)?.[1]);
  if (!expires) return { ok: false, reason: "malformed" };
  if (expires < now) return { ok: false, reason: "expired" };
  // the signature proves the server issued this challenge; the hash proves the client actually did the work
  if (!safeEqual(hmac(secret, challenge), signature)) return { ok: false, reason: "invalid" };
  if (!safeEqual(sha256(salt + number), challenge)) return { ok: false, reason: "invalid" };
  return { ok: true, id: sha256(challenge), expires };
}

