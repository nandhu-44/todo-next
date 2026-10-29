import bcrypt from "bcryptjs";
import { fail, json, requireUser, toPublic } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { allow } from "@/lib/rateLimit";
import { checkCode, userSecret } from "@/lib/totp";

export async function POST(req: Request) {
  const a = await requireUser();
  if ("res" in a) return a.res;
  if (!allow(`2fa-disable:${a.user.id}`, 6, 10 * 60_000)) return fail("Too many attempts", 429);
  const secret = userSecret(a.user);
  if (!a.user.totpEnabled || !secret) return fail("Two-factor is not enabled", 400);

  const b = await req.json().catch(() => null);
  if (a.user.passwordHash && !(await bcrypt.compare(String(b?.password ?? ""), a.user.passwordHash)))
    return fail("Incorrect password", 403);
  if (checkCode(secret, String(b?.code ?? "").replace(/\s/g, ""), a.user.totpLastStep ?? 0) === null)
    return fail("That code isn't right", 400);

  const patch = { totpEnabled: false, totpSecret: null, totpPending: null, recoveryCodes: [] as string[] };
  await (await getDb()).users.update(a.user.id, patch);
  return json({ user: toPublic({ ...a.user, ...patch }) });
}
