import bcrypt from "bcryptjs";
import { clearPending, createPending, createSession, fail, json, toPublic } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";
import { captchaConfig, verifyCaptcha } from "@/lib/captcha";
import { allow, bumpFail, clearFails, clientIp, failCount } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = normalizeEmail(String(b?.email ?? ""));
  const password = String(b?.password ?? "");

  if (!allow(`login:${clientIp(req)}:${email}`, 8, 15 * 60_000))
    return fail("Too many attempts. Try again in a few minutes.", 429);

  // After 3 wrong passwords from this address for this account, a security check is required (honest users rarely meet it).
  const failKey = `login-fail:${clientIp(req)}:${email}`;
  const captchaOn = captchaConfig().provider !== "off";
  if (captchaOn && failCount(failKey) >= 3) {
    const human = await verifyCaptcha(req, b?.captcha);
    if (!human.ok) return json({ error: human.message, captchaRequired: true }, 400);
  }

  const user = email ? await (await getDb()).users.findOne({ email }) : null;
  // Always run a bcrypt compare so timing doesn't reveal whether the account exists.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali");
  if (user && !user.passwordHash)
    return fail("This account signs in with Google. Use \u201cContinue with Google\u201d, or reset your password to add one.", 401);
  if (!user || !ok) {
    const n = bumpFail(failKey);
    return json({ error: "Incorrect email or password", captchaRequired: captchaOn && n >= 3 }, 401);
  }
  clearFails(failKey);

  const remember = b?.remember !== false;
  if (user.totpEnabled) {
    await createPending(user.id, remember);
    return json({ twoFactor: true });
  }
  await clearPending();
  await createSession(user.id, remember);
  return json({ user: toPublic(user) });
}
