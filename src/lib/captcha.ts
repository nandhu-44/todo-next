import { DuplicateError, getDb } from "./db";
import { checkPow } from "./pow";
import { clientIp } from "./rateLimit";

/**
 * Bot protection for sign-up, password reset and repeated failed sign-ins.
 *
 *  turnstile  Cloudflare Turnstile (privacy-friendly, behavioural). Used when TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY are set.
 *  pow        Built-in proof of work: the browser must burn a little CPU (~0.3 s) per attempt. No third party, no keys, no puzzles.
 *             It makes bulk abuse expensive; it can't tell a human from a patient, well-funded bot like a behavioural check can.
 *  off        CAPTCHA_PROVIDER=off, for tests and trusted deployments.
 */
export interface CaptchaConfig { provider: "off" | "pow" | "turnstile"; siteKey?: string }

export function captchaConfig(): CaptchaConfig {
  const want = (process.env.CAPTCHA_PROVIDER ?? "").toLowerCase();
  if (want === "off") return { provider: "off" };
  const siteKey = process.env.TURNSTILE_SITE_KEY;
  const haveTurnstile = !!(siteKey && process.env.TURNSTILE_SECRET_KEY);
  if (want === "turnstile" || (!want && haveTurnstile)) {
    if (haveTurnstile) return { provider: "turnstile", siteKey };
    console.warn("[captcha] CAPTCHA_PROVIDER=turnstile but TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY are missing; using the built-in check instead");
  }
  return { provider: "pow" };
}

/** Each solution works once. Returns false if it was already used. */
export async function markSpent(id: string, expires: number): Promise<boolean> {
  const db = await getDb();
  try {
    await db.captchaUsed.insert({ id, expiresAt: expires });
  } catch (e) {
    if (e instanceof DuplicateError) return false;
    throw e;
  }
  if (Math.random() < 0.05) {
    // now and then, forget solutions that have expired anyway
    const old = (await db.captchaUsed.find({})).filter((d) => d.expiresAt < Date.now()).slice(0, 200);
    await Promise.all(old.map((d) => db.captchaUsed.remove({ id: d.id })));
  }
  return true;
}

/* ------------------------------ verification entry point ------------------------------ */
export type CaptchaResult = { ok: true } | { ok: false; message: string };
const PLEASE = "Please complete the security check and try again.";

export async function verifyCaptcha(req: Request, token: unknown): Promise<CaptchaResult> {
  const cfg = captchaConfig();
  if (cfg.provider === "off") return { ok: true };
  if (typeof token !== "string" || !token || token.length > 4096) return { ok: false, message: PLEASE };

  if (cfg.provider === "turnstile") {
    try {
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token, remoteip: clientIp(req) }),
        signal: AbortSignal.timeout(5000),
      });
      const data = (await res.json()) as { success?: boolean };
      return data.success ? { ok: true } : { ok: false, message: PLEASE };
    } catch (e) {
      console.error("[captcha] Turnstile verification failed:", (e as Error).message);
      return { ok: false, message: "The security check is unavailable right now. Please try again in a moment." }; // fail closed
    }
  }

  const r = checkPow(token);
  if (!r.ok) return { ok: false, message: r.reason === "expired" ? "The security check expired. Please try again." : PLEASE };
  if (!(await markSpent(r.id, r.expires))) return { ok: false, message: PLEASE }; // already used once
  return { ok: true };
}
