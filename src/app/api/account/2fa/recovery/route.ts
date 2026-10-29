import { fail, json, requireUser, toPublic } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { allow } from "@/lib/rateLimit";
import { checkCode, newRecoveryCodes, userSecret } from "@/lib/totp";

/** Replace all recovery codes with a fresh set (needs a current authenticator code). */
export async function POST(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  if (!allow(`2fa-recovery:${a.user.id}`, 6, 10 * 60_000)) return fail("Too many attempts", 429);
  const secret = userSecret(a.user);
  if (!a.user.totpEnabled || !secret) return fail("Two-factor is not enabled", 400);

  const code = String((await req.json().catch(() => null))?.code ?? "").replace(/\s/g, "");
  const step = checkCode(secret, code, a.user.totpLastStep ?? 0);
  if (step === null) return fail("That code isn't right", 400);

  const { plain, hashed } = newRecoveryCodes();
  await (await getDb()).users.update(a.user.id, { recoveryCodes: hashed, totpLastStep: step });
  return json({ user: toPublic({ ...a.user, recoveryCodes: hashed }), recoveryCodes: plain });
}
