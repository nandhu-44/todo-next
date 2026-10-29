import { clearPending, createSession, fail, json, readPending, toPublic } from "@/lib/auth";
import { sha256 } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { allow, clearLimit } from "@/lib/rateLimit";
import { checkCode, normalizeRecovery, userSecret } from "@/lib/totp";

/** Second step of sign-in: authenticator code or a one-time recovery code. */
export async function POST(req: Request) {
  const pending = await readPending();
  if (!pending) return fail("Your sign-in expired. Please start again.", 401);

  const limitKey = `2fa:${pending.userId}`;
  if (!allow(limitKey, 6, 10 * 60_000)) return fail("Too many attempts. Try again in a few minutes.", 429);

  const b = await req.json().catch(() => null);
  const db = await getDb();
  const user = await db.users.findOne({ id: pending.userId });
  const secret = user && userSecret(user);
  if (!user || !user.totpEnabled || !secret) return fail("Two-factor is not enabled", 400);

  let ok = false;
  if (typeof b?.recovery === "string") {
    const hash = sha256(normalizeRecovery(b.recovery));
    const left = user.recoveryCodes ?? [];
    if (left.includes(hash)) {
      await db.users.update(user.id, { recoveryCodes: left.filter((h) => h !== hash) });
      ok = true;
    }
  } else {
    const step = checkCode(secret, String(b?.code ?? "").replace(/\s/g, ""), user.totpLastStep ?? 0);
    if (step !== null) {
      await db.users.update(user.id, { totpLastStep: step });
      ok = true;
    }
  }
  if (!ok) return fail(typeof b?.recovery === "string" ? "That recovery code isn't valid" : "That code didn't work. If you just used it, wait for the next one.", 401);

  clearLimit(limitKey);
  await clearPending();
  await createSession(user.id, pending.remember);
  return json({ user: toPublic((await db.users.findOne({ id: user.id }))!) });
}
