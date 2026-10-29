import { fail, json, requireUser, toPublic } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/crypto";
import { getDb } from "@/lib/db";
import { allow } from "@/lib/rateLimit";
import { checkCode, newRecoveryCodes } from "@/lib/totp";

/** Step 2: confirm the user's app produces valid codes, then turn 2FA on and issue recovery codes. */
export async function POST(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  if (!allow(`2fa-enable:${a.user.id}`, 8, 10 * 60_000)) return fail("Too many attempts", 429);
  if (!a.user.totpPending) return fail("Start setup first", 400);

  const secret = decrypt(a.user.totpPending);
  const code = String((await req.json().catch(() => null))?.code ?? "").replace(/\s/g, "");
  const step = checkCode(secret, code);
  if (step === null) return fail("That code isn't right. Check your authenticator and try again.", 400);

  const { plain, hashed } = newRecoveryCodes();
  const patch = {
    totpSecret: encrypt(secret),
    totpEnabled: true,
    totpPending: null,
    totpLastStep: step,
    recoveryCodes: hashed,
  };
  await (await getDb()).users.update(a.user.id, patch);
  return json({ user: toPublic({ ...a.user, ...patch }), recoveryCodes: plain });
}
